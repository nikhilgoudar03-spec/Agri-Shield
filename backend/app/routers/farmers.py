from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User, FarmerProfile, AuditLog
from app.models.device import Device, FarmerDevice
from app.models.telemetry import SensorReading, GPSLocation, FallEvent, EmergencyAlert
from app.schemas.farmer import FarmerProfileResponse, FarmerProfileUpdate
from app.security.auth_bearer import get_current_farmer

router = APIRouter(prefix="/farmers", tags=["Farmers"])

@router.get("/profile", response_model=FarmerProfileResponse)
def get_farmer_profile(current_user: User = Depends(get_current_farmer), db: Session = Depends(get_db)):
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return FarmerProfileResponse(
        id=profile.id,
        user_id=current_user.id,
        full_name=current_user.full_name,
        phone_number=current_user.phone_number,
        village=profile.village,
        district=profile.district,
        state=profile.state,
        emergency_contact_name=profile.emergency_contact_name,
        emergency_contact_phone=profile.emergency_contact_phone,
        created_at=profile.created_at
    )

@router.put("/profile", response_model=FarmerProfileResponse)
def update_farmer_profile(payload: FarmerProfileUpdate, current_user: User = Depends(get_current_farmer), db: Session = Depends(get_db)):
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if payload.full_name:
        current_user.full_name = payload.full_name
    if payload.village:
        profile.village = payload.village
    if payload.district:
        profile.district = payload.district
    if payload.state:
        profile.state = payload.state
    if payload.emergency_contact_name:
        profile.emergency_contact_name = payload.emergency_contact_name
    if payload.emergency_contact_phone:
        profile.emergency_contact_phone = payload.emergency_contact_phone
        
    db.commit()
    db.refresh(profile)
    return FarmerProfileResponse(
        id=profile.id,
        user_id=current_user.id,
        full_name=current_user.full_name,
        phone_number=current_user.phone_number,
        village=profile.village,
        district=profile.district,
        state=profile.state,
        emergency_contact_name=profile.emergency_contact_name,
        emergency_contact_phone=profile.emergency_contact_phone,
        created_at=profile.created_at
    )

@router.get("/my-device")
def get_my_device(current_user: User = Depends(get_current_farmer), db: Session = Depends(get_db)):
    assignment = db.query(FarmerDevice).filter(
        FarmerDevice.farmer_id == current_user.id,
        FarmerDevice.is_active == True
    ).first()
    if not assignment:
        return {"has_device": False, "device": None}
    
    dev = db.query(Device).filter(Device.id == assignment.device_id).first()
    if not dev:
        return {"has_device": False, "device": None}
    
    # Calculate live status
    freshness = "OFFLINE"
    if dev.last_heartbeat:
        diff = (datetime.utcnow() - dev.last_heartbeat).total_seconds()
        if diff < 60:
            freshness = "ONLINE"
        elif diff < 300:
            freshness = "STALE"
        else:
            freshness = "OFFLINE"

    return {
        "has_device": True,
        "device": {
            "id": dev.id,
            "device_uid": dev.device_uid,
            "device_name": dev.device_name,
            "device_type": dev.device_type,
            "status": freshness,
            "last_heartbeat": dev.last_heartbeat,
            "firmware_version": dev.firmware_version,
            "assigned_at": assignment.assigned_at
        }
    }

@router.get("/dashboard-summary")
def get_farmer_dashboard_summary(current_user: User = Depends(get_current_farmer), db: Session = Depends(get_db)):
    # 1. Device info
    assignment = db.query(FarmerDevice).filter(
        FarmerDevice.farmer_id == current_user.id,
        FarmerDevice.is_active == True
    ).first()

    device_info = None
    latest_reading = None
    latest_gps = None
    latest_image = None
    recent_fall_events = []
    active_alerts = []

    if assignment:
        dev = db.query(Device).filter(Device.id == assignment.device_id).first()
        if dev:
            # Check device freshness
            status_calc = "OFFLINE"
            if dev.last_heartbeat:
                diff = (datetime.utcnow() - dev.last_heartbeat).total_seconds()
                if diff < 60:
                    status_calc = "LIVE"
                elif diff < 180:
                    status_calc = "STALE"
                else:
                    status_calc = "DEVICE OFFLINE"

            device_info = {
                "id": dev.id,
                "device_uid": dev.device_uid,
                "device_name": dev.device_name,
                "status": status_calc,
                "last_heartbeat": dev.last_heartbeat
            }

            # 2. Latest sensor reading
            latest_reading_obj = db.query(SensorReading).filter(
                SensorReading.device_id == dev.id
            ).order_by(SensorReading.timestamp.desc()).first()

            if latest_reading_obj:
                read_diff = (datetime.utcnow() - (latest_reading_obj.received_at or latest_reading_obj.timestamp)).total_seconds()
                if latest_reading_obj.sensor_status in ("SENSOR_ERROR", "DISCONNECTED"):
                    data_fresh = "SENSOR ERROR"
                elif read_diff < 30:
                    data_fresh = "LIVE"
                elif read_diff < 120:
                    data_fresh = "STALE"
                else:
                    data_fresh = "OFFLINE"

                latest_reading = {
                    "mq135_raw": latest_reading_obj.mq135_raw,
                    "mq135_ppm": latest_reading_obj.mq135_ppm,
                    "mq135_status": latest_reading_obj.mq135_status,
                    "temperature_c": latest_reading_obj.temperature_c,
                    "humidity_percent": latest_reading_obj.humidity_percent or latest_reading_obj.humidity_pct,
                    "humidity_pct": latest_reading_obj.humidity_pct or latest_reading_obj.humidity_percent,
                    "sensor_status": latest_reading_obj.sensor_status or "VALID",
                    "received_at": latest_reading_obj.received_at or latest_reading_obj.timestamp,
                    "timestamp": latest_reading_obj.timestamp,
                    "data_freshness": data_fresh
                }

            # 3. Latest GPS (Strict: only if valid satellite fix)
            gps_obj = db.query(GPSLocation).filter(
                GPSLocation.device_id == dev.id,
                GPSLocation.gps_fix == True,
                GPSLocation.latitude.isnot(None),
                GPSLocation.longitude.isnot(None)
            ).order_by(GPSLocation.received_at.desc(), GPSLocation.timestamp.desc()).first()

            if gps_obj and gps_obj.latitude != 0.0 and gps_obj.longitude != 0.0:
                latest_gps = {
                    "latitude": gps_obj.latitude,
                    "longitude": gps_obj.longitude,
                    "satellites": gps_obj.satellites,
                    "gps_fix": True,
                    "altitude_m": gps_obj.altitude_m or gps_obj.altitude,
                    "altitude": gps_obj.altitude or gps_obj.altitude_m,
                    "speed": gps_obj.speed,
                    "received_at": gps_obj.received_at or gps_obj.timestamp,
                    "timestamp": gps_obj.timestamp,
                    "is_valid": True
                }
            else:
                # Query any recent ping to check if module is searching
                recent_ping = db.query(GPSLocation).filter(
                    GPSLocation.device_id == dev.id
                ).order_by(GPSLocation.received_at.desc(), GPSLocation.timestamp.desc()).first()
                if recent_ping:
                    latest_gps = {
                        "latitude": None,
                        "longitude": None,
                        "satellites": recent_ping.satellites,
                        "gps_fix": False,
                        "altitude_m": None,
                        "speed": None,
                        "received_at": recent_ping.received_at or recent_ping.timestamp,
                        "timestamp": recent_ping.timestamp,
                        "is_valid": False
                    }

            # 4. Recent possible falls
            falls = db.query(FallEvent).filter(
                FallEvent.device_id == dev.id
            ).order_by(FallEvent.timestamp.desc()).limit(5).all()
            recent_fall_events = [
                {
                    "id": f.id,
                    "event_type": f.event_type,
                    "confirmed": f.confirmed,
                    "timestamp": f.timestamp
                }
                for f in falls
            ]

    # 6. Active emergency alerts
    alerts = db.query(EmergencyAlert).filter(
        EmergencyAlert.farmer_id == current_user.id,
        EmergencyAlert.status.in_(["ACTIVE", "DISPATCHED"])
    ).order_by(EmergencyAlert.created_at.desc()).all()
    active_alerts = [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "status": a.status,
            "message": a.message,
            "created_at": a.created_at,
            "latitude": a.latitude,
            "longitude": a.longitude
        }
        for a in alerts
    ]

    return {
        "farmer_name": current_user.full_name,
        "phone_number": current_user.phone_number,
        "device": device_info,
        "latest_reading": latest_reading,
        "latest_gps": latest_gps,
        "latest_image": latest_image,
        "recent_fall_events": recent_fall_events,
        "active_alerts": active_alerts
    }
