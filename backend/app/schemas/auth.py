import re
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class FarmerRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Farmer's full name")
    email: str = Field(..., description="Unique email address")
    password: str = Field(..., min_length=6, max_length=128, description="Account password (min 6 characters)")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="Password confirmation")
    village: str = Field(..., min_length=2, max_length=100, description="Village name")
    district: str = Field(..., min_length=2, max_length=100, description="District name")
    emergency_contact_name: str = Field(..., min_length=2, max_length=100, description="Family/Emergency contact person")
    emergency_contact_mobile: str = Field(..., min_length=10, max_length=20, description="Emergency mobile number")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email address format.")
        return clean

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and Confirm Password do not match.")
        return self

class LoginRequest(BaseModel):
    email: str = Field(..., description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")
    remember_me: Optional[bool] = Field(False, description="Extend session duration")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email address format.")
        return clean

class AdminLoginRequest(BaseModel):
    email: str = Field(..., description="Admin email address")
    password: str = Field(..., min_length=1, description="Admin password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email address format.")
        return clean

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., description="Account email to receive reset token")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email address format.")
        return clean

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, description="Password reset token")
    new_password: str = Field(..., min_length=6, max_length=128, description="New account password")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="Confirm new password")

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirmation do not match.")
        return self

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    email: str
    village: Optional[str] = None
    district: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    full_name: str
    village: Optional[str] = None
    district: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_mobile: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AdminSetupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Administrator's full name")
    email: str = Field(..., description="Administrator email address")
    password: str = Field(..., min_length=8, max_length=128, description="Strong password (min 8 characters)")
    confirm_password: str = Field(..., min_length=8, max_length=128, description="Password confirmation")
    setup_token: Optional[str] = Field(None, description="One-time administrator setup token")
    phone_number: Optional[str] = Field(None, description="Administrator contact phone number")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email address format.")
        return clean

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter (A-Z).")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter (a-z).")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number (0-9).")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", v):
            raise ValueError("Password must contain at least one special character (!@#$%^&* etc.).")
        return v

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and confirmation do not match.")
        return self

class AdminSetupResponse(BaseModel):
    message: str
    user_id: int
    email: str
    full_name: str
    role: str = "ADMIN"
    created_at: datetime

class AdminTokenVerifyResponse(BaseModel):
    valid: bool
    message: str
