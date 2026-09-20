import sqlite3
import os
import shutil
import hashlib
import json
from datetime import datetime

ORIG_DB = os.path.join(os.path.dirname(__file__), "uuds_training.db")

# In Vercel / serverless environments, root is read-only so use /tmp for writable SQLite
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    DB_PATH = "/tmp/uuds_training.db"
    if not os.path.exists(DB_PATH) and os.path.exists(ORIG_DB):
        try:
            shutil.copy2(ORIG_DB, DB_PATH)
        except Exception as e:
            print("DB copy error:", e)
else:
    DB_PATH = ORIG_DB

def get_db():
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

    # Insert default admin user if not exists
    cursor.execute("SELECT id FROM users WHERE username = 'admin'")
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO users (username, password_hash, role, full_name, email)
        VALUES ('admin', ?, 'admin', 'System Administrator', 'admin@uuds.ae')
        """, (hash_password("admin123"),))

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
