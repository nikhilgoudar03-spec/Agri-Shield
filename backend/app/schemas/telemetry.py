from pydantic import BaseModel, Field
from typing import Optional, Union
from datetime import datetime

class TelemetryPayload(BaseModel):
    # Device identification (can be supplied in payload or via HTTP headers)
    device_id: Optional[Union[str, int]] = Field(None, description="Device UID or numeric ID")
    api_key: Optional[str] = Field(None, description="Optional device API key")

    # DHT11 Temperature & Humidity
    temperature_c: Optional[float] = Field(None, description="DHT11 Temperature in Celsius")
    humidity_percent: Optional[float] = Field(None, description="DHT11 Relative Humidity percentage")
    humidity_pct: Optional[float] = Field(None, description="DHT11 Humidity percentage alias")
    sensor_status: Optional[str] = Field("VALID", description="Sensor status: VALID, SENSOR_ERROR, DISCONNECTED")
    recorded_at: Optional[datetime] = Field(None, description="Timestamp recorded by physical sensor node")

    # MQ-135 Air Quality (actual raw ADC reading and relative changes)
    mq135_raw: Optional[int] = Field(None, ge=0, le=1023, description="Actual MQ-135 raw analog ADC reading (0 to 1023 for 10-bit ESP8266/ESP32 ADC)")
    mq135_ppm: Optional[float] = Field(None, description="Relative MQ-135 air quality value")

    # MPU-6050 Motion (for possible fall detection)
    accel_x: Optional[float] = None
    accel_y: Optional[float] = None
    accel_z: Optional[float] = None
    gyro_x: Optional[float] = None
    gyro_y: Optional[float] = None
    gyro_z: Optional[float] = None

    # Optional embedded GPS
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    satellites: Optional[int] = None
    gps_fix: bool = False
    altitude_m: Optional[float] = None
    altitude: Optional[float] = None
    speed: Optional[float] = None
    gps_valid: bool = False

class GPSPayload(BaseModel):
    device_id: Optional[Union[str, int]] = Field(None, description="Device UID or numeric ID")
    api_key: Optional[str] = Field(None, description="Optional device API key")
    latitude: Optional[float] = Field(None, description="Actual latitude coordinate")
    longitude: Optional[float] = Field(None, description="Actual longitude coordinate")
    satellites: Optional[int] = Field(None, description="Number of locked satellites")
    gps_fix: bool = Field(False, description="True if valid satellite 2D/3D fix obtained")
    altitude_m: Optional[float] = Field(None, description="Altitude in meters")
    speed: Optional[float] = Field(None, description="Ground speed in km/h")
    recorded_at: Optional[datetime] = Field(None, description="Hardware GPS UTC timestamp")

class SensorReadingResponse(BaseModel):
    id: int
    device_id: int
    temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    humidity_pct: Optional[float] = None
    sensor_status: str = "VALID"
    mq135_raw: Optional[int] = None
    mq135_ppm: Optional[float] = None
    mq135_status: Optional[str] = "NORMAL"
    recorded_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    timestamp: Optional[datetime] = None
    data_freshness: str = "LIVE"

    class Config:
        from_attributes = True

class GPSLocationResponse(BaseModel):
    id: int
    device_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    satellites: Optional[int] = None
    gps_fix: bool = False
    altitude_m: Optional[float] = None
    altitude: Optional[float] = None
    speed: Optional[float] = None
    recorded_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    timestamp: Optional[datetime] = None
    is_valid: bool = True

    class Config:
        from_attributes = True

class FallEventCreate(BaseModel):
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: Optional[float] = None
    gyro_y: Optional[float] = None
    gyro_z: Optional[float] = None
    event_type: str = "POSSIBLE_FALL"  # "POSSIBLE_FALL" or "MANUAL_SOS"

class FallEventResponse(BaseModel):
    id: int
    device_id: int
    farmer_id: Optional[int]
    farmer_name: Optional[str] = None
    event_type: str
    confirmed: bool
    timestamp: datetime

    class Config:
        from_attributes = True

class EmergencyAlertResponse(BaseModel):
    id: int
    farmer_id: Optional[int]
    farmer_name: Optional[str] = None
    farmer_phone: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    device_id: Optional[int]
    alert_type: str
    status: str
    message: str
    latitude: Optional[float]
    longitude: Optional[float]
    image_url: Optional[str] = None
    dispatched_at: Optional[datetime]
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class EmergencyAlertUpdate(BaseModel):
    status: str  # "ACTIVE", "DISPATCHED", "RESOLVED"
    resolution_notes: Optional[str] = None
