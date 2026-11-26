"""
AgriShield - Administrator Setup Token Provisioning CLI Tool
Usage:
    python backend/generate_admin_token.py
Generates a cryptographically secure one-time token for administrator registration.
"""
import sys
import os
import secrets
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.user import AdminSetupToken, User
from app.security.password import hash_token
from app.config import settings

def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        raw_token = f"agri_adm_{secrets.token_urlsafe(24)}"
        token_hashed = hash_token(raw_token)
        expires_at = datetime.utcnow() + timedelta(hours=48)

        # Find existing admin user to link if available
        first_admin = db.query(User).filter(User.role == "ADMIN").first()
        admin_id = first_admin.id if first_admin else None

        record = AdminSetupToken(
            token_hash=token_hashed,
            created_by=admin_id,
            expires_at=expires_at,
            used=False
        )
        db.add(record)
        db.commit()

        print("\n" + "="*70)
        print("  AGRISHIELD - ADMINISTRATOR SETUP TOKEN GENERATED")
        print("="*70)
        print(f"Setup Token: {raw_token}")
        print(f"Expires At:  {expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')} (48 hours)")
        print(f"Setup URL:   http://localhost:5173/admin/setup?token={raw_token}")
        print("-" * 70)
        print(f"Master Token configured in .env: {settings.ADMIN_SETUP_TOKEN}")
        print("="*70 + "\n")
    finally:
        db.close()

if __name__ == "__main__":
    main()
