from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models.device import Device
from app.models.telemetry import SensorReading, FallEvent, EmergencyAlert
from app.models.user import User
from app.security.auth_bearer import get_current_user

router = APIRouter(prefix="/reports", tags=["Safety Reports"])

@router.get("/summary")
def get_safety_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    total_fall_events = db.query(FallEvent).filter(FallEvent.timestamp >= week_ago).count()
    total_emergencies = db.query(EmergencyAlert).filter(EmergencyAlert.created_at >= week_ago).count()
    resolved_emergencies = db.query(EmergencyAlert).filter(
        EmergencyAlert.created_at >= week_ago,
        EmergencyAlert.status == "RESOLVED"
    ).count()

    elevated_air_readings = db.query(SensorReading).filter(
        SensorReading.timestamp >= week_ago,
        SensorReading.mq135_status == "POOR_AIR_QUALITY"
    ).count()

    total_readings = db.query(SensorReading).filter(SensorReading.timestamp >= week_ago).count()
    safety_compliance_pct = round(
        ((total_readings - elevated_air_readings) / max(total_readings, 1)) * 100, 1
    ) if total_readings > 0 else 100.0

    return {
        "period": "Past 7 Days",
        "total_readings": total_readings,
        "possible_falls_detected": total_fall_events,
        "total_emergency_alerts": total_emergencies,
        "resolved_emergencies": resolved_emergencies,
        "elevated_gas_incidents": elevated_air_readings,
        "safety_compliance_rate": f"{safety_compliance_pct}%"
    }
