from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.device import Device, FarmerDevice
from app.models.telemetry import FallEvent, EmergencyAlert
from app.models.user import User
from app.schemas.telemetry import FallEventCreate, FallEventResponse
from app.security.auth_bearer import get_current_user
from app.security.device_auth import get_authenticated_device
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/fall-detection", tags=["Fall Detection"])

@router.post("/event", response_model=FallEventResponse)
async def report_fall_event(
    payload: FallEventCreate,
    device: Device = Depends(get_authenticated_device),
    db: Session = Depends(get_db)
):
    assignment = db.query(FarmerDevice).filter(
        FarmerDevice.device_id == device.id,
        FarmerDevice.is_active == True
    ).first()
    farmer_id = assignment.farmer_id if assignment else None
    farmer = db.query(User).filter(User.id == farmer_id).first() if farmer_id else None

    fall_event = FallEvent(
        device_id=device.id,
        farmer_id=farmer_id,
        accel_x=payload.accel_x,
        accel_y=payload.accel_y,
        accel_z=payload.accel_z,
        gyro_x=payload.gyro_x,
        gyro_y=payload.gyro_y,
        gyro_z=payload.gyro_z,
        event_type=payload.event_type,
        confirmed=False,
        timestamp=datetime.utcnow()
    )
    db.add(fall_event)

    # Automatically generate an EmergencyAlert
    alert = EmergencyAlert(
        farmer_id=farmer_id,
        device_id=device.id,
        alert_type=payload.event_type,
        status="ACTIVE",
        message=f"Urgent: {payload.event_type} reported by device {device.device_uid}",
        created_at=datetime.utcnow()
    )
    db.add(alert)
    db.commit()
    db.refresh(fall_event)

    await ws_manager.broadcast({
        "type": "EMERGENCY_ALERT",
        "alert_type": payload.event_type,
        "device_uid": device.device_uid,
        "farmer_name": farmer.full_name if farmer else "Farmer",
        "timestamp": fall_event.timestamp.isoformat()
    })

    return FallEventResponse(
        id=fall_event.id,
        device_id=fall_event.device_id,
        farmer_id=fall_event.farmer_id,
        farmer_name=farmer.full_name if farmer else None,
        event_type=fall_event.event_type,
        confirmed=fall_event.confirmed,
        timestamp=fall_event.timestamp
    )

@router.get("/device/{device_id}")
def get_device_fall_events(
    device_id: int,
    limit: int = 30,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = db.query(FallEvent).filter(
        FallEvent.device_id == device_id
    ).order_by(FallEvent.timestamp.desc()).limit(limit).all()

    result = []
    for ev in events:
        farmer = db.query(User).filter(User.id == ev.farmer_id).first() if ev.farmer_id else None
        result.append({
            "id": ev.id,
            "device_id": ev.device_id,
            "farmer_name": farmer.full_name if farmer else "Unassigned",
            "accel_x": ev.accel_x,
            "accel_y": ev.accel_y,
            "accel_z": ev.accel_z,
            "event_type": ev.event_type,
            "confirmed": ev.confirmed,
            "timestamp": ev.timestamp
        })
    return result
