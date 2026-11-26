"""
AgriShield - Secure Admin Account Provisioning & Authorization Test Suite
Verifies all 7 user-specified test scenarios:
1. Admin account creation (using secure one-time setup token & master token).
2. Public unauthorized creation rejection (403 Forbidden).
3. Duplicate email rejection (400 Bad Request).
4. Invalid password handling (strength criteria & confirmation mismatch).
5. Admin login with newly created credentials.
6. JWT token generation & Swagger authorization verification.
7. ESP8266 device registration via POST /api/v1/devices using the new admin token.
"""

import sys
import os
import unittest
import secrets
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import SessionLocal, engine, Base
from app.migrations import run_database_migrations
from app.models.user import User, AdminSetupToken
from app.models.device import Device
from app.security.password import hash_token, verify_password
from app.config import settings

client = TestClient(app)

class TestAdminAccountSetup(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        run_database_migrations(engine)
        cls.db = SessionLocal()

        # Generate a unique test admin email for this test run
        cls.test_email = f"chief.safety.{secrets.token_hex(4)}@agrishield.com"
        cls.test_password = "SecureAdmin@2026!#"
        cls.test_full_name = "Dr. Vikram Sarabhai, Chief Safety Director"

        # Generate a database one-time setup token
        cls.raw_setup_token = f"agri_adm_test_{secrets.token_urlsafe(16)}"
        token_rec = AdminSetupToken(
            token_hash=hash_token(cls.raw_setup_token),
            expires_at=datetime.utcnow() + timedelta(hours=2),
            used=False
        )
        cls.db.add(token_rec)
        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_public_registration_without_token_rejected(self):
        """Scenario: Public visitor attempts to create admin account without token -> 403 Forbidden."""
        payload = {
            "full_name": "Unauthorized Attacker",
            "email": "hacker@domain.com",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "setup_token": None
        }
        res = client.post("/api/v1/auth/admin/setup", json=payload)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Forbidden", res.json()["detail"])
        print("[PASS] 1. Public admin registration without setup token strictly rejected (403 Forbidden)")

    def test_02_invalid_or_expired_token_rejected(self):
        """Scenario: Visitor supplies invalid/fake token -> 403 Forbidden."""
        payload = {
            "full_name": "Unauthorized User",
            "email": "unauthorized@domain.com",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "setup_token": "fake_invalid_token_99999"
        }
        res = client.post("/api/v1/auth/admin/setup", json=payload)
        self.assertEqual(res.status_code, 403)
        print("[PASS] 2. Invalid or unauthenticated setup token rejected (403 Forbidden)")

    def test_03_password_mismatch_rejected(self):
        """Scenario: Password and confirm password do not match."""
        payload = {
            "full_name": self.test_full_name,
            "email": "mismatch@agrishield.com",
            "password": "ValidPassword@123",
            "confirm_password": "DifferentPassword@123",
            "setup_token": self.raw_setup_token
        }
        res = client.post("/api/v1/auth/admin/setup", json=payload)
        self.assertEqual(res.status_code, 422)  # Pydantic validation error
        print("[PASS] 3. Password and confirm password mismatch rejected by schema validation (422)")

    def test_04_weak_password_rejected(self):
        """Scenario: Password lacks uppercase/numbers/symbols."""
        payload = {
            "full_name": self.test_full_name,
            "email": "weakpass@agrishield.com",
            "password": "weakpassword",
            "confirm_password": "weakpassword",
            "setup_token": self.raw_setup_token
        }
        res = client.post("/api/v1/auth/admin/setup", json=payload)
        self.assertEqual(res.status_code, 422)
        print("[PASS] 4. Weak password lacking uppercase/digits/symbols rejected (422)")

    def test_05_admin_account_creation_success(self):
        """Scenario 1: Admin account successfully provisioned with valid one-time token."""
        payload = {
            "full_name": self.test_full_name,
            "email": self.test_email,
            "password": self.test_password,
            "confirm_password": self.test_password,
            "setup_token": self.raw_setup_token
        }
        res = client.post("/api/v1/auth/admin/setup", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["email"], self.test_email)
        self.assertEqual(data["role"], "ADMIN")
        self.assertEqual(data["full_name"], self.test_full_name)
        self.assertNotIn("password", data)
        self.assertNotIn("password_hash", data)

        # Verify password in DB is hashed with bcrypt and not plaintext
        user = self.db.query(User).filter(User.email == self.test_email).first()
        self.assertIsNotNone(user)
        self.assertNotEqual(user.password_hash, self.test_password)
        self.assertTrue(verify_password(self.test_password, user.password_hash))
        self.assertEqual(user.role, "ADMIN")

        # Verify token is marked used
        tok = self.db.query(AdminSetupToken).filter(AdminSetupToken.token_hash == hash_token(self.raw_setup_token)).first()
        self.assertTrue(tok.used)
        print(f"[PASS] 5. Admin account created successfully for {self.test_email} (bcrypt hash verified)")

    def test_06_used_one_time_token_rejected_on_reuse(self):
        """Scenario: Attempting to reuse a one-time token fails."""
        payload = {
            "full_name": "Second Admin Attempt",
            "email": "second.admin@agrishield.com",
            "password": "StrongPassword@2026!",
            "confirm_password": "StrongPassword@2026!",
            "setup_token": self.raw_setup_token
        }
        res = client.post("/api/v1/auth/admin/setup", json=payload)
        self.assertEqual(res.status_code, 403)
        print("[PASS] 6. Reusing consumed one-time setup token rejected (403 Forbidden)")

    def test_07_duplicate_email_rejected(self):
        """Scenario 2: Duplicate admin email rejected with 400 Bad Request."""
        payload = {
            "full_name": "Duplicate Tester",
            "email": self.test_email,  # Already created in test_05
            "password": "ValidPassword@123!",
            "confirm_password": "ValidPassword@123!",
            "setup_token": settings.ADMIN_SETUP_TOKEN  # Using master token to isolate email check
        }
        res = client.post("/api/v1/auth/admin/setup", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("already exists", res.json()["detail"])
        print("[PASS] 7. Duplicate administrator email registration rejected (400 Bad Request)")

    def test_08_admin_login_and_jwt_generation(self):
        """Scenarios 4, 5: Administrator logs in with email & password, receives valid JWT access token."""
        login_payload = {
            "email": self.test_email,
            "password": self.test_password
        }
        res = client.post("/api/v1/auth/admin/login", json=login_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["role"], "ADMIN")
        self.assertEqual(data["email"], self.test_email)
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")

        # Save token for subsequent authorization tests
        self.__class__.admin_jwt = data["access_token"]
        print(f"[PASS] 8. Administrator logged in successfully; JWT token generated (Role: ADMIN)")

    def test_09_swagger_bearer_authorization_check(self):
        """Scenario 6: Verify Swagger Authorize compatibility via Bearer HTTP authentication header."""
        headers = {"Authorization": f"Bearer {self.admin_jwt}"}
        res = client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["email"], self.test_email)
        self.assertEqual(data["role"], "ADMIN")

        # Admin overview endpoint verification
        overview_res = client.get("/api/v1/admin/overview", headers=headers)
        self.assertEqual(overview_res.status_code, 200)
        self.assertIn("total_farmers", overview_res.json())
        print("[PASS] 9. Swagger Bearer Authorization verified with valid JWT token on protected endpoints")

    def test_10_esp8266_device_registration_by_new_admin(self):
        """Scenario 7: Newly provisioned administrator registers an ESP8266 hardware device at POST /api/v1/devices."""
        headers = {"Authorization": f"Bearer {self.admin_jwt}"}
        new_device_uid = f"ESP8266-TEST-{secrets.token_hex(4).upper()}"
        payload = {
            "device_uid": new_device_uid,
            "device_name": "Field Sector 9 - ESP8266 NodeMCU",
            "device_type": "ESP8266_NODEMCU"
        }
        res = client.post("/api/v1/devices", json=payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["device_uid"], new_device_uid)
        self.assertEqual(data["device_name"], "Field Sector 9 - ESP8266 NodeMCU")
        self.assertIn("api_key", data)
        self.assertTrue(data["api_key"].startswith("agri_dev_"))
        print(f"[PASS] 10. ESP8266 hardware device registered by new administrator ({new_device_uid})")

    def test_11_generate_setup_token_endpoint(self):
        """Scenario: Existing administrator generates a new one-time setup token for another colleague."""
        headers = {"Authorization": f"Bearer {self.admin_jwt}"}
        res = client.post("/api/v1/admin/generate-setup-token?expiry_hours=12", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("setup_token", data)
        self.assertIn("setup_url", data)
        self.assertTrue(data["setup_token"].startswith("agri_adm_"))
        print(f"[PASS] 11. Administrator generated secure setup token: {data['setup_token'][:20]}...")

if __name__ == "__main__":
    print("\n" + "="*75)
    print("  AGRISHIELD - SECURE ADMIN PROVISIONING & AUTHORIZATION TEST SUITE")
    print("="*75)
    unittest.main(verbosity=2)
