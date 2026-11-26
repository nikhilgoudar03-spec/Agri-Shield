"""
AgriShield - Verification Script for admin@agrishield.local Development Account
Verifies:
1. Password hash verification (bcrypt).
2. Duplicate account prevention (400 Bad Request).
3. Admin Login & JWT access token generation.
4. Swagger / Protected API endpoint authorization (GET /api/v1/auth/me, GET /api/v1/admin/overview).
5. Device registration authorization (POST /api/v1/devices).
"""
import sys
import os
import requests
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.device import Device
from app.security.password import verify_password
from app.config import settings

client = TestClient(app)

def verify_dev_admin():
    email = "admin@agrishield.local"
    password = "AgriShield@2026#Admin"

    print("\n" + "="*70)
    print("  AGRISHIELD - ADMIN ACCOUNT VERIFICATION: admin@agrishield.local")
    print("="*70)

    # 1. Inspect Database Record & Password Hashing
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user is not None, f"Admin account {email} not found in database!"
        assert user.role == "ADMIN", f"Expected role ADMIN, got {user.role}"
        assert user.is_active is True, "User account is not active!"
        assert verify_password(password, user.password_hash), "Password verification failed!"
        assert not user.password_hash.startswith("AgriShield"), "Password must not be stored in plaintext!"
        assert user.password_hash.startswith("$2b$") or user.password_hash.startswith("$2a$"), "Password must be bcrypt hashed!"

        print(f"[PASS] 1. Database Record Verified:")
        print(f"        ID: {user.id}")
        print(f"        Email: {user.email}")
        print(f"        Role: {user.role}")
        print(f"        Bcrypt Hash: {user.password_hash[:25]}... (Salted & Hashed)")
    finally:
        db.close()

    # 2. Verify Duplicate Account Prevention
    dup_res = client.post(
        "/api/v1/auth/admin/setup",
        json={
            "full_name": "Duplicate Tester",
            "email": email,
            "password": password,
            "confirm_password": password,
            "setup_token": settings.ADMIN_SETUP_TOKEN
        }
    )
    assert dup_res.status_code == 400, f"Expected 400 Bad Request for duplicate email, got {dup_res.status_code}"
    assert "already exists" in dup_res.json()["detail"].lower(), "Duplicate error message expected"
    print(f"[PASS] 2. Duplicate Account Prevention Verified (HTTP 400: '{dup_res.json()['detail']}')")

    # 3. Verify Admin Login & JWT Access Token Generation
    login_res = client.post(
        "/api/v1/auth/admin/login",
        json={"email": email, "password": password}
    )
    assert login_res.status_code == 200, f"Login failed with status {login_res.status_code}: {login_res.text}"
    login_data = login_res.json()
    assert "access_token" in login_data, "access_token missing in response!"
    assert login_data["role"] == "ADMIN", f"Expected role ADMIN, got {login_data['role']}"
    assert login_data["email"] == email, f"Expected {email}, got {login_data['email']}"
    admin_token = login_data["access_token"]
    print(f"[PASS] 3. Admin Login & JWT Token Verified:")
    print(f"        Status: HTTP 200 OK")
    print(f"        Role: {login_data['role']}")
    print(f"        Access Token: {admin_token[:30]}... ({len(admin_token)} chars)")

    # 4. Verify Swagger Authorization (Protected Endpoints with Bearer Token)
    headers = {"Authorization": f"Bearer {admin_token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200, f"GET /api/v1/auth/me failed with status {me_res.status_code}"
    assert me_res.json()["email"] == email, "Email mismatch in /auth/me"

    overview_res = client.get("/api/v1/admin/overview", headers=headers)
    assert overview_res.status_code == 200, f"GET /api/v1/admin/overview failed with status {overview_res.status_code}"
    overview_data = overview_res.json()
    print(f"[PASS] 4. Swagger Bearer Authorization Verified:")
    print(f"        GET /api/v1/auth/me: HTTP 200 OK (Email: {me_res.json()['email']})")
    print(f"        GET /api/v1/admin/overview: HTTP 200 OK (Total Farmers: {overview_data['total_farmers']}, Devices: {overview_data['total_devices']})")

    # 5. Verify Device Registration API (POST /api/v1/devices)
    dev_uid = "ESP8266-DEV-001"
    # Check if already registered
    existing_dev = db.query(Device).filter(Device.device_uid == dev_uid).first() if 'db' in locals() else None
    
    device_payload = {
        "device_uid": dev_uid,
        "device_name": "Field Sector Alpha - ESP8266 NodeMCU",
        "device_type": "ESP8266_NODEMCU"
    }
    dev_res = client.post("/api/v1/devices", json=device_payload, headers=headers)
    if dev_res.status_code == 400 and "already registered" in dev_res.json().get("detail", ""):
        print(f"[PASS] 5. Device Registration Endpoint Verified (Device {dev_uid} already active in registry)")
    else:
        assert dev_res.status_code == 201, f"POST /api/v1/devices failed: {dev_res.text}"
        dev_data = dev_res.json()
        assert dev_data["device_uid"] == dev_uid
        assert "api_key" in dev_data
        print(f"[PASS] 5. Device Registration Endpoint Verified:")
        print(f"        Device UID: {dev_data['device_uid']}")
        print(f"        Device Name: {dev_data['device_name']}")
        print(f"        API Key: {dev_data['api_key'][:20]}...")

    print("="*70)
    print("  ALL 5 VERIFICATIONS PASSED SUCCESSFULLY!")
    print("="*70 + "\n")

if __name__ == "__main__":
    verify_dev_admin()
