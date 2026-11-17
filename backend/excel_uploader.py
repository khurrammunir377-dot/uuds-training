"""
Universal Excel Upload & Intelligent Matching Engine
Supports:
1. Multi-sheet or single-sheet Training Schedule workbooks
2. Staff contact/roster workbooks (Staff ID, Contingent ID, Full Name, Mobile No, Team)
3. Partial/Custom matrix exports or ad-hoc column formats
4. Auto-matching of courses, employee numbers, names, and date fields
"""

import os
import re
import io
import openpyxl
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from database import get_db
from importer import parse_date_value, calculate_status, COURSES_CATALOG

COURSE_ALIAS_PATTERNS = [
    (r"easa.*145", "OL-1666"),
    (r"gcaa.*145", "OL-1667"),
    (r"rvsm", "OL-1073"),
    (r"(ek.*procedure|sop)", "OL-1707"),
    (r"(sms.*for.*all|safety.*management)", "OL-1237"),
    (r"fuel.*tank", "OL-1678"),
    (r"ewis", "OL-1653"),
    (r"(cyber.*sec|cyber)", "OL-1395"),
    (r"data.*privacy.*refresher", "OL-2208"),
    (r"data.*privacy", "OL-1732"),
    (r"(working.*height|height)", "OL-2550"),
    (r"fundamental.*human.*factor", "OL-723"),
    (r"(continuation.*human|continuation.*hf|continuation.*safety)", "OL-498"),
    (r"(induction|gen-?101)", "GEN-101"),
    (r"(competency|gen-?102)", "GEN-102"),
    (r"etops", "OL-1968"),
    (r"workshop", "OL-1965"),
    (r"airside.*safety", "OL-1090"),
    (r"(retrofit|falcon)", "OL-2669"),
    (r"communicable.*disease", "OL-2136"),
    (r"safety.*policy.*and.*you", "OL-2529"),
]

def normalize_text(text: Any) -> str:
    if text is None:
        return ""
    return str(text).strip()

def match_course_code(header: str, existing_codes: Dict[str, int]) -> Optional[str]:
    if not header:
        return None
    h = header.strip()
    
    # 1. Direct code check (e.g. "OL-1237" or "GEN-101")
    for code in existing_codes.keys():
        if re.search(r'\b' + re.escape(code) + r'\b', h, re.IGNORECASE):
            return code
            
    # 2. Known regex alias patterns
    h_lower = h.lower()
    for pattern, code in COURSE_ALIAS_PATTERNS:
        if re.search(pattern, h_lower):
            if code in existing_codes:
                return code

    # 3. Fuzzy match against course catalog names
    for c in COURSES_CATALOG:
        c_name = c["name"].lower()
        if c_name in h_lower or h_lower in c_name:
            if c["code"] in existing_codes:
                return c["code"]

    return None

def detect_column_roles(headers: List[str], course_map: Dict[str, int]) -> Dict[str, Any]:
    roles = {
        "col_uuds": None,
        "col_contingent": None,
        "col_name": None,
        "col_position": None,
        "col_team": None,
        "col_mobile": None,
        "col_start_date": None,
        "col_status": None,
        "course_columns": {} # col_index -> course_code
    }

    for idx, raw_h in enumerate(headers):
        if not raw_h:
            continue
        h = str(raw_h).strip().lower()

        # Check courses first
        matched_code = match_course_code(raw_h, course_map)
        if matched_code:
            roles["course_columns"][idx] = matched_code
            continue

        # Check Staff ID / UUDS No
        if re.search(r"(uuds.*no|staff.*id|uuds.*id|emp.*id|employee.*id)", h) and roles["col_uuds"] is None:
            roles["col_uuds"] = idx
            continue

        # Check Contingent ID / EK Staff No
        if re.search(r"(contingent|ek.*staff|ek.*no|badge)", h) and roles["col_contingent"] is None:
            roles["col_contingent"] = idx
            continue

        # Check Full Name
        if re.search(r"(full.*name|^name$|employee.*name|staff.*name)", h) and roles["col_name"] is None:
            roles["col_name"] = idx
            continue

        # Check Mobile / Contact
        if re.search(r"(contact|mobile|phone|whatsapp|cell)", h) and roles["col_mobile"] is None:
            roles["col_mobile"] = idx
            continue

        # Check Position / Designation
        if re.search(r"(position|designation|job.*title|role)", h) and roles["col_position"] is None:
            roles["col_position"] = idx
            continue

        # Check Team / Department
        if re.search(r"(team|dept|department|section)", h) and roles["col_team"] is None:
            roles["col_team"] = idx
            continue

        # Check Start / Joining Date
        if re.search(r"(start.*date|join.*date|dxb.*start|hire.*date)", h) and roles["col_start_date"] is None:
            roles["col_start_date"] = idx
            continue

        # Check Employment Status
        if re.search(r"(employment.*status|^status$|work.*status)", h) and roles["col_status"] is None:
            roles["col_status"] = idx
            continue

    return roles

def process_excel_upload(file_bytes: bytes, filename: str, username: str) -> Dict[str, Any]:
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    
    conn = get_db()
    cursor = conn.cursor()

    # Ensure all courses are registered
    for c in COURSES_CATALOG:
        cursor.execute("""
        INSERT OR IGNORE INTO courses (code, name, category, validity_months, description)
        VALUES (?, ?, ?, ?, ?)
        """, (c["code"], c["name"], c["category"], c["validity_months"], c["desc"]))
    conn.commit()

    cursor.execute("SELECT id, code FROM courses")
    course_map = {row["code"]: row["id"] for row in cursor.fetchall()}

    stats = {
        "sheets_processed": 0,
        "employees_created": 0,
        "employees_updated": 0,
        "records_updated": 0,
        "mobile_numbers_updated": 0,
        "matched_courses": set(),
        "unmatched_columns": []
    }

    sheet_status_map = {
        "training register": "Active",
        "active": "Active",
        "staff": "Active",
        "un paid leave": "UN Paid Leave",
        "unpaid leave": "UN Paid Leave",
        "dwc tx": "DWC TX",
        "non tec.": "Non Tec.",
        "non technical": "Non Tec.",
        "resign": "RESIGN",
        "resigned": "RESIGN",
        "redundancy": "Redundancy"
    }

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        if ws.max_row < 2:
            continue

        # Determine default status from sheet name
        clean_sheet_name = sheet_name.strip().lower()
        default_status = sheet_status_map.get(clean_sheet_name, "Active")

        # Scan first 5 rows to locate header row
        header_row_idx = 1
        headers = []
        best_match_count = 0

        for r_idx in range(1, min(6, ws.max_row + 1)):
            row_vals = [normalize_text(cell.value) for cell in ws[r_idx]]
            roles_test = detect_column_roles(row_vals, course_map)
            match_count = len(roles_test["course_columns"])
            if roles_test["col_uuds"] is not None:
                match_count += 2
            if roles_test["col_name"] is not None:
                match_count += 2
            if roles_test["col_mobile"] is not None:
                match_count += 2

            if match_count > best_match_count:
                best_match_count = match_count
                header_row_idx = r_idx
                headers = row_vals

        if not headers or best_match_count == 0:
            continue

        roles = detect_column_roles(headers, course_map)
        for c_code in roles["course_columns"].values():
            stats["matched_courses"].add(c_code)

        stats["sheets_processed"] += 1

        # Process data rows
        for row_idx in range(header_row_idx + 1, ws.max_row + 1):
            row_cells = ws[row_idx]
            
            # Extract basic info
            raw_uuds = normalize_text(row_cells[roles["col_uuds"]].value) if roles["col_uuds"] is not None and roles["col_uuds"] < len(row_cells) else ""
            raw_name = normalize_text(row_cells[roles["col_name"]].value) if roles["col_name"] is not None and roles["col_name"] < len(row_cells) else ""
            raw_contingent = normalize_text(row_cells[roles["col_contingent"]].value) if roles["col_contingent"] is not None and roles["col_contingent"] < len(row_cells) else ""
            raw_team = normalize_text(row_cells[roles["col_team"]].value) if roles["col_team"] is not None and roles["col_team"] < len(row_cells) else ""
            raw_pos = normalize_text(row_cells[roles["col_position"]].value) if roles["col_position"] is not None and roles["col_position"] < len(row_cells) else ""
            raw_mobile = normalize_text(row_cells[roles["col_mobile"]].value) if roles["col_mobile"] is not None and roles["col_mobile"] < len(row_cells) else ""
            raw_status = normalize_text(row_cells[roles["col_status"]].value) if roles["col_status"] is not None and roles["col_status"] < len(row_cells) else default_status

            # Search row for UUDS-xxx pattern if not found in specified column
            if not raw_uuds:
                for cell in row_cells[:12]:
                    val = normalize_text(cell.value)
                    if re.match(r"^UUDS-\d+", val, re.IGNORECASE):
                        raw_uuds = val
                        break

            # Skip completely empty row
            if not raw_uuds and not raw_name:
                continue

            clean_uuds = raw_uuds.upper().replace("_", "-") if raw_uuds else ""
            
            # If no UUDS ID, look up by full name or contingent ID
            emp_id = None
            if clean_uuds:
                cursor.execute("SELECT id, mobile_no FROM employees WHERE uuds_no = ?", (clean_uuds,))
                row = cursor.fetchone()
                if row:
                    emp_id = row["id"]
            
            if not emp_id and raw_contingent:
                cursor.execute("SELECT id, uuds_no FROM employees WHERE contingent_id = ?", (raw_contingent,))
                row = cursor.fetchone()
                if row:
                    emp_id = row["id"]
                    if not clean_uuds:
                        clean_uuds = row["uuds_no"]

            if not emp_id and raw_name and len(raw_name) > 3:
                cursor.execute("SELECT id, uuds_no FROM employees WHERE LOWER(full_name) = LOWER(?)", (raw_name,))
                row = cursor.fetchone()
                if row:
                    emp_id = row["id"]
                    if not clean_uuds:
                        clean_uuds = row["uuds_no"]

            # If still not found and no clean_uuds, create a synthetic ID
            if not clean_uuds:
                clean_uuds = f"EXT-{sheet_name[:3].upper()}-{row_idx:03d}"

            start_date_str = None
            if roles["col_start_date"] is not None and roles["col_start_date"] < len(row_cells):
                s_d, _ = parse_date_value(row_cells[roles["col_start_date"]].value)
                start_date_str = s_d

            emp_status = raw_status if raw_status else default_status

            if emp_id:
                # Update existing employee
                update_fields = []
                params = []

                if raw_name:
                    update_fields.append("full_name = ?")
                    params.append(raw_name)
                if raw_contingent:
                    update_fields.append("contingent_id = ?")
                    params.append(raw_contingent)
                if raw_team:
                    update_fields.append("team = ?")
                    params.append(raw_team)
                if raw_pos:
                    update_fields.append("position = ?")
                    params.append(raw_pos)
                if raw_mobile:
                    update_fields.append("mobile_no = ?")
                    params.append(raw_mobile)
                    stats["mobile_numbers_updated"] += 1
                if start_date_str:
                    update_fields.append("dxb_start_date = ?")
                    params.append(start_date_str)
                if emp_status:
                    update_fields.append("employment_status = ?")
                    params.append(emp_status)

                if update_fields:
                    update_fields.append("updated_at = CURRENT_TIMESTAMP")
                    params.append(emp_id)
                    cursor.execute(f"UPDATE employees SET {', '.join(update_fields)} WHERE id = ?", params)
                    stats["employees_updated"] += 1
            else:
                # Create new employee
                cursor.execute("""
                INSERT INTO employees (uuds_no, contingent_id, full_name, position, team, mobile_no, dxb_start_date, employment_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    clean_uuds, 
                    raw_contingent, 
                    raw_name or "Staff Member", 
                    raw_pos, 
                    raw_team or "General", 
                    raw_mobile, 
                    start_date_str, 
                    emp_status
                ))
                emp_id = cursor.lastrowid
                stats["employees_created"] += 1
                if raw_mobile:
                    stats["mobile_numbers_updated"] += 1

            # Process course training dates for this row
            for col_idx, course_code in roles["course_columns"].items():
                if col_idx >= len(row_cells):
                    continue
                c_id = course_map.get(course_code)
                if not c_id:
                    continue

                cell_val = row_cells[col_idx].value
                parsed_dt, text_note = parse_date_value(cell_val)
                computed_status = calculate_status(parsed_dt, text_note)

                cursor.execute("""
                INSERT INTO training_records (employee_id, course_id, expiry_date, status, notes, updated_by)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(employee_id, course_id) DO UPDATE SET
                    expiry_date = excluded.expiry_date,
                    status = excluded.status,
                    notes = coalesce(excluded.notes, training_records.notes),
                    updated_by = excluded.updated_by,
                    updated_at = CURRENT_TIMESTAMP
                """, (emp_id, c_id, parsed_dt, computed_status, text_note, username))
                stats["records_updated"] += 1

    # Ensure all active employees have baseline records for all courses
    cursor.execute("SELECT id FROM employees")
    all_emp_ids = [r["id"] for r in cursor.fetchall()]
    all_course_ids = list(course_map.values())

    for e_id in all_emp_ids:
        for c_id in all_course_ids:
            cursor.execute("""
            INSERT OR IGNORE INTO training_records (employee_id, course_id, status, notes, updated_by)
            VALUES (?, ?, 'Not Recorded', 'Initial requirement', 'excel_upload')
            """, (e_id, c_id))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "filename": filename,
        "sheets_processed": stats["sheets_processed"],
        "employees_created": stats["employees_created"],
        "employees_updated": stats["employees_updated"],
        "records_updated": stats["records_updated"],
        "mobile_numbers_updated": stats["mobile_numbers_updated"],
        "matched_courses": sorted(list(stats["matched_courses"]))
    }
