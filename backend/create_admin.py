#!/usr/bin/env python3
"""
AgriShield - Secure Administrator Provisioning Script
Usage:
    python create_admin.py --email admin@agrishield.com --password Admin@123 --name "Super Administrator"
"""
import sys
import argparse
import secrets
from datetime import datetime
from app.database import SessionLocal, Base, engine
from app.models.user import User, AuditLog
from app.security.password import hash_password

def create_admin(email: str, password: str, full_name: str = "System Administrator", phone_number: str = None):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    clean_email = email.strip().lower()
    admin_phone = phone_number.strip() if phone_number else f"+9198{secrets.randbelow(90000000) + 10000000}"

    try:
        existing = db.query(User).filter(User.email == clean_email).first()
        if existing:
            print(f"[*] Updating existing account '{clean_email}' to ADMIN role with new password...")
            existing.role = "ADMIN"
            existing.full_name = full_name
            existing.password_hash = hash_password(password)
            existing.is_active = True
            existing.updated_at = datetime.utcnow()
            target_user = existing
        else:
            print(f"[*] Provisioning new ADMIN account for '{clean_email}'...")
            target_user = User(
                email=clean_email,
                password_hash=hash_password(password),
                full_name=full_name,
                role="ADMIN",
                phone_number=admin_phone,
                firebase_uid=f"adm_{secrets.token_hex(8)}",
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(target_user)

        audit = AuditLog(
            user_id=target_user.id if target_user.id else None,
            action="ADMIN_PROVISIONED_CLI",
            resource="users",
            details=f"Admin account {clean_email} provisioned via backend CLI script"
        )
        db.add(audit)
        db.commit()
        db.refresh(target_user)

        print("\n=======================================================")
        print("  AGRISHIELD ADMINISTRATOR PROVISIONED SUCCESSFULLY")
        print("=======================================================")
        print(f"  User ID   : {target_user.id}")
        print(f"  Email     : {target_user.email}")
        print(f"  Full Name : {target_user.full_name}")
        print(f"  Role      : {target_user.role}")
        print(f"  Active    : {target_user.is_active}")
        print("=======================================================\n")
        return target_user
    except Exception as e:
        db.rollback()
        print(f"[!] Error provisioning admin account: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgriShield Administrator Provisioning")
    parser.add_argument("--email", default="admin@agrishield.com", help="Admin email address")
    parser.add_argument("--password", default="Admin@123", help="Admin password")
    parser.add_argument("--name", default="Chief Safety Officer (Admin)", help="Admin full name")
    parser.add_argument("--phone", default=None, help="Admin contact phone number")

    args = parser.parse_args()
    create_admin(args.email, args.password, args.name, args.phone)
