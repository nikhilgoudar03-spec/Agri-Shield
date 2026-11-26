import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from app.database import get_db
from app.models.user import User, FarmerProfile, AuditLog, AdminSetupToken
from app.models.device import Device, FarmerDevice
from app.models.telemetry import SensorReading, FallEvent, EmergencyAlert
from app.security.auth_bearer import get_current_admin
from app.security.password import hash_token

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get("/overview")
def get_admin_overview(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    # 1. Total registered farmers
    total_farmers = db.query(User).filter(User.role == "FARMER").count()
    
    # 2. Devices count & status
    devices = db.query(Device).all()
    total_devices = len(devices)
    online_devices = 0
    offline_devices = 0
    now = datetime.utcnow()
    for d in devices:
        if d.last_heartbeat and (now - d.last_heartbeat).total_seconds() < 60:
            online_devices += 1
        else:
            offline_devices += 1
            
    # 3. Active emergencies
    active_emergencies = db.query(EmergencyAlert).filter(
        EmergencyAlert.status.in_(["ACTIVE", "DISPATCHED"])
    ).count()

    # 4. Recent safety events
    recent_events = db.query(EmergencyAlert).order_by(EmergencyAlert.created_at.desc()).limit(8).all()
    recent_events_data = []
    for ev in recent_events:
        farmer = db.query(User).filter(User.id == ev.farmer_id).first() if ev.farmer_id else None
        recent_events_data.append({
            "id": ev.id,
            "alert_type": ev.alert_type,
            "status": ev.status,
            "message": ev.message,
            "farmer_name": farmer.full_name if farmer else "Unknown Farmer",
            "farmer_phone": farmer.phone_number if farmer else "-",
            "created_at": ev.created_at
        })

    # 5. Sensor readings summary
    recent_readings = db.query(SensorReading).order_by(SensorReading.timestamp.desc()).limit(50).all()
    avg_temp = round(sum(r.temperature_c for r in recent_readings if r.temperature_c) / max(len(recent_readings), 1), 1) if recent_readings else 0
    avg_hum = round(sum(r.humidity_pct for r in recent_readings if r.humidity_pct) / max(len(recent_readings), 1), 1) if recent_readings else 0

    return {
        "total_farmers": total_farmers,
        "total_devices": total_devices,
        "online_devices": online_devices,
        "offline_devices": offline_devices,
        "active_emergencies": active_emergencies,
        "sensor_summary": {
            "avg_temperature_c": avg_temp,
            "avg_humidity_pct": avg_hum,
            "total_telemetry_records": db.query(SensorReading).count()
        },
        "recent_safety_events": recent_events_data
    }

@router.get("/farmers")
def list_farmers(
    search: Optional[str] = Query(None, description="Search by name, phone, village, district"),
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.role == "FARMER")
    if search:
        s = f"%{search.strip()}%"
        query = query.join(FarmerProfile, isouter=True).filter(
            (User.full_name.ilike(s)) |
            (User.phone_number.ilike(s)) |
            (FarmerProfile.village.ilike(s)) |
            (FarmerProfile.district.ilike(s))
        )
    farmers = query.offset(skip).limit(limit).all()

    result = []
    for f in farmers:
        prof = f.profile
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.farmer_id == f.id,
            FarmerDevice.is_active == True
        ).first()
        dev_uid = None
        if assignment:
            dev = db.query(Device).filter(Device.id == assignment.device_id).first()
            if dev:
                dev_uid = dev.device_uid

        result.append({
            "id": f.id,
            "full_name": f.full_name,
            "phone_number": f.phone_number,
            "village": prof.village if prof else "",
            "district": prof.district if prof else "",
            "state": prof.state if prof else "Karnataka",
            "emergency_contact_name": prof.emergency_contact_name if prof else "",
            "emergency_contact_phone": prof.emergency_contact_phone if prof else "",
            "assigned_device_uid": dev_uid,
            "is_active": f.is_active,
            "created_at": f.created_at
        })
    return result

@router.put("/farmers/{farmer_id}/status")
def toggle_farmer_status(
    farmer_id: int,
    is_active: bool,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == farmer_id, User.role == "FARMER").first()
    if not user:
        raise HTTPException(status_code=404, detail="Farmer not found")
    user.is_active = is_active
    db.commit()
    return {"message": f"Farmer status updated to {'active' if is_active else 'inactive'}", "farmer_id": farmer_id}

@router.get("/audit-logs")
def list_audit_logs(
    limit: int = 100,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    result = []
    for log in logs:
        user_name = log.user.full_name if log.user else "System"
        result.append({
            "id": log.id,
            "user_name": user_name,
            "action": log.action,
            "resource": log.resource,
            "details": log.details,
            "timestamp": log.timestamp
        })
    return result

@router.post("/generate-setup-token")
def generate_admin_setup_token(
    expiry_hours: int = 24,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Generates a secure, cryptographically random one-time administrator setup token."""
    raw_token = f"agri_adm_{secrets.token_urlsafe(24)}"
    token_hashed = hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(hours=min(max(expiry_hours, 1), 72))

    setup_token_rec = AdminSetupToken(
        token_hash=token_hashed,
        created_by=admin.id,
        expires_at=expires_at,
        used=False
    )
    db.add(setup_token_rec)

    audit = AuditLog(
        user_id=admin.id,
        action="ADMIN_SETUP_TOKEN_GENERATED",
        resource="admin_setup_tokens",
        details=f"Admin {admin.email} generated setup token expiring at {expires_at.isoformat()}"
    )
    db.add(audit)
    db.commit()

    return {
        "setup_token": raw_token,
        "expires_at": expires_at,
        "setup_url": f"http://localhost:5173/admin/setup?token={raw_token}",
        "message": "One-time administrator setup token created. Valid for one usage."
    }
