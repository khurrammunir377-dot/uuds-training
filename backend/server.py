import os
import sys

# Ensure backend directory is in sys.path so modules import from any working directory
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import json
import sqlite3
import threading
import time
from datetime import datetime, date, timedelta
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Query, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel

from database import get_db, init_db, hash_password, verify_password
from importer import calculate_status, import_all_data
from email_service import send_compliance_email, send_manager_email, test_smtp_connection, get_compliance_summary, generate_compliance_html

# Initialize DB on startup
init_db()

app = FastAPI(title="UUDS Aviation Training Compliance Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api")
@app.get("/api/")
def api_root(request: Request):
    return {
        "status": "online",
        "service": "UUDS Aviation Training Compliance API",
        "scope_path": request.scope.get("path"),
        "original_path": request.scope.get("original_path"),
        "raw_path": str(request.scope.get("raw_path")),
        "headers": dict(request.headers),
    }

# ----------------- JWT / Simple Token Auth -----------------
TOKENS = {} # token -> {user_id, username, role, full_name, email}

def create_token(user: dict) -> str:
    token = f"uuds_token_{user['id']}_{int(time.time())}_{os.urandom(8).hex()}"
    TOKENS[token] = user
    return token

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        # For development / desktop convenience, allow fallback to admin if no header, or check bearer
        return {"id": 1, "username": "admin", "role": "admin", "full_name": "System Administrator", "email": "admin@uuds.ae"}
    token = authorization.replace("Bearer ", "").strip()
    if token in TOKENS:
        return TOKENS[token]
    # Default fallback
    return {"id": 1, "username": "admin", "role": "admin", "full_name": "System Administrator", "email": "admin@uuds.ae"}

def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")
    return user

def log_audit(username: str, action: str, entity_type: str = None, entity_id: int = None, details: str = None):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO audit_logs (username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
        """, (username, action, entity_type, entity_id, details))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error logging audit: {e}")

# ----------------- Models -----------------
class LoginRequest(BaseModel):
    username: str
    password: str

class RecordUpdateRequest(BaseModel):
    completion_date: Optional[str] = None
    expiry_date: Optional[str] = None
    notes: Optional[str] = None

class EmployeeCreateRequest(BaseModel):
    uuds_no: str
    contingent_id: Optional[str] = ""
    full_name: str
    position: Optional[str] = ""
    team: Optional[str] = ""
    mobile_no: Optional[str] = ""
    dxb_start_date: Optional[str] = None
    employment_status: Optional[str] = "Active"
    notes: Optional[str] = ""

class CourseCreateRequest(BaseModel):
    code: str
    name: str
    category: Optional[str] = "Mandatory"
    validity_months: Optional[int] = 24
    description: Optional[str] = ""
    assign_to_active: Optional[bool] = True

class SettingsUpdateRequest(BaseModel):
    settings: dict

class SendEmailRequest(BaseModel):
    override_recipient: Optional[str] = None

class ManagerEmailRequest(BaseModel):
    to_email: str
    cc_email: Optional[str] = ""
    subject: str
    message_body: str
    include_report: Optional[bool] = True

# ----------------- Auth Routes -----------------
@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (req.username.strip(),))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    user_dict = {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
        "email": user["email"]
    }
    token = create_token(user_dict)
    log_audit(user["username"], "User logged in", "user", user["id"])
    return {"token": token, "user": user_dict}

@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}

# ----------------- Dashboard Routes -----------------
@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    # Active employee compliance totals
    cursor.execute("""
    SELECT 
        COUNT(CASE WHEN r.status = 'Valid' THEN 1 END) as valid_count,
        COUNT(CASE WHEN r.status = 'Due Within 30 Days' THEN 1 END) as due_soon_count,
        COUNT(CASE WHEN r.status = 'Overdue' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN r.status = 'Not Recorded' THEN 1 END) as not_recorded_count,
        COUNT(*) as total_records
    FROM training_records r
    JOIN employees e ON e.id = r.employee_id
    WHERE e.employment_status = 'Active'
    """)
    record_stats = dict(cursor.fetchone())
    
    # Total active employees
    cursor.execute("SELECT COUNT(*) FROM employees WHERE employment_status = 'Active'")
    active_employees_count = cursor.fetchone()[0]
    
    # Employee count by status
    cursor.execute("SELECT employment_status, COUNT(*) as cnt FROM employees GROUP BY employment_status")
    status_counts = {row["employment_status"]: row["cnt"] for row in cursor.fetchall()}
    
    # Team compliance breakdown for active staff
    cursor.execute("""
    SELECT 
        coalesce(nullif(e.team, ''), 'Unassigned') as team_name,
        COUNT(DISTINCT e.id) as employee_count,
        COUNT(CASE WHEN r.status = 'Valid' THEN 1 END) as valid,
        COUNT(CASE WHEN r.status = 'Due Within 30 Days' THEN 1 END) as due_soon,
        COUNT(CASE WHEN r.status = 'Overdue' THEN 1 END) as overdue,
        COUNT(CASE WHEN r.status = 'Not Recorded' THEN 1 END) as not_recorded,
        COUNT(*) as total
    FROM employees e
    LEFT JOIN training_records r ON r.employee_id = e.id
    WHERE e.employment_status = 'Active'
    GROUP BY team_name
    ORDER BY employee_count DESC
    """)
    teams = []
    for row in cursor.fetchall():
        t = dict(row)
        t["compliance_rate"] = round((t["valid"] / t["total"] * 100), 1) if t["total"] > 0 else 0
        teams.append(t)
        
    # Top overdue courses
    cursor.execute("""
    SELECT 
        c.code, c.name, COUNT(*) as overdue_count
    FROM training_records r
    JOIN courses c ON c.id = r.course_id
    JOIN employees e ON e.id = r.employee_id
    WHERE e.employment_status = 'Active' AND r.status = 'Overdue'
    GROUP BY c.id
    ORDER BY overdue_count DESC
    LIMIT 6
    """)
    top_overdue_courses = [dict(row) for row in cursor.fetchall()]
    
    # Top urgent employee compliance alerts (due or overdue)
    cursor.execute("""
    SELECT 
        e.id as employee_id, e.uuds_no, e.full_name, e.team, e.position, e.mobile_no,
        c.code as course_code, c.name as course_name,
        r.expiry_date, r.status
    FROM training_records r
    JOIN employees e ON e.id = r.employee_id
    JOIN courses c ON c.id = r.course_id
    WHERE e.employment_status = 'Active' AND r.status IN ('Overdue', 'Due Within 30 Days')
    ORDER BY CASE WHEN r.status = 'Overdue' THEN 0 ELSE 1 END, r.expiry_date ASC
    LIMIT 10
    """)
    urgent_records = [dict(row) for row in cursor.fetchall()]
    
    total_recs = record_stats.get("total_records", 0)
    valid_recs = record_stats.get("valid_count", 0)
    compliance_rate = round((valid_recs / total_recs * 100), 1) if total_recs > 0 else 0
    
    conn.close()
    return {
        "active_employees_count": active_employees_count,
        "compliance_rate": compliance_rate,
        "records": record_stats,
        "employee_statuses": status_counts,
        "teams": teams,
        "top_overdue_courses": top_overdue_courses,
        "urgent_records": urgent_records
    }

# ----------------- Employees Routes -----------------
@app.get("/api/employees")
def list_employees(
    status: Optional[str] = "Active",
    team: Optional[str] = None,
    search: Optional[str] = None,
    compliance_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 25
):
    conn = get_db()
    cursor = conn.cursor()
    
    query = """
    SELECT 
        e.*,
        COUNT(CASE WHEN r.status = 'Valid' THEN 1 END) as valid_count,
        COUNT(CASE WHEN r.status = 'Due Within 30 Days' THEN 1 END) as due_soon_count,
        COUNT(CASE WHEN r.status = 'Overdue' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN r.status = 'Not Recorded' THEN 1 END) as not_recorded_count,
        COUNT(r.id) as total_courses
    FROM employees e
    LEFT JOIN training_records r ON r.employee_id = e.id
    WHERE 1=1
    """
    params = []
    
    if status and status != "All":
        query += " AND e.employment_status = ?"
        params.append(status)
        
    if team and team != "All":
        query += " AND e.team = ?"
        params.append(team)
        
    if search:
        s = f"%{search.strip()}%"
        query += " AND (e.uuds_no LIKE ? OR e.full_name LIKE ? OR e.contingent_id LIKE ? OR e.mobile_no LIKE ? OR e.position LIKE ?)"
        params.extend([s, s, s, s, s])
        
    query += " GROUP BY e.id"
    
    if compliance_filter == "Overdue":
        query += " HAVING overdue_count > 0"
    elif compliance_filter == "Due Soon":
        query += " HAVING due_soon_count > 0"
    elif compliance_filter == "Valid":
        query += " HAVING overdue_count = 0 AND due_soon_count = 0 AND not_recorded_count = 0 AND total_courses > 0"
    elif compliance_filter == "Not Recorded":
        query += " HAVING not_recorded_count > 0"
        
    # Count total
    count_wrapper = f"SELECT COUNT(*) FROM ({query})"
    cursor.execute(count_wrapper, params)
    total_count = cursor.fetchone()[0]
    
    # Sorting & pagination
    query += " ORDER BY e.full_name ASC LIMIT ? OFFSET ?"
    params.extend([page_size, (page - 1) * page_size])
    
    cursor.execute(query, params)
    employees = [dict(row) for row in cursor.fetchall()]
    
    # Format compliance percentage for each employee
    for emp in employees:
        tot = emp["total_courses"]
        emp["compliance_rate"] = round((emp["valid_count"] / tot * 100), 1) if tot > 0 else 0
        if emp["overdue_count"] > 0:
            emp["badge_status"] = "Overdue"
        elif emp["due_soon_count"] > 0:
            emp["badge_status"] = "Due Within 30 Days"
        elif emp["not_recorded_count"] > 0:
            emp["badge_status"] = "Not Recorded"
        else:
            emp["badge_status"] = "Valid"
            
    # Get counts for all tabs
    cursor.execute("SELECT employment_status, COUNT(*) as cnt FROM employees GROUP BY employment_status")
    tab_counts = {row["employment_status"]: row["cnt"] for row in cursor.fetchall()}
    cursor.execute("SELECT COUNT(*) FROM employees")
    tab_counts["All"] = cursor.fetchone()[0]
    
    conn.close()
    return {
        "items": employees,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if page_size > 0 else 1,
        "status_counts": tab_counts
    }

@app.get("/api/employees/{emp_id}")
def get_employee_profile(emp_id: int):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM employees WHERE id = ?", (emp_id,))
    emp = cursor.fetchone()
    if not emp:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")
        
    emp_dict = dict(emp)
    
    # Get all training records joined with course information
    cursor.execute("""
    SELECT 
        r.id as record_id, c.id as course_id, r.completion_date, r.expiry_date, r.status, r.notes, r.updated_at, r.updated_by,
        c.code as course_code, c.name as course_name, c.category as course_category, c.validity_months, c.description as course_desc
    FROM courses c
    LEFT JOIN training_records r ON r.course_id = c.id AND r.employee_id = ?
    ORDER BY c.code ASC
    """, (emp_id,))
    courses = []
    for row in cursor.fetchall():
        r = dict(row)
        # Calculate days remaining or overdue
        if r.get("expiry_date"):
            try:
                exp = datetime.strptime(r["expiry_date"], "%Y-%m-%d").date()
                diff = (exp - date.today()).days
                r["days_remaining"] = diff
            except Exception:
                r["days_remaining"] = None
        else:
            r["days_remaining"] = None
            
        if not r.get("record_id"):
            r["status"] = "Not Recorded"
        courses.append(r)
        
    # Calculate stats
    valid_count = sum(1 for c in courses if c["status"] == "Valid")
    due_count = sum(1 for c in courses if c["status"] == "Due Within 30 Days")
    overdue_count = sum(1 for c in courses if c["status"] == "Overdue")
    not_recorded = sum(1 for c in courses if c["status"] == "Not Recorded")
    total = len(courses)
    
    emp_dict["stats"] = {
        "valid": valid_count,
        "due_soon": due_count,
        "overdue": overdue_count,
        "not_recorded": not_recorded,
        "total": total,
        "compliance_rate": round((valid_count / total * 100), 1) if total > 0 else 0
    }
    emp_dict["courses"] = courses
    
    # Recent audit trail for this employee
    cursor.execute("""
    SELECT * FROM audit_logs 
    WHERE entity_type = 'employee' AND entity_id = ? 
    ORDER BY created_at DESC LIMIT 15
    """, (emp_id,))
    emp_dict["audit_logs"] = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return emp_dict

@app.post("/api/employees")
def create_employee(req: EmployeeCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    uuds = req.uuds_no.strip().upper()
    cursor.execute("SELECT id FROM employees WHERE uuds_no = ?", (uuds,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"Employee with UUDS No '{uuds}' already exists")
        
    cursor.execute("""
    INSERT INTO employees (uuds_no, contingent_id, full_name, position, team, mobile_no, dxb_start_date, employment_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (uuds, req.contingent_id, req.full_name, req.position, req.team, req.mobile_no, req.dxb_start_date, req.employment_status, req.notes))
    emp_id = cursor.lastrowid
    
    # Auto-assign all courses as 'Not Recorded'
    cursor.execute("SELECT id FROM courses")
    for c_row in cursor.fetchall():
        cursor.execute("""
        INSERT INTO training_records (employee_id, course_id, status, notes, updated_by)
        VALUES (?, ?, 'Not Recorded', 'Newly assigned employee', ?)
        """, (emp_id, c_row["id"], user["username"]))
        
    conn.commit()
    conn.close()
    
    log_audit(user["username"], f"Created employee {uuds} - {req.full_name}", "employee", emp_id)
    return {"message": "Employee created successfully", "id": emp_id}

@app.put("/api/employees/{emp_id}")
def update_employee(emp_id: int, req: EmployeeCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, uuds_no FROM employees WHERE id = ?", (emp_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")
        
    cursor.execute("""
    UPDATE employees SET
        uuds_no = ?,
        contingent_id = ?,
        full_name = ?,
        position = ?,
        team = ?,
        mobile_no = ?,
        dxb_start_date = ?,
        employment_status = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (req.uuds_no.strip().upper(), req.contingent_id, req.full_name, req.position, req.team, req.mobile_no, req.dxb_start_date, req.employment_status, req.notes, emp_id))
    
    conn.commit()
    conn.close()
    
    log_audit(user["username"], f"Updated employee {req.uuds_no} ({req.full_name})", "employee", emp_id)
    return {"message": "Employee updated successfully"}

@app.delete("/api/employees/{emp_id}")
def delete_employee(emp_id: int, user: dict = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT uuds_no, full_name FROM employees WHERE id = ?", (emp_id,))
    emp = cursor.fetchone()
    if not emp:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")
        
    cursor.execute("DELETE FROM training_records WHERE employee_id = ?", (emp_id,))
    cursor.execute("DELETE FROM employees WHERE id = ?", (emp_id,))
    conn.commit()
    conn.close()
    
    log_audit(user["username"], f"Deleted employee {emp['uuds_no']} ({emp['full_name']})", "employee", emp_id)
    return {"message": "Employee deleted successfully"}

# ----------------- Training Records Routes -----------------
@app.put("/api/records/{record_id}")
def update_training_record(record_id: int, req: RecordUpdateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT r.*, e.uuds_no, e.full_name, c.code as course_code, c.name as course_name 
    FROM training_records r
    JOIN employees e ON e.id = r.employee_id
    JOIN courses c ON c.id = r.course_id
    WHERE r.id = ?
    """, (record_id,))
    record = cursor.fetchone()
    if not record:
        conn.close()
        raise HTTPException(status_code=404, detail="Training record not found")
        
    expiry_date_str = req.expiry_date.strip() if req.expiry_date else None
    completion_date_str = req.completion_date.strip() if req.completion_date else None
    notes_str = req.notes.strip() if req.notes else None
    
    # Calculate status
    status_calc = calculate_status(expiry_date_str, notes_str)
    
    cursor.execute("""
    UPDATE training_records SET
        completion_date = ?,
        expiry_date = ?,
        status = ?,
        notes = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (completion_date_str, expiry_date_str, status_calc, notes_str, user["username"], record_id))
    
    conn.commit()
    conn.close()
    
    audit_msg = f"Updated course {record['course_code']} for {record['uuds_no']}: Expiry={expiry_date_str}, Status={status_calc}"
    log_audit(user["username"], audit_msg, "employee", record["employee_id"], notes_str)
    
    return {
        "message": "Training record updated successfully",
        "status": status_calc,
        "expiry_date": expiry_date_str
    }

@app.post("/api/employees/{emp_id}/courses/{course_id}")
def update_or_create_employee_course(emp_id: int, course_id: int, req: RecordUpdateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    expiry_date_str = req.expiry_date.strip() if req.expiry_date else None
    completion_date_str = req.completion_date.strip() if req.completion_date else None
    notes_str = req.notes.strip() if req.notes else None
    status_calc = calculate_status(expiry_date_str, notes_str)
    
    cursor.execute("""
    INSERT INTO training_records (employee_id, course_id, completion_date, expiry_date, status, notes, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id, course_id) DO UPDATE SET
        completion_date = excluded.completion_date,
        expiry_date = excluded.expiry_date,
        status = excluded.status,
        notes = excluded.notes,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    """, (emp_id, course_id, completion_date_str, expiry_date_str, status_calc, notes_str, user["username"]))
    
    conn.commit()
    conn.close()
    
    log_audit(user["username"], f"Course {course_id} date updated for employee {emp_id}", "employee", emp_id)
    return {"message": "Record saved successfully", "status": status_calc}

# ----------------- Courses Catalogue Routes -----------------
@app.get("/api/courses")
def list_courses():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT 
        c.*,
        COUNT(CASE WHEN r.status = 'Valid' AND e.employment_status = 'Active' THEN 1 END) as valid_count,
        COUNT(CASE WHEN r.status = 'Due Within 30 Days' AND e.employment_status = 'Active' THEN 1 END) as due_soon_count,
        COUNT(CASE WHEN r.status = 'Overdue' AND e.employment_status = 'Active' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN r.status = 'Not Recorded' AND e.employment_status = 'Active' THEN 1 END) as not_recorded_count,
        COUNT(CASE WHEN e.employment_status = 'Active' THEN 1 END) as total_active_assigned
    FROM courses c
    LEFT JOIN training_records r ON r.course_id = c.id
    LEFT JOIN employees e ON e.id = r.employee_id
    GROUP BY c.id
    ORDER BY c.code ASC
    """)
    courses = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return courses

@app.post("/api/courses")
def create_course(req: CourseCreateRequest, user: dict = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    
    code = req.code.strip().upper()
    cursor.execute("SELECT id FROM courses WHERE code = ?", (code,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"Course with code '{code}' already exists")
        
    cursor.execute("""
    INSERT INTO courses (code, name, category, validity_months, description)
    VALUES (?, ?, ?, ?, ?)
    """, (code, req.name.strip(), req.category, req.validity_months, req.description))
    course_id = cursor.lastrowid
    
    if req.assign_to_active:
        cursor.execute("SELECT id FROM employees WHERE employment_status = 'Active'")
        active_ids = [row["id"] for row in cursor.fetchall()]
        for emp_id in active_ids:
            cursor.execute("""
            INSERT OR IGNORE INTO training_records (employee_id, course_id, status, notes, updated_by)
            VALUES (?, ?, 'Not Recorded', 'New catalogue course', ?)
            """, (emp_id, course_id, user["username"]))
            
    conn.commit()
    conn.close()
    
    log_audit(user["username"], f"Created course {code} ({req.name})", "course", course_id)
    return {"message": "Course created successfully", "id": course_id}

@app.put("/api/courses/{course_id}")
def update_course(course_id: int, req: CourseCreateRequest, user: dict = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM courses WHERE id = ?", (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")
        
    cursor.execute("""
    UPDATE courses SET
        code = ?,
        name = ?,
        category = ?,
        validity_months = ?,
        description = ?
    WHERE id = ?
    """, (req.code.strip().upper(), req.name.strip(), req.category, req.validity_months, req.description, course_id))
    
    conn.commit()
    conn.close()
    
    log_audit(user["username"], f"Updated course {req.code}", "course", course_id)
    return {"message": "Course updated successfully"}

@app.delete("/api/courses/{course_id}")
def delete_course(course_id: int, user: dict = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT code, name FROM courses WHERE id = ?", (course_id,))
    c = cursor.fetchone()
    if not c:
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")
        
    cursor.execute("DELETE FROM training_records WHERE course_id = ?", (course_id,))
    cursor.execute("DELETE FROM courses WHERE id = ?", (course_id,))
    
    conn.commit()
    conn.close()
    
    log_audit(user["username"], f"Deleted course {c['code']} ({c['name']})", "course", course_id)
    return {"message": "Course deleted successfully"}

# ----------------- Reminders & Email Center Routes -----------------
@app.get("/api/reminders/list")
def list_reminders(
    filter_type: Optional[str] = "All", # 'All', 'Overdue', 'Due Soon'
    team: Optional[str] = None,
    search: Optional[str] = None
):
    conn = get_db()
    cursor = conn.cursor()
    
    status_filter = ("Overdue", "Due Within 30 Days")
    if filter_type == "Overdue":
        status_filter = ("Overdue",)
    elif filter_type == "Due Soon":
        status_filter = ("Due Within 30 Days",)
        
    placeholders = ",".join("?" for _ in status_filter)
    query = f"""
    SELECT 
        r.id as record_id, r.expiry_date, r.status, r.notes,
        e.id as employee_id, e.uuds_no, e.contingent_id, e.full_name, e.position, e.team, e.mobile_no,
        c.id as course_id, c.code as course_code, c.name as course_name, c.validity_months
    FROM training_records r
    JOIN employees e ON e.id = r.employee_id
    JOIN courses c ON c.id = r.course_id
    WHERE e.employment_status = 'Active' AND r.status IN ({placeholders})
    """
    params = list(status_filter)
    
    if team and team != "All":
        query += " AND e.team = ?"
        params.append(team)
        
    if search:
        s = f"%{search.strip()}%"
        query += " AND (e.uuds_no LIKE ? OR e.full_name LIKE ? OR c.code LIKE ? OR c.name LIKE ? OR e.mobile_no LIKE ?)"
        params.extend([s, s, s, s, s])
        
    query += " ORDER BY CASE WHEN r.status = 'Overdue' THEN 0 ELSE 1 END, r.expiry_date ASC, e.full_name ASC"
    
    cursor.execute(query, params)
    items = []
    for row in cursor.fetchall():
        item = dict(row)
        if item.get("expiry_date"):
            try:
                exp = datetime.strptime(item["expiry_date"], "%Y-%m-%d").date()
                item["days_diff"] = (exp - date.today()).days
            except Exception:
                item["days_diff"] = None
        else:
            item["days_diff"] = None
        items.append(item)
        
    conn.close()
    return items

@app.post("/api/reminders/send-now")
def trigger_email_reminder(req: SendEmailRequest = None, user: dict = Depends(get_current_user)):
    override_rec = req.override_recipient if req else None
    res = send_compliance_email(manual_trigger=True, override_recipient=override_rec)
    log_audit(user["username"], f"Triggered compliance email to {res['recipient']} ({res['status']})", "email", res.get("log_id"))
    return res

@app.post("/api/reminders/send-manager-email")
def trigger_manager_email(req: ManagerEmailRequest, user: dict = Depends(get_current_user)):
    if not req.to_email or not req.to_email.strip():
        raise HTTPException(status_code=400, detail="Recipient 'to_email' is required")
    res = send_manager_email(
        to_email=req.to_email.strip(),
        cc_emails=req.cc_email.strip() if req.cc_email else "",
        subject=req.subject.strip(),
        message_body=req.message_body,
        include_report=req.include_report if req.include_report is not None else True
    )
    log_audit(user["username"], f"Sent manager notice to {res['recipient']}", "email", res.get("log_id"))
    return res

@app.get("/api/reminders/logs")
def get_email_logs(limit: int = 50):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, recipient, subject, status, summary, error_message, created_at 
    FROM email_logs 
    ORDER BY created_at DESC 
    LIMIT ?
    """, (limit,))
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return logs

@app.get("/api/reminders/logs/{log_id}/preview")
def get_email_preview(log_id: int):
    # Regenerate preview or load log details
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM email_logs WHERE id = ?", (log_id,))
    log_row = cursor.fetchone()
    conn.close()
    
    if not log_row:
        raise HTTPException(status_code=404, detail="Email log not found")
        
    # Return HTML preview generated with current summary
    overdue_items, due_soon_items, stats = get_compliance_summary()
    html = generate_compliance_html(overdue_items, due_soon_items, stats)
    return HTMLResponse(content=html)

# ----------------- Settings Routes -----------------
@app.get("/api/settings")
def get_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value, description FROM settings")
    settings_list = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {s["key"]: s["value"] for s in settings_list}

@app.put("/api/settings")
def update_settings(req: SettingsUpdateRequest, user: dict = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    
    for k, v in req.settings.items():
        cursor.execute("""
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """, (k, str(v)))
        
    conn.commit()
    conn.close()
    
    log_audit(user["username"], "Updated application settings", "settings")
    return {"message": "Settings updated successfully"}

@app.post("/api/settings/test-smtp")
def test_smtp(user: dict = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    s = {row["key"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    
    host = s.get("smtp_host", "smtp.office365.com")
    port = s.get("smtp_port", 587)
    usr = s.get("smtp_user", "")
    pwd = s.get("smtp_password", "")
    tls = s.get("smtp_tls", "true").lower() == "true"
    
    res = test_smtp_connection(host, port, usr, pwd, tls)
    return res

@app.post("/api/system/re-import")
def reimport_excel_data(user: dict = Depends(require_admin)):
    try:
        import_all_data()
        log_audit(user["username"], "Re-imported all Excel data and mobile numbers", "system")
        return {"message": "Data re-imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- Background Weekly Scheduler -----------------
def background_scheduler():
    """Checks once every 10 minutes if weekly email should be dispatched."""
    last_sent_day = None
    while True:
        try:
            now = datetime.now()
            # Default scheduled day is Monday at 08:00 AM
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM settings WHERE key IN ('reminder_day', 'reminder_time', 'smtp_enabled')")
            s = {row["key"]: row["value"] for row in cursor.fetchall()}
            conn.close()
            
            target_day = s.get("reminder_day", "Monday")
            target_time_str = s.get("reminder_time", "08:00")
            enabled = s.get("smtp_enabled", "true").lower() == "true"
            
            current_day_name = now.strftime("%A")
            current_time_str = now.strftime("%H:%M")
            
            # Send once per target day at or after target time
            if enabled and current_day_name == target_day and last_sent_day != now.date():
                if current_time_str >= target_time_str:
                    print(f"[{now}] Background Scheduler: Dispatching weekly compliance reminder email...")
                    send_compliance_email(manual_trigger=False)
                    last_sent_day = now.date()
        except Exception as e:
            print(f"Background scheduler error: {e}")
            
        time.sleep(600) # Check every 10 mins

# Start background scheduler thread only in persistent server mode (not serverless lambda)
if not os.environ.get("VERCEL") and not os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    scheduler_thread = threading.Thread(target=background_scheduler, daemon=True)
    scheduler_thread.start()

# ----------------- Frontend Static Files Serving (Desktop / Local server mode) -----------------
if not os.environ.get("VERCEL"):
    frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

    if os.path.exists(frontend_dist):
        app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # If API call not found
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
            
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            # Check if requesting specific file in dist
            file_path = os.path.join(frontend_dist, full_path)
            if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
                return FileResponse(file_path)
            return FileResponse(index_file)
        return HTMLResponse("<h1>UUDS Training Compliance Tracker</h1><p>Frontend is currently building. Please wait...</p>")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
