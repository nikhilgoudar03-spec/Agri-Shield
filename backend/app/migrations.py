import logging
from sqlalchemy import text, inspect
from app.security.password import hash_password

logger = logging.getLogger("agrishield.migrations")

def run_database_migrations(engine):
    """
    Safely migrates the database schema:
    1. Ensures all tables from Base.metadata exist.
    2. Adds missing columns (email, password_hash, village, district, etc.) to existing 'users' table.
    3. Seeds or updates the default System Administrator.
    """
    logger.info("Checking and applying database migrations...")

    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "users" in tables:
            existing_columns = {col["name"] for col in inspector.get_columns("users")}
            
            columns_to_add = {
                "email": "VARCHAR(120)",
                "password_hash": "VARCHAR(255)",
                "village": "VARCHAR(100)",
                "district": "VARCHAR(100)",
                "emergency_contact_name": "VARCHAR(100)",
                "emergency_contact_mobile": "VARCHAR(20)",
            }

            for col_name, col_type in columns_to_add.items():
                if col_name not in existing_columns:
                    logger.info(f"Migrating 'users' table: adding missing column '{col_name}' ({col_type})...")
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        logger.info(f"Successfully added column '{col_name}'.")
                    except Exception as err:
                        logger.warning(f"Note on adding column '{col_name}': {err}")

        # Migrate sensor_readings table
        if "sensor_readings" in tables:
            sr_cols = {col["name"] for col in inspector.get_columns("sensor_readings")}
            sr_to_add = {
                "humidity_percent": "FLOAT",
                "sensor_status": "VARCHAR(30) DEFAULT 'VALID'",
                "recorded_at": "DATETIME",
                "received_at": "DATETIME",
                "mq135_raw": "INTEGER",
            }
            for col_name, col_type in sr_to_add.items():
                if col_name not in sr_cols:
                    logger.info(f"Migrating 'sensor_readings' table: adding missing column '{col_name}'...")
                    try:
                        conn.execute(text(f"ALTER TABLE sensor_readings ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        logger.info(f"Successfully added column '{col_name}' to sensor_readings.")
                    except Exception as err:
                        logger.warning(f"Note on adding column '{col_name}' to sensor_readings: {err}")

        # Migrate gps_locations table
        if "gps_locations" in tables:
            gps_cols = {col["name"] for col in inspector.get_columns("gps_locations")}
            gps_to_add = {
                "satellites": "INTEGER",
                "gps_fix": "BOOLEAN DEFAULT 0",
                "altitude_m": "FLOAT",
                "recorded_at": "DATETIME",
                "received_at": "DATETIME",
            }
            for col_name, col_type in gps_to_add.items():
                if col_name not in gps_cols:
                    logger.info(f"Migrating 'gps_locations' table: adding missing column '{col_name}'...")
                    try:
                        conn.execute(text(f"ALTER TABLE gps_locations ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception as err:
                        logger.warning(f"Note on adding column '{col_name}' to gps_locations: {err}")

        # Migrate device_heartbeats table
        if "device_heartbeats" in tables:
            dh_cols = {col["name"] for col in inspector.get_columns("device_heartbeats")}
            dh_to_add = {
                "last_seen": "DATETIME",
                "connection_status": "VARCHAR(20) DEFAULT 'ONLINE'",
            }
            for col_name, col_type in dh_to_add.items():
                if col_name not in dh_cols:
                    logger.info(f"Migrating 'device_heartbeats' table: adding missing column '{col_name}'...")
                    try:
                        conn.execute(text(f"ALTER TABLE device_heartbeats ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception as err:
                        logger.warning(f"Note on adding column '{col_name}' to device_heartbeats: {err}")

        # Migrate devices table
        if "devices" in tables:
            dev_cols = {col["name"] for col in inspector.get_columns("devices")}
            dev_to_add = {
                "secret_hash": "VARCHAR(255)",
            }
            for col_name, col_type in dev_to_add.items():
                if col_name not in dev_cols:
                    logger.info(f"Migrating 'devices' table: adding missing column '{col_name}'...")
                    try:
                        conn.execute(text(f"ALTER TABLE devices ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        logger.info(f"Successfully added column '{col_name}' to devices.")
                    except Exception as err:
                        logger.warning(f"Note on adding column '{col_name}' to devices: {err}")

        # Ensure default administrator exists and has valid email + password
        try:
            # Check if admin user exists by email
            res = conn.execute(text("SELECT id, role, password_hash FROM users WHERE email = 'admin@agrishield.com'")).fetchone()
            default_admin_hash = hash_password("Admin@123")

            if res:
                admin_id, role, pwd_hash = res[0], res[1], res[2]
                if role != "ADMIN" or not pwd_hash:
                    logger.info("Updating existing admin account with valid role and password hash...")
                    conn.execute(text(
                        "UPDATE users SET role = 'ADMIN', password_hash = :hash WHERE id = :uid"
                    ), {"hash": default_admin_hash, "uid": admin_id})
                    conn.commit()
            else:
                # Check if old admin by phone (+919876543210) exists
                old_admin = conn.execute(text("SELECT id FROM users WHERE phone_number = '+919876543210'")).fetchone()
                if old_admin:
                    logger.info("Migrating existing phone-based admin user to email 'admin@agrishield.com'...")
                    conn.execute(text(
                        "UPDATE users SET email = 'admin@agrishield.com', role = 'ADMIN', password_hash = :hash WHERE id = :uid"
                    ), {"hash": default_admin_hash, "uid": old_admin[0]})
                    conn.commit()
                else:
                    logger.info("Inserting initial system administrator 'admin@agrishield.com'...")
                    conn.execute(text(
                        "INSERT INTO users (email, password_hash, full_name, role, is_active, phone_number, firebase_uid) "
                        "VALUES ('admin@agrishield.com', :hash, 'Chief Safety Officer (Admin)', 'ADMIN', 1, '+919876543210', 'admin_uid_001')"
                    ), {"hash": default_admin_hash})
                    conn.commit()
        except Exception as e:
            logger.error(f"Error seeding/verifying default admin during migration: {e}")

    logger.info("Database migration check completed.")
