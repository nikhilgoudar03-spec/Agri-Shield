import logging
from datetime import datetime
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.device import Device, FarmerDevice, DeviceHeartbeat
from app.models.telemetry import GPSLocation
from app.models.user import User
from app.schemas.telemetry import GPSPayload, GPSLocationResponse
from app.security.auth_bearer import get_current_user
from app.security.device_auth import verify_device_credentials
from app.websocket.manager import ws_manager

logger = logging.getLogger("agrishield.gps")
router = APIRouter(prefix="/gps", tags=["GPS Tracking"])

def resolve_device(
    payload: GPSPayload,
    x_device_api_key: Optional[str],
    x_device_key: Optional[str],
    x_device_id: Optional[str],
    x_device_uid: Optional[str],
    db: Session
) -> Device:
    api_key = x_device_api_key or x_device_key or payload.api_key
    dev_id_or_uid = x_device_id or x_device_uid or payload.device_id

    device = verify_device_credentials(dev_id_or_uid, api_key, db)
    if not device and api_key:
        device = db.query(Device).filter(Device.api_key == api_key).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device credentials. GPS transmission rejected.",
        )
    return device

@router.post("")
async def receive_gps(
    payload: GPSPayload,
    x_device_api_key: Optional[str] = Header(None, alias="X-Device-API-Key"),
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key"),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    x_device_uid: Optional[str] = Header(None, alias="X-Device-UID"),
    db: Session = Depends(get_db)
):
    """
    Receives real NEO-6M GPS coordinates from physical ESP32.
    Strictly rejects invalid or fake coordinates.
    Never stores coordinates unless a valid GPS satellite fix is achieved.
    """
    device = resolve_device(payload, x_device_api_key, x_device_key, x_device_id, x_device_uid, db)
    now = datetime.utcnow()

    # Update heartbeat
    device.last_heartbeat = now
    device.status = "ONLINE"
    heartbeat = DeviceHeartbeat(
        device_id=device.id,
        timestamp=now,
        last_seen=now,
        connection_status="ONLINE"
    )
    db.add(heartbeat)

    has_fix = bool(payload.gps_fix)
    lat = payload.latitude
    lon = payload.longitude

    # Validate coordinate validity
    if lat is None or lon is None or (lat == 0.0 and lon == 0.0) or not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        has_fix = False
        lat = None
        lon = None

    gps_rec = GPSLocation(
        device_id=device.id,
        latitude=lat,
        longitude=lon,
        satellites=payload.satellites,
        gps_fix=has_fix,
        altitude_m=payload.altitude_m,
        altitude=payload.altitude_m,
        speed=payload.speed,
        recorded_at=payload.recorded_at,
        received_at=now,
        timestamp=now,
        is_valid=has_fix
    )
    db.add(gps_rec)
    db.commit()
    db.refresh(gps_rec)

    # Broadcast GPS update over WebSocket
    broadcast_data = {
        "type": "GPS_UPDATE",
        "device_uid": device.device_uid,
        "device_id": device.id,
        "latitude": lat,
        "longitude": lon,
        "satellites": payload.satellites,
        "gps_fix": has_fix,
        "altitude_m": payload.altitude_m,
        "speed": payload.speed,
        "recorded_at": payload.recorded_at.isoformat() if payload.recorded_at else None,
        "received_at": now.isoformat(),
        "timestamp": now.isoformat()
    }
    await ws_manager.broadcast(broadcast_data)

    return {
        "status": "RECORDED",
        "gps_id": gps_rec.id,
        "device_uid": device.device_uid,
        "gps_fix": has_fix,
        "satellites": payload.satellites,
        "received_at": now.isoformat()
    }

@router.get("/latest", response_model=GPSLocationResponse)
def get_latest_gps_location(
    device_id: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns latest GPS location for authorized farmer or admin.
    Returns 404 with 'GPS FIX NOT AVAILABLE' if no valid satellite lock exists.
    """
    target_device_id = device_id

    if user.role != "ADMIN":
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.farmer_id == user.id,
            FarmerDevice.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="NO DATA: No active hardware device assigned to your profile."
            )
        if target_device_id and target_device_id != assignment.device_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view GPS data for this device."
            )
        target_device_id = assignment.device_id

    query = db.query(GPSLocation)
    if target_device_id:
        query = query.filter(GPSLocation.device_id == target_device_id)

    # Fetch latest entry where GPS fix is valid
    gps = query.filter(GPSLocation.gps_fix == True, GPSLocation.latitude.isnot(None))\
               .order_by(GPSLocation.received_at.desc(), GPSLocation.timestamp.desc()).first()

    if not gps:
        # Check if any GPS ping exists at all (e.g. searching for satellite fix)
        recent_ping = query.order_by(GPSLocation.received_at.desc(), GPSLocation.timestamp.desc()).first()
        if recent_ping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="GPS FIX NOT AVAILABLE: NEO-6M receiver is searching for satellite lock."
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NO DATA: No GPS module data received from physical hardware."
        )

    return gps

@router.get("/history")
def get_gps_history(
    device_id: Optional[int] = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns chronological GPS trail breadcrumbs for interactive mapping.
    """
    target_device_id = device_id

    if user.role != "ADMIN":
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.farmer_id == user.id,
            FarmerDevice.is_active == True
        ).first()
        if not assignment:
            return []
        if target_device_id and target_device_id != assignment.device_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view GPS trail for this device."
            )
        target_device_id = assignment.device_id

    query = db.query(GPSLocation).filter(
        GPSLocation.gps_fix == True,
        GPSLocation.latitude.isnot(None),
        GPSLocation.longitude.isnot(None)
    )
    if target_device_id:
        query = query.filter(GPSLocation.device_id == target_device_id)

    trail = query.order_by(GPSLocation.received_at.desc(), GPSLocation.timestamp.desc()).limit(limit).all()

    return [
        {
            "id": pt.id,
            "latitude": pt.latitude,
            "longitude": pt.longitude,
            "altitude_m": pt.altitude_m or pt.altitude,
            "speed": pt.speed,
            "satellites": pt.satellites,
            "timestamp": (pt.received_at or pt.timestamp).strftime("%H:%M:%S") if (pt.received_at or pt.timestamp) else "--:--",
            "received_at": pt.received_at.isoformat() if pt.received_at else None
        }
        for pt in reversed(trail)
    ]

# Compatibility endpoints for existing dashboard components
@router.get("/latest/{device_id}", response_model=GPSLocationResponse)
def get_latest_gps(
    device_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_latest_gps_location(device_id=device_id, user=user, db=db)

@router.get("/trail/{device_id}")
def get_gps_trail(
    device_id: int,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_gps_history(device_id=device_id, limit=limit, user=user, db=db)

@router.get("/all-active")
def get_all_active_gps(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin map view of all active field devices with live GPS fix."""
    devices = db.query(Device).all()
    results = []
    for d in devices:
        gps = db.query(GPSLocation).filter(
            GPSLocation.device_id == d.id,
            GPSLocation.gps_fix == True,
            GPSLocation.latitude.isnot(None)
        ).order_by(GPSLocation.received_at.desc(), GPSLocation.timestamp.desc()).first()

        farmer_name = "Unassigned"
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.device_id == d.id,
            FarmerDevice.is_active == True
        ).first()
        if assignment:
            f = db.query(User).filter(User.id == assignment.farmer_id).first()
            if f:
                farmer_name = f.full_name

        if gps:
            results.append({
                "device_id": d.id,
                "device_uid": d.device_uid,
                "farmer_name": farmer_name,
                "status": d.status,
                "latitude": gps.latitude,
                "longitude": gps.longitude,
                "satellites": gps.satellites,
                "timestamp": gps.received_at or gps.timestamp
            })
    return results
