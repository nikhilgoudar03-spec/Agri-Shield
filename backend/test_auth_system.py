"""
AgriShield - Complete Independent Authentication Test Suite
Tests MySQL / SQLite Native Email + Password Authentication
"""
import sys
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.user import User

client = TestClient(app)

def run_tests():
    print("\n========================================================")
    print("  RUNNING AGRISHIELD INDEPENDENT AUTHENTICATION TESTS")
    print("========================================================")

    # 1. Test Auth System Status
    res = client.get("/api/v1/auth/status")
    assert res.status_code == 200, f"Status check failed: {res.text}"
    status_data = res.json()
    print("[PASS] 1. Auth Status:", status_data["auth_engine"])

    # 2. Test Farmer Registration
    reg_payload = {
        "full_name": "Ramesh Gowda",
        "email": "ramesh.farmer@agrishield.com",
        "password": "Farmer@Secure123",
        "confirm_password": "Farmer@Secure123",
        "village": "Kanakapura",
        "district": "Ramanagara",
        "emergency_contact_name": "Suresh Gowda",
        "emergency_contact_mobile": "+919876543211"
    }
    # Clean any existing user from previous runs
    db = SessionLocal()
    db.query(User).filter(User.email == "ramesh.farmer@agrishield.com").delete()
    db.commit()
    db.close()

    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201, f"Registration failed: {res.text}"
    print("[PASS] 2. Farmer Registration successful:", res.json()["message"])

    # 3. Test Duplicate Email Prevention
    res_dup = client.post("/api/v1/auth/register", json=reg_payload)
    assert res_dup.status_code == 400, f"Duplicate email was not rejected: {res_dup.text}"
    assert "already registered" in res_dup.json()["detail"]
    print("[PASS] 3. Duplicate email prevention confirmed: 400 Bad Request")

    # 4. Test Farmer Login with Valid Credentials
    login_payload = {
        "email": "ramesh.farmer@agrishield.com",
        "password": "Farmer@Secure123",
        "remember_me": True
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    token_data = res_login.json()
    assert token_data["role"] == "FARMER"
    assert "access_token" in token_data
    farmer_token = token_data["access_token"]
    print("[PASS] 4. Farmer Login succeeded, JWT token issued. Role:", token_data["role"])

    # 5. Test Invalid Password
    res_bad_pwd = client.post("/api/v1/auth/login", json={
        "email": "ramesh.farmer@agrishield.com",
        "password": "WrongPassword!999"
    })
    assert res_bad_pwd.status_code == 401, f"Invalid password not rejected: {res_bad_pwd.text}"
    print("[PASS] 5. Invalid password rejected: 401 Unauthorized")

    # 6. Test Unknown Email
    res_bad_email = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@agrishield.com",
        "password": "Password123"
    })
    assert res_bad_email.status_code == 401, f"Unknown email not rejected: {res_bad_email.text}"
    print("[PASS] 6. Unknown email rejected: 401 Unauthorized")

    # 7. Test Admin Login with Default Seeded Admin
    admin_login_payload = {
        "email": "admin@agrishield.com",
        "password": "Admin@123"
    }
    res_admin = client.post("/api/v1/auth/admin/login", json=admin_login_payload)
    assert res_admin.status_code == 200, f"Admin login failed: {res_admin.text}"
    admin_token_data = res_admin.json()
    assert admin_token_data["role"] == "ADMIN"
    admin_token = admin_token_data["access_token"]
    print("[PASS] 7. Admin Login succeeded. Role:", admin_token_data["role"])

    # 8. Test Farmer Attempting Admin Login (Role Authorization)
    res_unauth_admin = client.post("/api/v1/auth/admin/login", json={
        "email": "ramesh.farmer@agrishield.com",
        "password": "Farmer@Secure123"
    })
    assert res_unauth_admin.status_code == 403, f"Farmer unauthorized admin login not rejected with 403: {res_unauth_admin.text}"
    print("[PASS] 8. Non-admin forbidden from admin login: 403 Forbidden")

    # 9. Test Protected GET /api/v1/auth/me
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {farmer_token}"})
    assert res_me.status_code == 200, f"GET /me failed: {res_me.text}"
    user_me = res_me.json()
    assert user_me["email"] == "ramesh.farmer@agrishield.com"
    print("[PASS] 9. Protected endpoint /api/v1/auth/me verified for user:", user_me["full_name"])

    # 10. Test Password Reset Workflow
    res_forgot = client.post("/api/v1/auth/forgot-password", json={"email": "ramesh.farmer@agrishield.com"})
    assert res_forgot.status_code == 200, f"Forgot password failed: {res_forgot.text}"
    dev_token = res_forgot.json().get("dev_reset_token")
    assert dev_token is not None, "Dev reset token not returned"
    print("[PASS] 10. Password reset token generated successfully")

    # 11. Test Reset Password with Token
    res_reset = client.post("/api/v1/auth/reset-password", json={
        "token": dev_token,
        "new_password": "NewFarmerPassword@2026",
        "confirm_password": "NewFarmerPassword@2026"
    })
    assert res_reset.status_code == 200, f"Reset password failed: {res_reset.text}"
    print("[PASS] 11. Password reset executed successfully")

    # 12. Test Login with New Password
    res_new_login = client.post("/api/v1/auth/login", json={
        "email": "ramesh.farmer@agrishield.com",
        "password": "NewFarmerPassword@2026"
    })
    assert res_new_login.status_code == 200, f"Login with new password failed: {res_new_login.text}"
    print("[PASS] 12. Login with updated password succeeded!")

    # 13. Test Logout
    new_token = res_new_login.json()["access_token"]
    res_logout = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {new_token}"})
    assert res_logout.status_code == 200, f"Logout failed: {res_logout.text}"
    print("[PASS] 13. Logout endpoint succeeded:", res_logout.json()["message"])

    print("\n========================================================")
    print("  ALL 13 AUTHENTICATION TESTS PASSED WITH 100% SUCCESS!  ")
    print("========================================================\n")

if __name__ == "__main__":
    run_tests()
