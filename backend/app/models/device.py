from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_uid = Column(String(64), unique=True, index=True, nullable=False)
    device_name = Column(String(100), nullable=False)
    device_type = Column(String(50), default="ESP32_DEV_KIT_V1")
    api_key = Column(String(128), unique=True, index=True, nullable=False)
    secret_hash = Column(String(255), nullable=True)  # Securely hashed Device Secret Key (bcrypt)
    status = Column(String(20), default="OFFLINE")  # "ONLINE", "OFFLINE", "STALE", "ERROR"
    last_heartbeat = Column(DateTime, nullable=True)
    firmware_version = Column(String(30), default="1.0.0")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assignments = relationship("FarmerDevice", back_populates="device", cascade="all, delete-orphan")
    heartbeats = relationship("DeviceHeartbeat", back_populates="device", cascade="all, delete-orphan")
    sensor_readings = relationship("SensorReading", back_populates="device", cascade="all, delete-orphan")
    gps_locations = relationship("GPSLocation", back_populates="device", cascade="all, delete-orphan")
    fall_events = relationship("FallEvent", back_populates="device", cascade="all, delete-orphan")
    emergency_alerts = relationship("EmergencyAlert", back_populates="device")

class FarmerDevice(Base):
    __tablename__ = "farmer_devices"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    farmer = relationship("User", back_populates="assigned_devices")
    device = relationship("Device", back_populates="assignments")

class DeviceHeartbeat(Base):
    __tablename__ = "device_heartbeats"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    connection_status = Column(String(20), default="ONLINE")  # "ONLINE", "STALE", "OFFLINE"
    battery_level = Column(Float, nullable=True)
    signal_strength = Column(Integer, nullable=True)
    status = Column(String(20), default="ONLINE")

    device = relationship("Device", back_populates="heartbeats")
