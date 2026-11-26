import hashlib
import secrets
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Securely hash a password with bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)

def generate_reset_token() -> tuple[str, str]:
    """
    Generate a cryptographic URL-safe reset token and its SHA-256 hash.
    Returns (raw_token, token_hash).
    Only token_hash is stored in the database.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash

def hash_token(raw_token: str) -> str:
    """Hash an incoming reset token with SHA-256 for lookup."""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
