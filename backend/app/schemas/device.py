from pydantic import BaseModel, Field
from typing import Optional, Union
from datetime import datetime

class DeviceCreate(BaseModel):
    device_uid: str = Field(..., min_length=3, max_length=64)
    device_name: str = Field(..., min_length=2, max_length=100)
    device_type: str = "ESP32_DEV_KIT_V1"

class DeviceAssignRequest(BaseModel):
    farmer_id: int
    device_id: int

class DeviceHeartbeatRequest(BaseModel):
    device_id: Optional[Union[str, int]] = None
    battery_level: Optional[float] = None
    signal_strength: Optional[int] = None
    status: Optional[str] = "ONLINE"

class DeviceResponse(BaseModel):
    id: int
    device_uid: str
    device_name: str
    device_type: str
    status: str
    last_heartbeat: Optional[datetime]
    firmware_version: str
    created_at: datetime
    assigned_farmer_id: Optional[int] = None
    assigned_farmer_name: Optional[str] = None

    class Config:
        from_attributes = True
