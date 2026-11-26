import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.database import get_db
from app.models.user import User, AuditLog
from app.models.device import Device, FarmerDevice, DeviceHeartbeat
from app.schemas.device import DeviceCreate, DeviceAssignRequest, DeviceHeartbeatRequest
from app.security.auth_bearer import get_current_admin, get_current_user
from app.security.device_auth import get_authenticated_device
from app.security.password import hash_password
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.post("", status_code=status.HTTP_201_CREATED)
def register_device(payload: DeviceCreate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.device_uid == payload.device_uid).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device with this UID already registered")

    api_key = f"agri_dev_{secrets.token_urlsafe(32)}"
    device = Device(
        device_uid=payload.device_uid,
        device_name=payload.device_name,
        device_type=payload.device_type,
        api_key=api_key,
        status="OFFLINE",
        created_at=datetime.utcnow()
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return {
        "id": device.id,
        "device_uid": device.device_uid,
        "device_name": device.device_name,
        "api_key": device.api_key,
        "status": device.status,
        "created_at": device.created_at
    }

@router.get("")
def list_devices(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "ADMIN":
        devices = db.query(Device).all()
    else:
        # Farmer only sees their own assigned device
        assignments = db.query(FarmerDevice).filter(
            FarmerDevice.farmer_id == user.id,
            FarmerDevice.is_active == True
        ).all()
        dev_ids = [a.device_id for a in assignments]
        devices = db.query(Device).filter(Device.id.in_(dev_ids)).all() if dev_ids else []

    result = []
    now = datetime.utcnow()
    for d in devices:
        # Determine live status: LIVE, STALE, DEVICE OFFLINE
        status_calc = "OFFLINE"
        if d.last_heartbeat:
            diff = (now - d.last_heartbeat).total_seconds()
            if diff < 60:
                status_calc = "ONLINE"
            elif diff < 180:
                status_calc = "STALE"
            else:
                status_calc = "OFFLINE"

        assigned_farmer = None
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.device_id == d.id,
            FarmerDevice.is_active == True
        ).first()
        if assignment:
            f = db.query(User).filter(User.id == assignment.farmer_id).first()
            if f:
                assigned_farmer = {"id": f.id, "name": f.full_name, "phone": f.phone_number}

        result.append({
            "id": d.id,
            "device_uid": d.device_uid,
            "device_name": d.device_name,
            "device_type": d.device_type,
            "status": status_calc,
            "last_heartbeat": d.last_heartbeat,
            "firmware_version": d.firmware_version,
            "assigned_farmer": assigned_farmer,
            "created_at": d.created_at
        })
    return result

@router.post("/assign")
def assign_device_to_farmer(payload: DeviceAssignRequest, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    farmer = db.query(User).filter(User.id == payload.farmer_id, User.role == "FARMER").first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    device = db.query(Device).filter(Device.id == payload.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Deactivate existing assignments for this device or farmer
    db.query(FarmerDevice).filter(
        (FarmerDevice.device_id == device.id) | (FarmerDevice.farmer_id == farmer.id)
    ).update({"is_active": False})

    new_assignment = FarmerDevice(
        farmer_id=farmer.id,
        device_id=device.id,
        is_active=True,
        assigned_at=datetime.utcnow()
    )
    db.add(new_assignment)
    db.commit()

    return {"message": f"Device {device.device_uid} successfully assigned to {farmer.full_name}"}

@router.get("/{device_id}/config")
def get_device_configuration(
    device_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetches device configuration, hardware metadata, assigned farmer, and required header templates."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    now = datetime.utcnow()
    status_calc = "OFFLINE"
    if device.last_heartbeat:
        diff = (now - device.last_heartbeat).total_seconds()
        if diff < 60:
            status_calc = "ONLINE"
        elif diff < 180:
            status_calc = "STALE"
        else:
            status_calc = "OFFLINE"

    assigned_farmer = None
    assignment = db.query(FarmerDevice).filter(
        FarmerDevice.device_id == device.id,
        FarmerDevice.is_active == True
    ).first()
    if assignment:
        farmer = db.query(User).filter(User.id == assignment.farmer_id).first()
        if farmer:
            assigned_farmer = {
                "id": farmer.id,
                "name": farmer.full_name,
                "phone": farmer.phone_number,
                "village": farmer.village,
                "district": farmer.district
            }

    api_key_masked = (
        device.api_key[:8] + "•" * 16 + device.api_key[-4:]
        if len(device.api_key) > 12
        else device.api_key
    )

    return {
        "id": device.id,
        "device_uid": device.device_uid,
        "device_name": device.device_name,
        "device_type": device.device_type,
        "status": status_calc,
        "firmware_version": device.firmware_version,
        "last_heartbeat": device.last_heartbeat,
        "assigned_farmer": assigned_farmer,
        "api_key_masked": api_key_masked,
        "has_secret_key": bool(device.secret_hash),
        "required_headers": {
            "X-Device-API-Key": device.api_key,
            "X-Device-Key": "<DEVICE_SECRET_KEY>",
            "X-Device-Id": str(device.id),
            "X-Device-UID": device.device_uid,
        }
    }

@router.post("/{device_id}/rotate-credentials")
def rotate_device_credentials(
    device_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Securely rotates Device API Key and Secret Key for an ESP8266 node.
    - Generates new cryptographic API Key and Secret Key.
    - Hashes Secret Key using bcrypt before storing in MySQL.
    - Returns plain credentials ONLY ONCE in this response to the authenticated admin.
    """
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    new_api_key = f"agri_dev_{secrets.token_urlsafe(24)}"
    new_secret_key = f"agri_sec_{secrets.token_urlsafe(32)}"

    device.api_key = new_api_key
    device.secret_hash = hash_password(new_secret_key)
    device.updated_at = datetime.utcnow()

    audit = AuditLog(
        user_id=admin.id,
        action="DEVICE_CREDENTIALS_ROTATED",
        resource="devices",
        details=f"Admin {admin.email} generated new credentials for device {device.device_uid} (#{device.id})"
    )
    db.add(audit)
    db.commit()
    db.refresh(device)

    assigned_farmer = None
    assignment = db.query(FarmerDevice).filter(
        FarmerDevice.device_id == device.id,
        FarmerDevice.is_active == True
    ).first()
    if assignment:
        farmer = db.query(User).filter(User.id == assignment.farmer_id).first()
        if farmer:
            assigned_farmer = {
                "id": farmer.id,
                "name": farmer.full_name,
                "phone": farmer.phone_number
            }

    return {
        "message": "Device credentials successfully rotated and securely hashed in database.",
        "id": device.id,
        "device_uid": device.device_uid,
        "device_name": device.device_name,
        "device_type": device.device_type,
        "status": device.status,
        "api_key": new_api_key,
        "secret_key": new_secret_key,
        "assigned_farmer": assigned_farmer,
        "warning": "Copy and store these credentials immediately. The secret key is hashed in MySQL and cannot be viewed again.",
        "required_headers": {
            "X-Device-API-Key": new_api_key,
            "X-Device-Key": new_secret_key,
            "X-Device-Id": str(device.id),
            "X-Device-UID": device.device_uid
        }
    }

@router.post("/heartbeat")
async def device_heartbeat(
    payload: Optional[DeviceHeartbeatRequest] = None,
    device: Device = Depends(get_authenticated_device),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    device.last_heartbeat = now
    device.status = "ONLINE"

    batt = payload.battery_level if payload else None
    sig = payload.signal_strength if payload else None

    hb = DeviceHeartbeat(
        device_id=device.id,
        timestamp=now,
        last_seen=now,
        battery_level=batt,
        signal_strength=sig,
        status="ONLINE",
        connection_status="ONLINE"
    )
    db.add(hb)
    db.commit()
    db.refresh(device)

    # Broadcast heartbeat to dashboards
    await ws_manager.broadcast({
        "type": "DEVICE_HEARTBEAT",
        "device_uid": device.device_uid,
        "device_id": device.id,
        "status": "ONLINE",
        "battery_level": batt,
        "signal_strength": sig,
        "timestamp": now.isoformat()
    })

    return {
        "status": "ACK",
        "device_uid": device.device_uid,
        "device_id": device.id,
        "device_status": "ONLINE",
        "server_time": now.isoformat()
    }
