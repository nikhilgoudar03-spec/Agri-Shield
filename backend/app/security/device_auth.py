from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import Optional, Union
from app.database import get_db
from app.models.device import Device
from app.security.password import verify_password

def get_authenticated_device(
    x_device_api_key: Optional[str] = Header(None, alias="X-Device-API-Key"),
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key"),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    x_device_uid: Optional[str] = Header(None, alias="X-Device-UID"),
    db: Session = Depends(get_db)
) -> Device:
    """
    Authenticates physical IoT devices (ESP8266 / ESP32) using standard headers:
      - X-Device-API-Key
      - X-Device-Key
      - X-Device-Id
      - X-Device-UID
    Accepts:
      1. X-Device-API-Key matching device.api_key
      2. X-Device-Key matching device.api_key OR device.secret_hash
      3. Validates X-Device-UID and/or X-Device-Id against the registered device.
    """
    api_key = (x_device_api_key or "").strip()
    device_key = (x_device_key or "").strip()
    dev_uid = (x_device_uid or "").strip()
    dev_id = (x_device_id or "").strip()

    device = None

    # 1. Search by UID first if provided
    if dev_uid:
        device = db.query(Device).filter(Device.device_uid == dev_uid).first()

    # 2. Search by numeric ID if provided and not resolved
    if not device and dev_id:
        if dev_id.isdigit():
            device = db.query(Device).filter((Device.id == int(dev_id)) | (Device.device_uid == dev_id)).first()
        else:
            device = db.query(Device).filter(Device.device_uid == dev_id).first()

    # 3. Search by API key if device not resolved by identifier
    if not device and api_key:
        device = db.query(Device).filter(Device.api_key == api_key).first()

    if not device and device_key and device_key != "<DEVICE_SECRET_KEY>":
        device = db.query(Device).filter(Device.api_key == device_key).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Device not found or credentials missing (X-Device-API-Key / X-Device-Key)",
        )

    # 4. Validate credentials
    auth_passed = False

    # Check X-Device-API-Key
    if api_key and api_key == device.api_key:
        auth_passed = True
    elif device_key and device_key == device.api_key:
        auth_passed = True

    # Check Secret Key if secret_hash is configured and candidate secret provided
    if not auth_passed and device.secret_hash:
        candidate_secret = device_key or api_key
        if candidate_secret and candidate_secret != "<DEVICE_SECRET_KEY>":
            if verify_password(candidate_secret, device.secret_hash):
                auth_passed = True

    # If both api_key and secret_hash are present on device and both headers sent, verify secret key if not matching API key
    if auth_passed and device.secret_hash and device_key and api_key:
        if device_key != device.api_key and device_key != "<DEVICE_SECRET_KEY>":
            # device_key is candidate secret key, verify hash
            if not verify_password(device_key, device.secret_hash):
                auth_passed = False

    if not auth_passed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Device credentials (API Key or Secret Key mismatch)",
        )

    # 5. Validate device identifier consistency
    if dev_id:
        if dev_id.isdigit() and device.id != int(dev_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Device ID {dev_id} mismatch with registered device ID {device.id}",
            )
        elif not dev_id.isdigit() and device.device_uid.lower() != dev_id.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Device identifier {dev_id} mismatch with registered device UID {device.device_uid}",
            )

    if dev_uid:
        if device.device_uid.lower() != dev_uid.lower() and (not dev_uid.isdigit() or device.id != int(dev_uid)):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Device UID {dev_uid} mismatch with registered device UID {device.device_uid}",
            )

    return device

def verify_device_credentials(
    device_id_or_uid: Optional[Union[str, int]],
    api_key: Optional[str],
    db: Session,
    secret_key: Optional[str] = None
) -> Optional[Device]:
    """Helper to authenticate device from either headers or JSON payload."""
    if not api_key and not secret_key:
        return None

    device = None
    if device_id_or_uid is not None:
        val = str(device_id_or_uid).strip()
        if val.isdigit():
            device = db.query(Device).filter((Device.id == int(val)) | (Device.device_uid == val)).first()
        else:
            device = db.query(Device).filter(Device.device_uid == val).first()

    if not device and api_key:
        device = db.query(Device).filter(Device.api_key == api_key).first()

    if not device and secret_key and secret_key != "<DEVICE_SECRET_KEY>":
        device = db.query(Device).filter(Device.api_key == secret_key).first()

    if not device:
        return None

    # Check api_key or secret_hash
    if api_key and device.api_key == api_key:
        return device

    if secret_key and secret_key != "<DEVICE_SECRET_KEY>":
        if secret_key == device.api_key:
            return device
        if device.secret_hash and verify_password(secret_key, device.secret_hash):
            return device

    return None
