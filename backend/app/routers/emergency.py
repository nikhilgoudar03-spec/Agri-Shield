from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.device import Device, FarmerDevice
from app.models.telemetry import EmergencyAlert, GPSLocation
from app.models.user import User, FarmerProfile
from app.schemas.telemetry import EmergencyAlertResponse, EmergencyAlertUpdate
from app.security.auth_bearer import get_current_user, get_current_farmer, get_current_admin
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/emergency", tags=["Emergency Alerts"])

@router.post("/manual-sos", response_model=EmergencyAlertResponse)
async def trigger_manual_sos(
    current_user: User = Depends(get_current_farmer),
    db: Session = Depends(get_db)
):
    # Find farmer's device and latest GPS
    assignment = db.query(FarmerDevice).filter(
        FarmerDevice.farmer_id == current_user.id,
        FarmerDevice.is_active == True
    ).first()
    
    device_id = assignment.device_id if assignment else None
    lat = None
    lon = None

    if device_id:
        latest_gps = db.query(GPSLocation).filter(
            GPSLocation.device_id == device_id,
            GPSLocation.is_valid == True
        ).order_by(GPSLocation.timestamp.desc()).first()
        if latest_gps:
            lat = latest_gps.latitude
            lon = latest_gps.longitude

    alert = EmergencyAlert(
        farmer_id=current_user.id,
        device_id=device_id,
        alert_type="MANUAL_SOS",
        status="ACTIVE",
        message=f"CRITICAL SOS: Farmer {current_user.full_name} manually triggered an emergency alert!",
        latitude=lat,
        longitude=lon,
        created_at=datetime.utcnow()
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Broadcast immediately
    await ws_manager.broadcast({
        "type": "EMERGENCY_ALERT",
        "alert_type": "MANUAL_SOS",
        "farmer_name": current_user.full_name,
        "phone_number": current_user.phone_number,
        "message": alert.message,
        "latitude": lat,
        "longitude": lon,
        "timestamp": alert.created_at.isoformat()
    })

    profile = current_user.profile
    return EmergencyAlertResponse(
        id=alert.id,
        farmer_id=alert.farmer_id,
        farmer_name=current_user.full_name,
        farmer_phone=current_user.phone_number,
        emergency_contact_phone=profile.emergency_contact_phone if profile else None,
        device_id=alert.device_id,
        alert_type=alert.alert_type,
        status=alert.status,
        message=alert.message,
        latitude=alert.latitude,
        longitude=alert.longitude,
        created_at=alert.created_at
    )

@router.get("/active")
def get_active_alerts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(EmergencyAlert).filter(EmergencyAlert.status.in_(["ACTIVE", "DISPATCHED"]))
    if user.role != "ADMIN":
        query = query.filter(EmergencyAlert.farmer_id == user.id)
    alerts = query.order_by(EmergencyAlert.created_at.desc()).all()

    result = []
    for a in alerts:
        farmer = db.query(User).filter(User.id == a.farmer_id).first() if a.farmer_id else None
        prof = farmer.profile if farmer else None
        result.append({
            "id": a.id,
            "farmer_name": farmer.full_name if farmer else "Farmer",
            "farmer_phone": farmer.phone_number if farmer else "-",
            "emergency_contact_name": prof.emergency_contact_name if prof else "-",
            "emergency_contact_phone": prof.emergency_contact_phone if prof else "-",
            "alert_type": a.alert_type,
            "status": a.status,
            "message": a.message,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "image_url": None,
            "created_at": a.created_at
        })
    return result

@router.get("/history")
def get_alerts_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(EmergencyAlert)
    if user.role != "ADMIN":
        query = query.filter(EmergencyAlert.farmer_id == user.id)
    alerts = query.order_by(EmergencyAlert.created_at.desc()).limit(100).all()

    result = []
    for a in alerts:
        farmer = db.query(User).filter(User.id == a.farmer_id).first() if a.farmer_id else None
        prof = farmer.profile if farmer else None
        result.append({
            "id": a.id,
            "farmer_name": farmer.full_name if farmer else "Farmer",
            "farmer_phone": farmer.phone_number if farmer else "-",
            "emergency_contact_phone": prof.emergency_contact_phone if prof else "-",
            "alert_type": a.alert_type,
            "status": a.status,
            "message": a.message,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "image_url": None,
            "resolved_at": a.resolved_at,
            "created_at": a.created_at
        })
    return result

@router.put("/{alert_id}/resolve")
def resolve_emergency_alert(
    alert_id: int,
    payload: EmergencyAlertUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = payload.status
    if payload.status == "RESOLVED":
        alert.resolved_at = datetime.utcnow()
    elif payload.status == "DISPATCHED":
        alert.dispatched_at = datetime.utcnow()

    db.commit()
    return {"message": f"Alert {alert_id} status updated to {payload.status}"}
