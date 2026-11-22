import sqlite3
import os
import shutil
import hashlib
import json
from datetime import datetime

# Turso Cloud Configuration
TURSO_DATABASE_URL = os.environ.get("TURSO_DATABASE_URL", "https://uuds-training-khurram.aws-ap-south-1.turso.io").strip()
TURSO_AUTH_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTUzNDMzODcsImlkIjoiMDFhMjAyY2QtZDEwMS03NDBhLTkzY2MtMWMyMzdkZjNmOGQxIiwia2lkIjoiR01OZzY4czd0MTkta1B3aUZOX21rQVktaEZ0cDRMaHJUaVl5R2VrSE9aNCIsInJpZCI6IjA2OTYzOGExLTdjMzMtNDY4ZC1hYTE2LTk0MWI5YTI1M2UwMSJ9.DswYCcnFtw_nKs9LN5-3rZfXoBURLZbz1sG8qzsBQ7ya7GfeYQAHP7V3dMUubMJuslAyQT3dsDnjUvqcIx8QDg").strip()

# Local SQLite Fallback
ORIG_DB = os.path.join(os.path.dirname(__file__), "uuds_training.db")
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    DB_PATH = "/tmp/uuds_training.db"
    if os.path.exists(ORIG_DB):
        if not os.path.exists(DB_PATH) or (os.path.getmtime(ORIG_DB) > os.path.getmtime(DB_PATH)):
            try:
                shutil.copy2(ORIG_DB, DB_PATH)
            except Exception as e:
                print("DB copy error:", e)
else:
    DB_PATH = ORIG_DB

class TursoRow(dict):
    """Dual-access row wrapper that works as dict, object with index access, and dict(row)."""
    def __init__(self, cols, vals):
        super().__init__(zip(cols, vals))
        self._vals = list(vals)

    def __getitem__(self, item):
        if isinstance(item, int):
            return self._vals[item]
        return super().__getitem__(item)

class TursoCursor:
    """Cursor wrapper for Turso LibSQL client matching standard SQLite cursor interface."""
    def __init__(self, client):
        self._client = client
        self._res = None
        self._rows = []
        self._idx = 0
        self.lastrowid = None
        self.rowcount = 0
        self.description = None

    def execute(self, sql, params=None):
        if params is None:
            params = []
        elif isinstance(params, (tuple, list)):
            params = list(params)
        elif isinstance(params, dict):
            params = list(params.values())
        else:
            params = [params]

        res = self._client.execute(sql, params)
        self._res = res
        self.lastrowid = getattr(res, "last_insert_rowid", None)
        self.rowcount = getattr(res, "rows_affected", 0)
        cols = getattr(res, "columns", ())
        if cols:
            self.description = [(c, None, None, None, None, None, None) for c in cols]
            raw_rows = getattr(res, "rows", [])
            self._rows = [TursoRow(cols, r) for r in raw_rows]
        else:
            self.description = None
            self._rows = []
        self._idx = 0
        return self

    def executemany(self, sql, seq_of_params):
        count = 0
        for params in seq_of_params:
            self.execute(sql, params)
            count += self.rowcount
        self.rowcount = count
        return self

    def fetchone(self):
        if self._idx < len(self._rows):
            row = self._rows[self._idx]
            self._idx += 1
            return row
        return None

    def fetchall(self):
        if self._idx < len(self._rows):
            rows = self._rows[self._idx:]
            self._idx = len(self._rows)
            return rows
        return []

    def close(self):
        pass

class TursoConnection:
    """Database connection for Turso cloud with automatic cleanup and transaction support."""
    def __init__(self, url, auth_token):
        clean_url = url
        if clean_url.startswith("libsql://"):
            clean_url = "https://" + clean_url[len("libsql://"):]
        import libsql_client
        self._client = libsql_client.create_client_sync(url=clean_url, auth_token=auth_token)

    def cursor(self):
        return TursoCursor(self._client)

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        try:
            self._client.close()
        except Exception:
            pass

def is_turso_enabled() -> bool:
    return bool(TURSO_DATABASE_URL and TURSO_AUTH_TOKEN)

def get_db():
    if is_turso_enabled():
        try:
            return TursoConnection(TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)
        except Exception as e:
            print(f"[Database] Warning: Turso connection failed ({e}). Falling back to local SQLite.")
    
    # Fallback: Local SQLite
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        if os.path.exists(ORIG_DB):
            if not os.path.exists(DB_PATH) or (os.path.getmtime(ORIG_DB) > os.path.getmtime(DB_PATH)):
                try:
                    shutil.copy2(ORIG_DB, DB_PATH)
                except Exception as e:
                    print("DB copy error:", e)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    # Use SHA-256 with fixed salt for simplicity and stability without external crypto dependencies
    salt = "uuds_aviation_training_compliance_tracker_2026"
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
        full_name TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Employees table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuds_no TEXT UNIQUE NOT NULL,
        contingent_id TEXT, -- EK Staff No
        full_name TEXT NOT NULL,
        position TEXT,
        team TEXT,
        mobile_no TEXT,
        dxb_start_date DATE,
        employment_status TEXT NOT NULL DEFAULT 'Active', -- Active, UN Paid Leave, DWC TX, Non Tec., RESIGN, Redundancy
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Courses table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL, -- e.g. OL-1237
        name TEXT NOT NULL,
        category TEXT DEFAULT 'Mandatory',
        validity_months INTEGER DEFAULT 24, -- default renewal cycle in months
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Training records table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS training_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        completion_date DATE,
        expiry_date DATE,
        status TEXT NOT NULL DEFAULT 'Not Recorded', -- 'Valid', 'Due Within 30 Days', 'Overdue', 'Not Recorded'
        notes TEXT,
        updated_by TEXT DEFAULT 'system',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE (employee_id, course_id)
    )
    """)

    # Audit log table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Email notification logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL, -- 'Sent', 'Failed', 'Simulated'
        summary TEXT,
        details TEXT, -- JSON summary of items sent
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        description TEXT
    )
    """)

    # Performance indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tr_emp_course ON training_records(employee_id, course_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tr_status ON training_records(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_emp_status_team ON employees(employment_status, team)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_emp_name ON employees(full_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_emp_uuds ON employees(uuds_no)")

    # Ensure default admin user exists with known password
    cursor.execute("SELECT id FROM users WHERE LOWER(username) = 'admin'")
    admin_row = cursor.fetchone()
    if not admin_row:
        cursor.execute("""
        INSERT INTO users (username, password_hash, role, full_name, email)
        VALUES ('admin', ?, 'admin', 'Khurram Munir Basra', 'khurram@uuds.ae')
        """, (hash_password("admin123"),))
    else:
        cursor.execute("""
        UPDATE users 
        SET password_hash = ?, full_name = 'Khurram Munir Basra', email = 'khurram@uuds.ae', role = 'admin' 
        WHERE id = ?
        """, (hash_password("admin123"), admin_row["id"]))

    # Insert or update user khurram
    cursor.execute("SELECT id FROM users WHERE LOWER(username) = 'khurram'")
    khurram_row = cursor.fetchone()
    if not khurram_row:
        cursor.execute("""
        INSERT INTO users (username, password_hash, role, full_name, email)
        VALUES ('khurram', ?, 'admin', 'Khurram Munir Basra', 'khurram@uuds.ae')
        """, (hash_password("admin123"),))
    else:
        cursor.execute("""
        UPDATE users 
        SET password_hash = ?, full_name = 'Khurram Munir Basra', email = 'khurram@uuds.ae', role = 'admin' 
        WHERE id = ?
        """, (hash_password("admin123"), khurram_row["id"]))

    # Insert default viewer user
    cursor.execute("SELECT id FROM users WHERE username = 'viewer'")
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO users (username, password_hash, role, full_name, email)
        VALUES ('viewer', ?, 'user', 'Compliance Viewer', 'viewer@uuds.ae')
        """, (hash_password("viewer123"),))

    # Insert user nsilva
    cursor.execute("SELECT id FROM users WHERE username = 'nsilva'")
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO users (username, password_hash, role, full_name, email)
        VALUES ('nsilva', ?, 'admin', 'Nalin Silva', 'nsilva@uuds.ae')
        """, (hash_password("abc@123"),))
    else:
        cursor.execute("""
        UPDATE users SET password_hash = ?, role = 'admin', full_name = 'Nalin Silva', email = 'nsilva@uuds.ae'
        WHERE username = 'nsilva'
        """, (hash_password("abc@123"),))

    # Insert user test
    cursor.execute("SELECT id FROM users WHERE username = 'test'")
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO users (username, password_hash, role, full_name, email)
        VALUES ('test', ?, 'admin', 'Test User', 'test@uuds.ae')
        """, (hash_password("Sha@#157"),))
    else:
        cursor.execute("""
        UPDATE users SET password_hash = ?, role = 'admin', full_name = 'Test User', email = 'test@uuds.ae'
        WHERE username = 'test'
        """, (hash_password("Sha@#157"),))

    # Default settings
    default_settings = [
        ("smtp_host", "smtp.office365.com", "Office 365 / Outlook SMTP server"),
        ("smtp_port", "587", "SMTP Port (typically 587 for STARTTLS)"),
        ("smtp_user", "nsilva@uuds.ae", "SMTP login email / sender address"),
        ("smtp_password", "", "SMTP password / App password"),
        ("smtp_from_name", "UUDS Training Compliance Tracker", "Sender display name"),
        ("smtp_tls", "true", "Enable STARTTLS (true/false)"),
        ("smtp_enabled", "true", "Enable email sending service"),
        ("reminder_recipient", "nsilva@uuds.ae", "Recipient email for weekly reminders"),
        ("reminder_frequency", "Weekly", "Scheduled reminder frequency"),
        ("reminder_day", "Monday", "Day of the week for reminder"),
        ("reminder_time", "08:00", "Time of day (24h) for reminder"),
        ("company_name", "UUDS AERO SERVICES LLC", "Company Name"),
        ("app_title", "UUDS Aviation Training Compliance Tracker", "Application Title"),
    ]

    for key, val, desc in default_settings:
        cursor.execute("""
        INSERT OR IGNORE INTO settings (key, value, description)
        VALUES (?, ?, ?)
        """, (key, val, desc))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
