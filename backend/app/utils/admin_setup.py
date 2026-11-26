import argparse
import sys
from datetime import datetime
from app.database import SessionLocal, Base, engine
from app.models.user import User, FarmerProfile, UserSettings, AuditLog
from app.security.password import hash_password

def setup_admin(email: str, password: str, full_name: str = "Chief Safety Officer (Admin)"):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        clean_email = email.strip().lower()
        user = db.query(User).filter(User.email == clean_email).first()
        if user:
            user.role = "ADMIN"
            user.full_name = full_name
            user.password_hash = hash_password(password)
            user.is_active = True
            user.updated_at = datetime.utcnow()
            print(f"[SUCCESS] User {clean_email} promoted to ADMIN role with updated credentials.")
        else:
            user = User(
                email=clean_email,
                password_hash=hash_password(password),
                role="ADMIN",
                full_name=full_name,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(user)
            db.flush()

            settings = UserSettings(user_id=user.id, language="en", theme="dark")
            db.add(settings)

            audit = AuditLog(
                user_id=user.id,
                action="ADMIN_PROVISIONED",
                resource="users",
                details=f"Admin {full_name} ({clean_email}) provisioned via CLI"
            )
            db.add(audit)
            print(f"[SUCCESS] New Administrator {full_name} ({clean_email}) created successfully.")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to provision admin: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provision an AgriShield Administrator account")
    parser.add_argument("--email", default="admin@agrishield.com", help="Admin email address")
    parser.add_argument("--password", default="Admin@123", help="Admin password")
    parser.add_argument("--name", default="Chief Safety Officer (Admin)", help="Admin full name")

    args = parser.parse_args()
    setup_admin(args.email, args.password, args.name)
