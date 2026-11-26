"""
AgriShield - MQ-135 Raw Analog Sensor (0-1023) Test Suite
Verifies:
1. Valid integer readings within 0-1023 (boundaries 0, 1023, and mid-range 412/512).
2. Null readings (mq135_raw: None).
3. Omitted readings (backward compatibility for existing payloads).
4. Invalid readings rejected with HTTP 422:
   - Below 0 (-1, -100)
   - Above 1023 (1024, 5000)
   - Non-integer with fractional part (512.5)
5. Physical ADC raw values are saved as integer in database and NOT treated as ppm.
6. Frontend retrieval endpoints (/telemetry/latest, /telemetry/history) return mq135_raw.
7. Database migration idempotency and preservation of existing records.
"""

import sys
import os
import secrets
import unittest
from datetime import datetime
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import SessionLocal, engine, Base
from app.migrations import run_database_migrations
from app.models.device import Device, FarmerDevice
from app.models.user import User
from app.models.telemetry import SensorReading
from app.security.password import hash_password
from app.security.auth_bearer import create_access_token

client = TestClient(app)

class TestMQ135RawTelemetry(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        run_database_migrations(engine)
        db = SessionLocal()
        try:
            # 1. Test device
            device = db.query(Device).filter(Device.device_uid == "ESP8266-AGRI-001").first()
            if not device:
                device = Device(
                    device_uid="ESP8266-AGRI-001",
                    device_name="Field Unit 1 - ESP8266 NodeMCU",
                    device_type="ESP8266_NODEMCU",
                    api_key="agrishield_demo_api_key_2026",
                    status="ONLINE"
                )
                db.add(device)
                db.commit()
                db.refresh(device)
            else:
                device.api_key = "agrishield_demo_api_key_2026"
                db.commit()
                db.refresh(device)

            cls.device_id = device.id
            cls.device_uid = device.device_uid

            # 2. Test farmer
            farmer = db.query(User).filter(User.email == "farmer.mq135.test@agrishield.com").first()
            if not farmer:
                farmer = User(
                    email="farmer.mq135.test@agrishield.com",
                    password_hash=hash_password("Farmer@123"),
                    full_name="Somanna Gowda",
                    role="FARMER",
                    phone_number="+919876543999",
                    firebase_uid=f"usr_{secrets.token_hex(12)}",
                    is_active=True
                )
                db.add(farmer)
                db.commit()
                db.refresh(farmer)

            cls.farmer_id = farmer.id
            cls.farmer_email = farmer.email

            # Assignment
            assignment = db.query(FarmerDevice).filter(
                FarmerDevice.farmer_id == farmer.id,
                FarmerDevice.device_id == device.id
            ).first()
            if not assignment:
                assignment = FarmerDevice(
                    farmer_id=farmer.id,
                    device_id=device.id,
                    is_active=True
                )
                db.add(assignment)
            else:
                assignment.is_active = True
            db.commit()

            # Farmer token
            cls.farmer_token = create_access_token(
                data={"sub": str(farmer.id), "email": farmer.email, "role": "FARMER"}
            )

            cls.device_headers = {
                "X-Device-API-Key": "agrishield_demo_api_key_2026",
                "X-Device-Id": str(cls.device_id),
                "X-Device-UID": cls.device_uid
            }
        finally:
            db.close()

    def test_01_valid_mq135_raw_mid_value(self):
        """Valid mid-range raw ADC reading (e.g. 412) accepted and stored."""
        payload = {
            "temperature_c": 28.5,
            "humidity_percent": 65.0,
            "sensor_status": "VALID",
            "mq135_raw": 412
        }
        response = client.post("/api/v1/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "RECORDED")
        self.assertEqual(data["mq135_raw"], 412)

        # Verify DB record
        db = SessionLocal()
        try:
            rec = db.query(SensorReading).filter(SensorReading.id == data["reading_id"]).first()
            self.assertIsNotNone(rec)
            self.assertEqual(rec.mq135_raw, 412)
            # Verify not treated as ppm
            self.assertIsNone(rec.mq135_ppm)
        finally:
            db.close()

    def test_02_valid_mq135_raw_boundary_zero(self):
        """Boundary check: 0 is minimum valid 10-bit ADC reading."""
        payload = {
            "temperature_c": 24.0,
            "humidity_percent": 50.0,
            "sensor_status": "VALID",
            "mq135_raw": 0
        }
        response = client.post("/api/v1/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["mq135_raw"], 0)

        db = SessionLocal()
        try:
            rec = db.query(SensorReading).filter(SensorReading.id == data["reading_id"]).first()
            self.assertEqual(rec.mq135_raw, 0)
        finally:
            db.close()

    def test_03_valid_mq135_raw_boundary_1023(self):
        """Boundary check: 1023 is maximum valid 10-bit ADC reading."""
        payload = {
            "temperature_c": 31.0,
            "humidity_percent": 80.0,
            "sensor_status": "VALID",
            "mq135_raw": 1023
        }
        response = client.post("/api/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["mq135_raw"], 1023)

        db = SessionLocal()
        try:
            rec = db.query(SensorReading).filter(SensorReading.id == data["reading_id"]).first()
            self.assertEqual(rec.mq135_raw, 1023)
        finally:
            db.close()

    def test_04_null_mq135_raw(self):
        """Null reading: mq135_raw = null must be accepted without error."""
        payload = {
            "temperature_c": 26.5,
            "humidity_percent": 58.0,
            "sensor_status": "VALID",
            "mq135_raw": None
        }
        response = client.post("/api/v1/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsNone(data["mq135_raw"])

        db = SessionLocal()
        try:
            rec = db.query(SensorReading).filter(SensorReading.id == data["reading_id"]).first()
            self.assertIsNone(rec.mq135_raw)
        finally:
            db.close()

    def test_05_omitted_mq135_raw_backward_compatibility(self):
        """Omitted field: existing telemetry payloads without mq135_raw continue working."""
        payload = {
            "temperature_c": 27.0,
            "humidity_percent": 60.0,
            "sensor_status": "VALID"
        }
        response = client.post("/api/v1/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "RECORDED")
        self.assertIsNone(data["mq135_raw"])

        db = SessionLocal()
        try:
            rec = db.query(SensorReading).filter(SensorReading.id == data["reading_id"]).first()
            self.assertIsNone(rec.mq135_raw)
        finally:
            db.close()

    def test_06_invalid_mq135_raw_negative(self):
        """Negative ADC values (< 0) are strictly rejected with HTTP 422."""
        payload = {
            "temperature_c": 25.0,
            "humidity_percent": 55.0,
            "mq135_raw": -1
        }
        response = client.post("/api/v1/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response.status_code, 422)

        # Also test -100
        payload["mq135_raw"] = -100
        response2 = client.post("/api/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response2.status_code, 422)

    def test_07_invalid_mq135_raw_above_max(self):
        """Values exceeding 10-bit ADC limit (> 1023) are rejected with HTTP 422."""
        payload = {
            "temperature_c": 25.0,
            "humidity_percent": 55.0,
            "mq135_raw": 1024
        }
        response = client.post("/api/v1/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response.status_code, 422)

        # Also test 5000
        payload["mq135_raw"] = 5000
        response2 = client.post("/api/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response2.status_code, 422)

    def test_08_invalid_mq135_raw_fractional_float(self):
        """Floats with fractional part (e.g. 512.5) are rejected with HTTP 422."""
        payload = {
            "temperature_c": 25.0,
            "humidity_percent": 55.0,
            "mq135_raw": 512.5
        }
        response = client.post("/api/v1/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response.status_code, 422)

    def test_09_raw_adc_not_treated_as_ppm(self):
        """Raw ADC readings must NOT be treated as or converted to ppm."""
        payload = {
            "temperature_c": 29.0,
            "humidity_percent": 62.0,
            "sensor_status": "VALID",
            "mq135_raw": 750,
            "mq135_ppm": 210.5
        }
        response = client.post("/api/v1/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        db = SessionLocal()
        try:
            rec = db.query(SensorReading).filter(SensorReading.id == data["reading_id"]).first()
            self.assertEqual(rec.mq135_raw, 750)
            self.assertEqual(rec.mq135_ppm, 210.5)
            # Raw value 750 did not overwrite ppm
            self.assertNotEqual(rec.mq135_ppm, 750)
        finally:
            db.close()

    def test_10_frontend_retrieval_endpoints(self):
        """Frontend can retrieve stored mq135_raw via latest and history endpoints."""
        # Send known raw reading
        payload = {
            "temperature_c": 30.0,
            "humidity_percent": 70.0,
            "sensor_status": "VALID",
            "mq135_raw": 625
        }
        post_res = client.post("/api/v1/telemetry", json=payload, headers=self.device_headers)
        self.assertEqual(post_res.status_code, 200)

        # 1. GET /api/v1/telemetry/latest
        auth_headers = {"Authorization": f"Bearer {self.farmer_token}"}
        latest_res = client.get("/api/v1/telemetry/latest", headers=auth_headers)
        self.assertEqual(latest_res.status_code, 200)
        latest_data = latest_res.json()
        self.assertIn("mq135_raw", latest_data)
        self.assertEqual(latest_data["mq135_raw"], 625)

        # 2. GET /api/telemetry/latest (prefix /api compatibility)
        latest_res_compat = client.get("/api/telemetry/latest", headers=auth_headers)
        self.assertEqual(latest_res_compat.status_code, 200)
        self.assertEqual(latest_res_compat.json()["mq135_raw"], 625)

        # 3. GET /api/v1/telemetry/history
        hist_res = client.get("/api/v1/telemetry/history?limit=10", headers=auth_headers)
        self.assertEqual(hist_res.status_code, 200)
        hist_data = hist_res.json()
        self.assertTrue(len(hist_data) > 0)
        matching = [item for item in hist_data if item.get("mq135_raw") == 625]
        self.assertTrue(len(matching) > 0, "Stored mq135_raw reading must appear in history endpoint")

    def test_11_database_migration_safety(self):
        """Ensure repeated migration runs do not fail or alter existing records."""
        db = SessionLocal()
        try:
            count_before = db.query(SensorReading).count()
            run_database_migrations(engine)
            count_after = db.query(SensorReading).count()
            self.assertEqual(count_before, count_after, "Migration must never delete or lose sensor records")
        finally:
            db.close()

if __name__ == "__main__":
    unittest.main()
