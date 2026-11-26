import sys
import os
import requests

def test_login():
    url = "http://localhost:8000/api/v1/auth/admin/login"
    payload = {
        "email": "nikhilgodar03@gmail.com",
        "password": "12345678"
    }
    res = requests.post(url, json=payload)
    print("Status Code:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        print("Role:", data.get("role"))
        print("Email:", data.get("email"))
        print("Full Name:", data.get("full_name"))
        token = data.get("access_token", "")
        print(f"JWT Token ({len(token)} chars): {token[:35]}...")

        # Test auth with protected endpoint
        headers = {"Authorization": f"Bearer {token}"}
        me_res = requests.get("http://localhost:8000/api/v1/auth/me", headers=headers)
        print("Protected /api/v1/auth/me Status:", me_res.status_code)
        print("Verified User:", me_res.json().get("email"))

        overview_res = requests.get("http://localhost:8000/api/v1/admin/overview", headers=headers)
        print("Protected /api/v1/admin/overview Status:", overview_res.status_code)
    else:
        print("Error Response:", res.text)

if __name__ == "__main__":
    test_login()
