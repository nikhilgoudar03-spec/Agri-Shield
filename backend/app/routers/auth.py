import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User, FarmerProfile, UserSettings, AuditLog, PasswordResetToken, UserSession, AdminSetupToken
from app.schemas.auth import (
    FarmerRegisterRequest,
    LoginRequest,
    AdminLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    AdminSetupRequest,
    AdminSetupResponse,
    AdminTokenVerifyResponse,
)
from app.security.password import (
    hash_password,
    verify_password,
    generate_reset_token,
    hash_token,
)
from app.security.auth_bearer import create_access_token, get_current_user, decode_access_token

logger = logging.getLogger("agrishield.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/status")
def get_auth_system_status():
    """Returns the authentication system status."""
    return {
        "auth_engine": "MySQL Native Email & Password",
        "has_external_dependencies": False,
        "supported_roles": ["FARMER", "ADMIN"],
        "password_hasher": "bcrypt",
        "session_type": "JWT Bearer + Database Sessions",
        "status": "OPERATIONAL"
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
@router.post("/register-farmer", status_code=status.HTTP_201_CREATED)
def register_farmer(payload: FarmerRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new farmer account with MySQL email and password."""
    clean_email = str(payload.email).lower().strip()

    # 1. Check if email already registered
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address is already registered. Please log in."
        )

    # 2. Hash password securely
    hashed_pwd = hash_password(payload.password)

    # 3. Create user in database with FARMER role
    new_user = User(
        email=clean_email,
        password_hash=hashed_pwd,
        full_name=payload.full_name.strip(),
        role="FARMER",
        village=payload.village.strip(),
        district=payload.district.strip(),
        emergency_contact_name=payload.emergency_contact_name.strip(),
        emergency_contact_mobile=payload.emergency_contact_mobile.strip(),
        phone_number=payload.emergency_contact_mobile.strip(),
        firebase_uid=f"usr_{secrets.token_hex(12)}",  # Satisfies legacy column constraint
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.flush()

    # 4. Create or update farmer profile record for compatibility
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == new_user.id).first()
    if not profile:
        profile = FarmerProfile(
            user_id=new_user.id,
            village=new_user.village,
            district=new_user.district,
            state="Karnataka",
            emergency_contact_name=new_user.emergency_contact_name,
            emergency_contact_phone=new_user.emergency_contact_mobile,
        )
        db.add(profile)
    else:
        profile.village = new_user.village
        profile.district = new_user.district
        profile.emergency_contact_name = new_user.emergency_contact_name
        profile.emergency_contact_phone = new_user.emergency_contact_mobile

    # 5. Create or update default settings
    settings_obj = db.query(UserSettings).filter(UserSettings.user_id == new_user.id).first()
    if not settings_obj:
        settings_obj = UserSettings(
            user_id=new_user.id,
            language="en",
            theme="light",
            sms_notifications=True,
            buzzer_enabled=True,
        )
        db.add(settings_obj)

    # 6. Record audit log
    audit = AuditLog(
        user_id=new_user.id,
        action="FARMER_REGISTERED",
        resource="users",
        details=f"Farmer {new_user.full_name} registered with email {clean_email}"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_user)

    logger.info(f"Registered farmer user id={new_user.id}, email={new_user.email}")

    return {
        "message": "Registration successful. You can now log in with your email and password.",
        "user_id": new_user.id,
        "email": new_user.email,
        "full_name": new_user.full_name
    }

@router.post("/login", response_model=TokenResponse)
@router.post("/login-farmer", response_model=TokenResponse)
def login_farmer(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticates a farmer with email and password, returning JWT access token."""
    clean_email = str(payload.email).lower().strip()

    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support.",
        )

    # Extend session expiry if remember_me is selected
    token_lifetime = timedelta(days=30 if payload.remember_me else 7)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "email": user.email},
        expires_delta=token_lifetime
    )

    # Record user session
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:250]
    session_record = UserSession(
        user_id=user.id,
        session_token=secrets.token_urlsafe(32),
        ip_address=client_ip,
        user_agent=user_agent,
        expires_at=datetime.utcnow() + token_lifetime,
        is_active=True,
    )
    db.add(session_record)

    audit = AuditLog(
        user_id=user.id,
        action="FARMER_LOGIN",
        resource="auth",
        ip_address=client_ip,
        details=f"Farmer {user.email} logged in successfully"
    )
    db.add(audit)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        village=user.village,
        district=user.district
    )

@router.get("/admin/verify-token", response_model=AdminTokenVerifyResponse)
def verify_admin_setup_token(token: str, db: Session = Depends(get_db)):
    """Validates whether an admin setup token is currently valid and unused."""
    clean_token = token.strip()
    if settings.ADMIN_SETUP_TOKEN and secrets.compare_digest(clean_token, settings.ADMIN_SETUP_TOKEN):
        return AdminTokenVerifyResponse(valid=True, message="Master administrator setup token verified.")

    token_hashed = hash_token(clean_token)
    now = datetime.utcnow()
    db_token = db.query(AdminSetupToken).filter(
        AdminSetupToken.token_hash == token_hashed,
        AdminSetupToken.used == False,
        AdminSetupToken.expires_at > now
    ).first()

    if db_token:
        return AdminTokenVerifyResponse(valid=True, message="One-time administrator setup token verified.")

    return AdminTokenVerifyResponse(valid=False, message="Invalid, expired, or already used setup token.")

@router.post("/admin/setup", response_model=AdminSetupResponse, status_code=status.HTTP_201_CREATED)
@router.post("/register-admin", response_model=AdminSetupResponse, status_code=status.HTTP_201_CREATED)
def setup_admin_account(
    payload: AdminSetupRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Secure Administrator Account Provisioning.
    Strictly requires either:
    1. A valid one-time admin setup token in payload or header (X-Admin-Setup-Token), OR
    2. A configured master ADMIN_SETUP_TOKEN in system environment, OR
    3. An authenticated existing administrator session.
    Public visitor registration is strictly prohibited.
    """
    # 1. Check authorization token
    setup_token = payload.setup_token or request.headers.get("X-Admin-Setup-Token")
    auth_header = request.headers.get("Authorization")

    is_authorized = False
    matched_db_token: Optional[AdminSetupToken] = None

    # Check master setup token from environment
    if setup_token and settings.ADMIN_SETUP_TOKEN:
        if secrets.compare_digest(setup_token.strip(), settings.ADMIN_SETUP_TOKEN):
            is_authorized = True

    # Check database one-time token
    if not is_authorized and setup_token:
        token_hashed = hash_token(setup_token.strip())
        now = datetime.utcnow()
        db_token = db.query(AdminSetupToken).filter(
            AdminSetupToken.token_hash == token_hashed,
            AdminSetupToken.used == False,
            AdminSetupToken.expires_at > now
        ).first()
        if db_token:
            is_authorized = True
            matched_db_token = db_token

    # Check existing authenticated admin session
    if not is_authorized and auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        jwt_payload = decode_access_token(token)
        if jwt_payload and jwt_payload.get("role") == "ADMIN":
            user_id = jwt_payload.get("sub")
            existing_admin = db.query(User).filter(User.id == int(user_id), User.role == "ADMIN", User.is_active == True).first()
            if existing_admin:
                is_authorized = True

    if not is_authorized:
        logger.warning(f"Unauthorized admin creation attempt for email {payload.email} from {request.client.host if request.client else 'unknown'}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin account creation requires a valid, unused setup token or authorized administrator credentials. Public creation is disabled."
        )

    # 2. Check duplicate email in users table
    clean_email = str(payload.email).lower().strip()
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please use a unique administrator email or log in."
        )

    # 3. Hash password securely with bcrypt
    hashed_password = hash_password(payload.password)

    # 4. Provision admin user in database
    admin_phone = payload.phone_number.strip() if getattr(payload, "phone_number", None) and payload.phone_number else f"+9198{secrets.randbelow(90000000) + 10000000}"
    new_admin = User(
        email=clean_email,
        password_hash=hashed_password,
        full_name=payload.full_name.strip(),
        role="ADMIN",
        phone_number=admin_phone,
        firebase_uid=f"adm_{secrets.token_hex(12)}",
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_admin)
    db.flush()

    # 5. Invalidate one-time setup token if used
    if matched_db_token:
        matched_db_token.used = True
        matched_db_token.used_by_email = clean_email

    # 6. Record audit log
    client_ip = request.client.host if request.client else None
    audit = AuditLog(
        user_id=new_admin.id,
        action="ADMIN_ACCOUNT_PROVISIONED",
        resource="users",
        ip_address=client_ip,
        details=f"Admin account {clean_email} ({new_admin.full_name}) successfully provisioned."
    )
    db.add(audit)
    db.commit()
    db.refresh(new_admin)

    logger.info(f"Admin account created successfully: id={new_admin.id}, email={new_admin.email}")

    return AdminSetupResponse(
        message="Administrator account successfully created. You can now log in.",
        user_id=new_admin.id,
        email=new_admin.email,
        full_name=new_admin.full_name,
        role="ADMIN",
        created_at=new_admin.created_at
    )

@router.post("/admin/login", response_model=TokenResponse)
@router.post("/login-admin", response_model=TokenResponse)
def login_admin(payload: AdminLoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticates an administrator with email and password."""
    clean_email = str(payload.email).lower().strip()

    admin = db.query(User).filter(User.email == clean_email).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if admin.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: This account does not possess administrator privileges.",
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator account is deactivated.",
        )

    token_lifetime = timedelta(days=7)
    access_token = create_access_token(
        data={"sub": str(admin.id), "role": "ADMIN", "email": admin.email},
        expires_delta=token_lifetime
    )

    client_ip = request.client.host if request.client else None
    audit = AuditLog(
        user_id=admin.id,
        action="ADMIN_LOGIN",
        resource="auth",
        ip_address=client_ip,
        details=f"Administrator {admin.email} logged in"
    )
    db.add(audit)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role="ADMIN",
        user_id=admin.id,
        full_name=admin.full_name,
        email=admin.email,
        village=admin.village,
        district=admin.district
    )

@router.get("/me", response_model=UserResponse)
@router.get("/me-farmer", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return user

@router.post("/logout")
def logout_user(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Deactivates active sessions for current user."""
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"is_active": False})
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGOUT",
        resource="auth",
        details=f"User {user.email} logged out"
    )
    db.add(audit)
    db.commit()
    return {"message": "Successfully logged out."}

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generates a secure password reset token without revealing whether email exists.
    """
    clean_email = str(payload.email).lower().strip()
    user = db.query(User).filter(User.email == clean_email).first()

    raw_token_for_dev = None
    if user and user.is_active:
        raw_token, token_hash = generate_reset_token()
        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(minutes=30),
            used=False
        )
        db.add(reset_record)
        db.commit()
        raw_token_for_dev = raw_token
        logger.info(f"Password reset token generated for user id={user.id}")

    # Standard security practice: always return a neutral, uniform success message
    response = {
        "message": "If this email is registered in AgriShield, password reset instructions have been generated.",
        "expires_in_minutes": 30
    }
    # In local development mode, return development token for immediate testing convenience
    if raw_token_for_dev and settings.DEV_MODE_ALLOW_TEST_AUTH:
        response["dev_reset_token"] = raw_token_for_dev
        response["dev_reset_url"] = f"http://localhost:5173/reset-password?token={raw_token_for_dev}"

    return response

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Verifies a reset token and updates the user's password with a new bcrypt hash.
    """
    incoming_hash = hash_token(payload.token)
    now = datetime.utcnow()

    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == incoming_hash,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > now
    ).first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The password reset link is invalid or has expired. Please request a new link."
        )

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account associated with this token was not found."
        )

    # Hash new password
    user.password_hash = hash_password(payload.new_password)
    user.updated_at = now
    token_record.used = True

    audit = AuditLog(
        user_id=user.id,
        action="PASSWORD_RESET_SUCCESS",
        resource="users",
        details="User successfully reset their password"
    )
    db.add(audit)
    db.commit()

    logger.info(f"Password reset completed for user id={user.id}")

    return {
        "message": "Password successfully updated. You can now log in with your new password.",
        "email": user.email
    }
