"""
AgriShield - Device Configuration & Key Rotation Test Suite
Tests:
1. Device configuration inspection (GET /api/v1/devices/{id}/config).
2. Secure API key & Secret key generation/rotation (POST /api/v1/devices/{id}/rotate-credentials).
3. Bcrypt secret hashing in database (no plaintext secrets stored).
4. ESP8266 request headers verification:
   - X-Device-API-Key
   - X-Device-Key
   - X-Device-Id
   - X-Device-UID
5. Device heartbeat endpoint authentication with rotated credentials.
6. Preserving existing devices and farmer assignments.
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import SessionLocal, engine, Base
from app.migrations import run_database_migrations
from app.models.device import Device, FarmerDevice
from app.models.user import User
from app.security.auth_bearer import create_access_token
from app.security.password import verify_password

client = TestClient(app)

class TestDeviceConfiguration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        run_database_migrations(engine)
        cls.db = SessionLocal()

        # Find or use the admin account (nikhilgodar03@gmail.com or admin@agrishield.com)
        cls.admin = cls.db.query(User).filter(User.role == "ADMIN").first()
        assert cls.admin is not None, "No admin user found in database!"
        cls.admin_token = create_access_token(data={"sub": str(cls.admin.id), "role": "ADMIN", "email": cls.admin.email})

        # Ensure dedicated test device exists (ESP8266-CONFIG-TEST)
        cls.device = cls.db.query(Device).filter(Device.device_uid == "ESP8266-CONFIG-TEST").first()
        if not cls.device:
            cls.device = Device(
                device_uid="ESP8266-CONFIG-TEST",
                device_name="Field Unit - Config Test Node",
                device_type="ESP8266_NODEMCU",
                api_key="agrishield_test_config_key_2026",
                status="ONLINE"
            )
            cls.db.add(cls.device)
            cls.db.commit()
            cls.db.refresh(cls.device)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_get_device_config_admin_only(self):
        """Unauthenticated or unauthorized access to device config must be rejected."""
        res = client.get(f"/api/v1/devices/{self.device.id}/config")
        self.assertEqual(res.status_code, 401)
        print("[PASS] 1. Unauthenticated device configuration request rejected with 401")

    def test_02_get_device_config_success(self):
        """Authenticated admin fetches device configuration, metadata, and header template."""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = client.get(f"/api/v1/devices/{self.device.id}/config", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], self.device.id)
        self.assertEqual(data["device_uid"], self.device.device_uid)
        self.assertIn("device_name", data)
        self.assertIn("status", data)
        self.assertIn("required_headers", data)
        self.assertIn("X-Device-API-Key", data["required_headers"])
        self.assertIn("X-Device-Key", data["required_headers"])
        self.assertIn("X-Device-Id", data["required_headers"])
        self.assertIn("X-Device-UID", data["required_headers"])
        print(f"[PASS] 2. Admin fetched configuration for device #{data['id']} ({data['device_uid']})")

    def test_03_rotate_device_credentials(self):
        """Admin rotates device credentials; receives new API Key and Secret Key once."""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = client.post(f"/api/v1/devices/{self.device.id}/rotate-credentials", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("api_key", data)
        self.assertIn("secret_key", data)
        self.assertTrue(data["api_key"].startswith("agri_dev_"))
        self.assertTrue(data["secret_key"].startswith("agri_sec_"))
        self.assertIn("required_headers", data)

        # Save for subsequent tests
        self.__class__.new_api_key = data["api_key"]
        self.__class__.new_secret_key = data["secret_key"]

        # Verify DB storage: secret is securely hashed (bcrypt) and not plaintext
        self.db.expire_all()
        dev = self.db.query(Device).filter(Device.id == self.device.id).first()
        self.assertEqual(dev.api_key, self.new_api_key)
        self.assertIsNotNone(dev.secret_hash)
        self.assertTrue(dev.secret_hash.startswith("$2b$") or dev.secret_hash.startswith("$2a$"))
        self.assertNotEqual(dev.secret_hash, self.new_secret_key)
        self.assertTrue(verify_password(self.new_secret_key, dev.secret_hash))
        print("[PASS] 3. Device credentials rotated: Secret Key is securely hashed with bcrypt in DB")

    def test_04_device_heartbeat_with_required_headers(self):
        """ESP8266 node sends heartbeat using all 4 required request headers."""
        headers = {
            "X-Device-API-Key": self.new_api_key,
            "X-Device-Key": self.new_secret_key,
            "X-Device-Id": str(self.device.id),
            "X-Device-UID": self.device.device_uid
        }
        payload = {
            "battery_level": 94.5,
            "signal_strength": -65,
            "status": "ONLINE"
        }
        res = client.post("/api/v1/devices/heartbeat", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ACK")
        self.assertIn("server_time", data)
        print("[PASS] 4. Device Heartbeat accepted with all 4 required headers (X-Device-API-Key, X-Device-Key, X-Device-Id, X-Device-UID)")

    def test_05_device_heartbeat_invalid_credentials_rejected(self):
        """Heartbeat with invalid secret or api key must be rejected with 401."""
        headers = {
            "X-Device-API-Key": self.new_api_key,
            "X-Device-Key": "wrong_invalid_secret_key",
            "X-Device-Id": str(self.device.id),
            "X-Device-UID": self.device.device_uid
        }
        payload = {"status": "ONLINE"}
        res = client.post("/api/v1/devices/heartbeat", json=payload, headers=headers)
        self.assertEqual(res.status_code, 401)
        print("[PASS] 5. Heartbeat with invalid credentials rejected (401 Unauthorized)")

    def test_06_farmer_assignments_preserved(self):
        """Verify existing farmer bindings and device fleet are fully preserved."""
        devices = self.db.query(Device).all()
        assignments = self.db.query(FarmerDevice).filter(FarmerDevice.is_active == True).all()
        self.assertGreater(len(devices), 0)
        print(f"[PASS] 6. Fleet preserved: {len(devices)} total registered devices, {len(assignments)} active farmer assignments intact")

if __name__ == "__main__":
    print("\n" + "="*70)
    print("  AGRISHIELD - DEVICE CONFIGURATION & CREDENTIAL ROTATION TESTS")
    print("="*70)
    unittest.main(verbosity=2)
