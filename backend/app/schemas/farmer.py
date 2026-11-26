from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FarmerProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone_number: str
    village: str
    district: str
    state: str
    emergency_contact_name: str
    emergency_contact_phone: str
    created_at: datetime

    class Config:
        from_attributes = True

class FarmerProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
