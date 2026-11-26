import logging
from datetime import datetime, timedelta
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.device import Device, FarmerDevice, DeviceHeartbeat
from app.models.telemetry import SensorReading, GPSLocation, FallEvent, EmergencyAlert
from app.models.user import User
from app.schemas.telemetry import TelemetryPayload, SensorReadingResponse
from app.security.auth_bearer import get_current_user
from app.security.device_auth import verify_device_credentials
from app.websocket.manager import ws_manager

logger = logging.getLogger("agrishield.telemetry")
router = APIRouter(prefix="/telemetry", tags=["Telemetry & Sensors"])

def resolve_device(
    payload: TelemetryPayload,
    x_device_api_key: Optional[str],
    x_device_key: Optional[str],
    x_device_id: Optional[str],
    x_device_uid: Optional[str],
    db: Session
) -> Device:
    api_key = x_device_api_key or x_device_key or payload.api_key
    dev_id_or_uid = x_device_id or x_device_uid or payload.device_id

    device = verify_device_credentials(dev_id_or_uid, api_key, db)
    if not device:
        # If no explicit dev_id_or_uid, attempt to find device by api_key alone
        if api_key:
            device = db.query(Device).filter(Device.api_key == api_key).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device credentials. Device authentication rejected.",
        )
    return device

@router.post("")
async def receive_telemetry(
    payload: TelemetryPayload,
    request: Request,
    x_device_api_key: Optional[str] = Header(None, alias="X-Device-API-Key"),
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key"),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    x_device_uid: Optional[str] = Header(None, alias="X-Device-UID"),
    db: Session = Depends(get_db)
):
    """
    Receives real telemetry from physical ESP32 DHT11 and sensor nodes.
    Validates sensor validity. Never substitutes fake zero readings.
    """
    device = resolve_device(payload, x_device_api_key, x_device_key, x_device_id, x_device_uid, db)
    now = datetime.utcnow()

    # Update device heartbeat and status
    device.last_heartbeat = now
    device.status = "ONLINE"

    heartbeat = DeviceHeartbeat(
        device_id=device.id,
        timestamp=now,
        last_seen=now,
        connection_status="ONLINE"
    )
    db.add(heartbeat)

    # 1. Process DHT11 Temperature & Relative Humidity
    sensor_status = payload.sensor_status or "VALID"
    temp_c = payload.temperature_c
    hum_pct = payload.humidity_percent if payload.humidity_percent is not None else payload.humidity_pct

    # Sensor Error or Disconnection Detection
    if sensor_status in ("SENSOR_ERROR", "DISCONNECTED") or temp_c is None or hum_pct is None:
        if sensor_status == "VALID":
            sensor_status = "SENSOR_ERROR" if (temp_c is None and hum_pct is None) else "PARTIAL"
        # Never invent default or zero values
        if temp_c is not None and not (-40.0 <= temp_c <= 85.0):
            temp_c = None
            sensor_status = "SENSOR_ERROR"
        if hum_pct is not None and not (0.0 <= hum_pct <= 100.0):
            hum_pct = None
            sensor_status = "SENSOR_ERROR"
    else:
        # Validate range for DHT11 (0 to 50 C, 20% to 90% RH nominally, allowing margin)
        if not (-20.0 <= temp_c <= 70.0):
            temp_c = None
            sensor_status = "SENSOR_ERROR"
        if not (0.0 <= hum_pct <= 100.0):
            hum_pct = None
            sensor_status = "SENSOR_ERROR"

    # 2. Evaluate MQ-135 if provided
    mq_status = "NORMAL"
    if payload.mq135_ppm is not None:
        if payload.mq135_ppm > 450:
            mq_status = "POOR_AIR_QUALITY"
        elif payload.mq135_ppm > 250:
            mq_status = "MODERATE_GAS_CHANGE"

    # 3. Create sensor reading record
    sensor_rec = SensorReading(
        device_id=device.id,
        temperature_c=temp_c,
        humidity_percent=hum_pct,
        humidity_pct=hum_pct,
        sensor_status=sensor_status,
        mq135_raw=payload.mq135_raw,
        mq135_ppm=payload.mq135_ppm,
        mq135_status=mq_status,
        recorded_at=payload.recorded_at,
        received_at=now,
        timestamp=now,
        data_freshness="LIVE" if sensor_status == "VALID" else sensor_status
    )
    db.add(sensor_rec)

    # 4. Process embedded GPS if provided
    if payload.gps_valid and payload.latitude is not None and payload.longitude is not None:
        if not (payload.latitude == 0.0 and payload.longitude == 0.0):
            gps_rec = GPSLocation(
                device_id=device.id,
                latitude=payload.latitude,
                longitude=payload.longitude,
                satellites=payload.satellites,
                gps_fix=True,
                altitude_m=payload.altitude_m or payload.altitude,
                altitude=payload.altitude_m or payload.altitude,
                speed=payload.speed,
                recorded_at=payload.recorded_at,
                received_at=now,
                timestamp=now,
                is_valid=True
            )
            db.add(gps_rec)

    # 5. Check possible fall detection from MPU6050
    possible_fall = False
    if payload.accel_x is not None and payload.accel_y is not None and payload.accel_z is not None:
        mag = (payload.accel_x**2 + payload.accel_y**2 + payload.accel_z**2)**0.5
        if mag > 26.0 or mag < 3.0:
            possible_fall = True
            assignment = db.query(FarmerDevice).filter(
                FarmerDevice.device_id == device.id,
                FarmerDevice.is_active == True
            ).first()
            farmer_id = assignment.farmer_id if assignment else None

            fall_ev = FallEvent(
                device_id=device.id,
                farmer_id=farmer_id,
                accel_x=payload.accel_x,
                accel_y=payload.accel_y,
                accel_z=payload.accel_z,
                gyro_x=payload.gyro_x,
                gyro_y=payload.gyro_y,
                gyro_z=payload.gyro_z,
                event_type="POSSIBLE_FALL",
                confirmed=False,
                timestamp=now
            )
            db.add(fall_ev)

            alert = EmergencyAlert(
                farmer_id=farmer_id,
                device_id=device.id,
                alert_type="POSSIBLE_FALL",
                status="ACTIVE",
                message=f"Possible farmer fall detected on device {device.device_uid} at {now.strftime('%H:%M:%S')}",
                latitude=payload.latitude,
                longitude=payload.longitude,
                created_at=now
            )
            db.add(alert)

    db.commit()
    db.refresh(sensor_rec)

    # Broadcast live reading via WebSocket
    broadcast_data = {
        "type": "SENSOR_TELEMETRY",
        "device_uid": device.device_uid,
        "device_id": device.id,
        "temperature_c": temp_c,
        "humidity_percent": hum_pct,
        "sensor_status": sensor_status,
        "mq135_raw": payload.mq135_raw,
        "mq135_ppm": payload.mq135_ppm,
        "mq135_status": mq_status,
        "data_freshness": "LIVE" if sensor_status == "VALID" else sensor_status,
        "recorded_at": payload.recorded_at.isoformat() if payload.recorded_at else None,
        "received_at": now.isoformat(),
        "timestamp": now.isoformat(),
        "possible_fall": possible_fall
    }
    await ws_manager.broadcast(broadcast_data)

    # Also broadcast device heartbeat so device management table immediately reflects ONLINE status
    await ws_manager.broadcast({
        "type": "DEVICE_HEARTBEAT",
        "device_uid": device.device_uid,
        "device_id": device.id,
        "status": "ONLINE",
        "timestamp": now.isoformat()
    })

    return {
        "status": "RECORDED",
        "reading_id": sensor_rec.id,
        "device_uid": device.device_uid,
        "sensor_status": sensor_status,
        "mq135_raw": sensor_rec.mq135_raw,
        "received_at": now.isoformat()
    }

@router.get("/latest", response_model=SensorReadingResponse)
def get_latest_telemetry(
    device_id: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns latest physical telemetry reading.
    Farmers only access their assigned hardware. Admins can view any device.
    """
    target_device_id = device_id

    if user.role != "ADMIN":
        # Farmer: resolve assigned device
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.farmer_id == user.id,
            FarmerDevice.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="NO DATA: No active hardware device assigned to your farmer profile."
            )
        if target_device_id and target_device_id != assignment.device_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view telemetry for this device."
            )
        target_device_id = assignment.device_id

    query = db.query(SensorReading)
    if target_device_id:
        query = query.filter(SensorReading.device_id == target_device_id)

    reading = query.order_by(SensorReading.received_at.desc(), SensorReading.timestamp.desc()).first()
    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NO DATA: No sensor readings received from physical hardware yet."
        )

    # Compute freshness
    now = datetime.utcnow()
    ref_time = reading.received_at or reading.timestamp or now
    diff_seconds = (now - ref_time).total_seconds()

    if reading.sensor_status in ("SENSOR_ERROR", "DISCONNECTED"):
        freshness = "SENSOR ERROR"
    elif diff_seconds < 30:
        freshness = "LIVE"
    elif diff_seconds < 120:
        freshness = "STALE"
    else:
        freshness = "OFFLINE"

    reading.data_freshness = freshness
    return reading

@router.get("/history")
def get_telemetry_history(
    device_id: Optional[int] = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns historical telemetry points for Recharts charts.
    Farmers only access their assigned device.
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
                detail="Access denied: You are not authorized to view telemetry for this device."
            )
        target_device_id = assignment.device_id

    query = db.query(SensorReading)
    if target_device_id:
        query = query.filter(SensorReading.device_id == target_device_id)

    readings = query.order_by(SensorReading.received_at.desc(), SensorReading.timestamp.desc()).limit(limit).all()

    return [
        {
            "id": r.id,
            "device_id": r.device_id,
            "timestamp": (r.received_at or r.timestamp).strftime("%H:%M:%S") if (r.received_at or r.timestamp) else "--:--",
            "temperature_c": r.temperature_c,
            "humidity_percent": r.humidity_percent or r.humidity_pct,
            "humidity_pct": r.humidity_pct or r.humidity_percent,
            "sensor_status": r.sensor_status,
            "mq135_raw": r.mq135_raw,
            "mq135_ppm": r.mq135_ppm,
            "mq135_status": r.mq135_status,
            "recorded_at": r.recorded_at.isoformat() if r.recorded_at else None,
            "received_at": r.received_at.isoformat() if r.received_at else None,
        }
        for r in reversed(readings)
    ]

# Compatibility endpoints for existing frontend components
@router.get("/live/{device_id}", response_model=SensorReadingResponse)
def get_live_sensor_reading(
    device_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_latest_telemetry(device_id=device_id, user=user, db=db)

@router.get("/history/{device_id}")
def get_sensor_history(
    device_id: int,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_telemetry_history(device_id=device_id, limit=limit, user=user, db=db)
