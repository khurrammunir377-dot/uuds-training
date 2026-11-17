"""
Universal Excel Upload & Intelligent Matching Engine for UUDS Training Compliance Tracker

Supports:
1. Multi-sheet or single-sheet Training Schedule workbooks
2. Staff contact/roster workbooks (Staff ID, Contingent ID, Full Name, Mobile No, Team)
3. Partial/Custom matrix exports or ad-hoc column formats
4. Auto-matching of courses, employee numbers, names, and date fields
5. Intelligent Team Normalization (eliminates accidental position titles and formatting duplicates)
"""

import os
import re
import io
import openpyxl
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple
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
    (r"(safety.*policy.*and.*you|emirates.*safety.*policy)", "OL-2529"),
]

def normalize_text(text: Any) -> str:
    if text is None:
        return ""
    return str(text).strip()

def clean_uuds_no(raw_uuds: Any) -> str:
    """Normalize UUDS number into canonical 'UUDS-xxx' format."""
    s = normalize_text(raw_uuds)
    if not s:
        return ""
    # Remove whitespace inside and replace underscores
    s_clean = re.sub(r"\s+", "", s).upper().replace("_", "-")
    # If missing hyphen e.g. UUDS123
    match = re.match(r"^UUDS-?(\d+.*)$", s_clean, re.IGNORECASE)
    if match:
        return f"UUDS-{match.group(1)}"
    return s_clean

def clean_team_and_position(raw_team: Any, raw_pos: Any = "") -> Tuple[str, str]:
    """
    Intelligently canonicalizes team and position names.
    Moves accidental job titles found in 'team' into 'position'
    and maps teams to standard company buckets:
    Team A, Team B, Team C, A Check, Work Shop, Leather, P/Booth,
    Stores, Planner, Office, Line A, Line B, Line C, Line D, EK Line, DWC TX.
    """
    team_s = normalize_text(raw_team)
    pos_s = normalize_text(raw_pos)

    # Prevent date strings or counts from being treated as teams
    if re.match(r"^\d{4}-\d{2}-\d{2}", team_s) or re.match(r"^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", team_s) or team_s.isdigit():
        team_s = ""

    tl = team_s.lower()
    pl = pos_s.lower()

    # 1. Job titles accidentally placed in Team column
    if tl in ["director", "director - onwing", "director-onwing"]:
        pos_s = pos_s or "Director - Onwing"
        team_s = "Office"
    elif "manager - onwing" in tl or "manager-onwing" in tl:
        pos_s = pos_s or "Manager - Onwing"
        team_s = "Office"
    elif "workshop manager" in tl:
        pos_s = pos_s or "Workshop Manager"
        team_s = "Work Shop"
    elif "office assistant" in tl:
        pos_s = pos_s or "Office Assistant"
        team_s = "Office"
    elif any(k in tl for k in ["training manager", "training coordinator", "training officer"]):
        pos_s = pos_s or team_s
        team_s = "Office"
    elif tl in ["coordinator", "supervisor"]:
        pos_s = pos_s or team_s.capitalize()
        team_s = "Office"
    elif any(k in tl for k in ["production coordinator", "production planner", "material planner", "junior production planner", "planning officer"]):
        pos_s = pos_s or team_s
        team_s = "Planner"
    elif "material coordinator" in tl:
        pos_s = pos_s or "Material Coordinator"
        team_s = "Stores"
    
    # 2. Canonical team mappings
    elif re.match(r"^team[- ]?a$", tl):
        team_s = "Team A"
    elif re.match(r"^team[- ]?b$", tl):
        team_s = "Team B"
    elif re.match(r"^team[- ]?c$", tl):
        team_s = "Team C"
    elif re.match(r"^a[- ]?check$", tl):
        team_s = "A Check"
    elif "workshop" in tl or "work shop" in tl:
        team_s = "Work Shop"
    elif "leather" in tl:
        team_s = "Leather"
    elif "paint" in tl or "p/booth" in tl or "p-booth" in tl or "p.booth" in tl:
        team_s = "P/Booth"
    elif "stores" in tl or tl == "store":
        team_s = "Stores"
    elif "planner" in tl or "planning" in tl:
        team_s = "Planner"
    elif re.match(r"^line[- ]?a$", tl):
        team_s = "Line A"
    elif re.match(r"^line[- ]?b$", tl):
        team_s = "Line B"
    elif re.match(r"^line[- ]?c$", tl):
        team_s = "Line C"
    elif re.match(r"^line[- ]?d$", tl):
        team_s = "Line D"
    elif "ek line" in tl or "line maintenance" in tl or tl == "line":
        team_s = "EK Line"
    elif "dwc" in tl:
        team_s = "DWC TX"
    elif "office" in tl:
        team_s = "Office"
    elif not team_s or tl in ["none", "null", "unassigned", "-", "team"]:
        # Fallback based on position
        if any(w in pl for w in ["director", "manager", "assistant", "coordinator", "supervisor", "office"]):
            team_s = "Office"
        elif "planner" in pl or "planning" in pl:
            team_s = "Planner"
        elif "store" in pl:
            team_s = "Stores"
        elif "painter" in pl or "paint" in pl:
            team_s = "P/Booth"
        elif "upholster" in pl or "leather" in pl:
            team_s = "Leather"
        else:
            team_s = "Work Shop"

    return team_s, pos_s

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

def detect_sheet_structure(ws, course_map: Dict[str, int], default_course_columns_format_a: Optional[Dict[int, str]] = None, default_course_columns_format_b: Optional[Dict[int, str]] = None) -> Dict[str, Any]:
    """
    Analyzes sheet headers and data rows to detect column positions for staff and courses.
    Employs foolproof data alignment checking so that template sheets without headers
    (or with shifted headers) are always mapped to their true columns.
    """
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
    
    max_scan_row = min(7, ws.max_row + 1)
    
    # 1. Scan rows 1-6 for course headers across any row
    for r in range(1, max_scan_row):
        for c_idx in range(ws.max_column):
            cell_val = normalize_text(ws.cell(r, c_idx + 1).value)
            if cell_val:
                code = match_course_code(cell_val, course_map)
                if code and c_idx not in roles["course_columns"]:
                    roles["course_columns"][c_idx] = code

    # 2. Scan data rows directly to find the TRUE column containing UUDS-xxx
    data_uuds_col = None
    data_start_row = 1
    for r in range(1, max_scan_row):
        for c in range(1, min(15, ws.max_column + 1)):
            v = str(ws.cell(r, c).value or "").strip()
            if re.match(r"^UUDS\s*[-_]?\s*\d+", v, re.IGNORECASE):
                data_uuds_col = c - 1 # 0-indexed
                data_start_row = r
                break
        if data_uuds_col is not None:
            break

    # 3. If data_uuds_col matches one of the canonical company formats:
    if data_uuds_col == 7:
        # Format A: S/N (0), Position (1), Department (2), Team (3), Name (4), Start Date (5), Staff No (6), UUDS No (7)
        roles["col_position"] = 1
        roles["col_team"] = 3
        roles["col_name"] = 4
        roles["col_start_date"] = 5
        roles["col_contingent"] = 6
        roles["col_uuds"] = 7
        if not roles["course_columns"] and default_course_columns_format_a:
            roles["course_columns"] = default_course_columns_format_a.copy()
    elif data_uuds_col == 6:
        # Format B: Position (0), Department (1), Team (2), Name (3), Start Date (4), Staff No (5), UUDS No (6)
        roles["col_position"] = 0
        roles["col_team"] = 2
        roles["col_name"] = 3
        roles["col_start_date"] = 4
        roles["col_contingent"] = 5
        roles["col_uuds"] = 6
        if not roles["course_columns"] and default_course_columns_format_b:
            roles["course_columns"] = default_course_columns_format_b.copy()
    elif data_uuds_col == 3:
        # Format C (Non Tec): No (0), Name (1), Con No (2), UUDS No (3), Join Date (4), Branch (5)
        roles["col_name"] = 1
        roles["col_contingent"] = 2
        roles["col_uuds"] = 3
        roles["col_start_date"] = 4
        roles["col_team"] = 5
    elif data_uuds_col == 0:
        # Format D (Staff contact list): Staff ID (0), Contingent ID (1), Full Name (2), Team (3), Contact No (4)
        roles["col_uuds"] = 0
        roles["col_contingent"] = 1
        roles["col_name"] = 2
        roles["col_team"] = 3
        roles["col_mobile"] = 4
    else:
        # Fallback to header text matching across first 5 rows
        header_row_idx = 1
        best_staff_score = 0
        for r_idx in range(1, max_scan_row):
            score = 0
            r_cells = [normalize_text(cell.value).lower() for cell in ws[r_idx]]
            for h in r_cells:
                if not h: continue
                if re.search(r"(uuds.*no|uuds.*id|^uuds$|staff.*id|emp.*id|employee.*id)", h): score += 3
                if re.search(r"(contingent|ek.*staff|ek.*no|badge|staff.*no|con\.?\s*no)", h): score += 3
                if re.search(r"(full.*name|^name$|employee.*name|staff.*name)", h): score += 3
                if re.search(r"(position|designation|job.*title|role)", h): score += 2
                if re.search(r"(team|branch|dept|department|section)", h): score += 2
                if re.search(r"(contact|mobile|phone|whatsapp|cell)", h): score += 2
                if re.search(r"(start.*date|join.*date|dxb.*start|hire.*date)", h): score += 2
            if score > best_staff_score:
                best_staff_score = score
                header_row_idx = r_idx

        header_vals = [normalize_text(cell.value) for cell in ws[header_row_idx]]
        for idx, raw_h in enumerate(header_vals):
            if not raw_h or idx in roles["course_columns"]:
                continue
            h = raw_h.strip().lower()
            if re.search(r"(uuds.*no|uuds.*id|^uuds$|staff.*id|emp.*id|employee.*id)", h) and roles["col_uuds"] is None:
                roles["col_uuds"] = idx
            elif re.search(r"(contingent|ek.*staff|ek.*no|badge|staff.*no|con\.?\s*no)", h) and roles["col_contingent"] is None:
                roles["col_contingent"] = idx
            elif re.search(r"(full.*name|^name$|employee.*name|staff.*name)", h) and roles["col_name"] is None:
                roles["col_name"] = idx
            elif re.search(r"(position|designation|job.*title|role)", h) and roles["col_position"] is None:
                roles["col_position"] = idx
            elif re.search(r"(team|branch|dept|department|section)", h) and roles["col_team"] is None:
                roles["col_team"] = idx
            elif re.search(r"(contact|mobile|phone|whatsapp|cell)", h) and roles["col_mobile"] is None:
                roles["col_mobile"] = idx
            elif re.search(r"(start.*date|join.*date|dxb.*start|hire.*date)", h) and roles["col_start_date"] is None:
                roles["col_start_date"] = idx
            elif re.search(r"(employment.*status|^status$|work.*status)", h) and roles["col_status"] is None:
                roles["col_status"] = idx
        data_start_row = header_row_idx + 1

    return {
        "roles": roles,
        "data_start_row": data_start_row
    }

def is_summary_or_invalid_row(row_cells: Any, roles: Dict[str, Any]) -> bool:
    """Detects and rejects summary statistics, notes, or garbage rows."""
    raw_uuds = normalize_text(row_cells[roles["col_uuds"]].value) if roles["col_uuds"] is not None and roles["col_uuds"] < len(row_cells) else ""
    raw_name = normalize_text(row_cells[roles["col_name"]].value) if roles["col_name"] is not None and roles["col_name"] < len(row_cells) else ""
    raw_pos = normalize_text(row_cells[roles["col_position"]].value) if roles["col_position"] is not None and roles["col_position"] < len(row_cells) else ""
    raw_contingent = normalize_text(row_cells[roles["col_contingent"]].value) if roles["col_contingent"] is not None and roles["col_contingent"] < len(row_cells) else ""

    # Reject placeholder "nnnnn" rows
    if raw_name.lower().startswith("nnnnn") or raw_pos.lower().startswith("nnnnn"):
        return True

    # Reject instruction/note lines (e.g. "Complete the training record columns...")
    full_row_text = " ".join(normalize_text(c.value) for c in row_cells[:10]).lower()
    if "complete the training record" in full_row_text or "grand total" in full_row_text:
        return True

    # If name is "Total" or contingent is "Total"
    if "total" in raw_name.lower() or "total" in raw_contingent.lower():
        return True

    # If raw_uuds is purely numeric (e.g. count statistics like 11, 47, 33, 245) without "UUDS"
    if raw_uuds.isdigit() and not re.match(r"^uuds", raw_uuds, re.IGNORECASE):
        return True

    # If row is completely empty
    if not raw_uuds and not raw_name and not raw_contingent:
        return True

    return False

def process_excel_upload(file_bytes: bytes, filename: str, username: str) -> Dict[str, Any]:
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    
    conn = get_db()
    cursor = conn.cursor()

    # Ensure all courses are registered
    for c in COURSES_CATALOG:
        cursor.execute("""
        INSERT INTO courses (code, name, category, validity_months, description)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            category = excluded.category,
            validity_months = excluded.validity_months,
            description = excluded.description
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

    # First pass: find master course columns from Training Register (Format A) and DWC/RESIGN (Format B)
    master_courses_format_a: Dict[int, str] = {}
    master_courses_format_b: Dict[int, str] = {}
    for s_name in wb.sheetnames:
        clean_s = s_name.strip().lower()
        if clean_s in ["training register", "active"]:
            temp_struct = detect_sheet_structure(wb[s_name], course_map)
            if temp_struct["roles"]["course_columns"]:
                master_courses_format_a = temp_struct["roles"]["course_columns"].copy()
                # If Format A starts at col 8, Format B starts at col 7 (1 column shift to left)
                master_courses_format_b = {col_idx - 1: code for col_idx, code in master_courses_format_a.items() if col_idx >= 8}

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        if ws.max_row < 2:
            continue

        clean_sheet_name = sheet_name.strip().lower()
        default_status = sheet_status_map.get(clean_sheet_name, "Active")

        structure = detect_sheet_structure(
            ws, 
            course_map, 
            default_course_columns_format_a=master_courses_format_a,
            default_course_columns_format_b=master_courses_format_b
        )
        roles = structure["roles"]
        data_start_row = structure["data_start_row"]

        for c_code in roles["course_columns"].values():
            stats["matched_courses"].add(c_code)

        stats["sheets_processed"] += 1

        # Process data rows
        for row_idx in range(data_start_row, ws.max_row + 1):
            row_cells = ws[row_idx]
            
            # Skip invalid/summary rows
            if is_summary_or_invalid_row(row_cells, roles):
                continue

            # Extract basic info
            raw_uuds = normalize_text(row_cells[roles["col_uuds"]].value) if roles["col_uuds"] is not None and roles["col_uuds"] < len(row_cells) else ""
            raw_name = normalize_text(row_cells[roles["col_name"]].value) if roles["col_name"] is not None and roles["col_name"] < len(row_cells) else ""
            raw_contingent = normalize_text(row_cells[roles["col_contingent"]].value) if roles["col_contingent"] is not None and roles["col_contingent"] < len(row_cells) else ""
            raw_team = normalize_text(row_cells[roles["col_team"]].value) if roles["col_team"] is not None and roles["col_team"] < len(row_cells) else ""
            raw_pos = normalize_text(row_cells[roles["col_position"]].value) if roles["col_position"] is not None and roles["col_position"] < len(row_cells) else ""
            raw_mobile = normalize_text(row_cells[roles["col_mobile"]].value) if roles["col_mobile"] is not None and roles["col_mobile"] < len(row_cells) else ""
            raw_status = normalize_text(row_cells[roles["col_status"]].value) if roles["col_status"] is not None and roles["col_status"] < len(row_cells) else default_status

            # Search row for UUDS-xxx pattern if not found in specified column
            if not raw_uuds or not re.match(r"^uuds", raw_uuds, re.IGNORECASE):
                for cell in row_cells[:12]:
                    val = normalize_text(cell.value)
                    if re.match(r"^UUDS\s*[-_]?\s*\d+", val, re.IGNORECASE):
                        raw_uuds = val
                        break

            clean_uuds = clean_uuds_no(raw_uuds)
            
            # Skip rows where neither clean UUDS nor valid name exists
            if not clean_uuds and (not raw_name or len(raw_name) < 3):
                continue

            # Canonicalize Team and Position
            clean_team, clean_pos = clean_team_and_position(raw_team, raw_pos)

            # Match employee
            emp_id = None
            if clean_uuds:
                cursor.execute("SELECT id, uuds_no, team, position FROM employees WHERE uuds_no = ? OR uuds_no = ?", (clean_uuds, raw_uuds))
                row = cursor.fetchone()
                if row:
                    emp_id = row["id"]
            
            if not emp_id and raw_contingent:
                cursor.execute("SELECT id, uuds_no, team, position FROM employees WHERE contingent_id = ?", (raw_contingent,))
                row = cursor.fetchone()
                if row:
                    emp_id = row["id"]
                    if not clean_uuds:
                        clean_uuds = row["uuds_no"]

            if not emp_id and raw_name and len(raw_name) > 3:
                cursor.execute("SELECT id, uuds_no, team, position FROM employees WHERE LOWER(full_name) = LOWER(?)", (raw_name,))
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
                if clean_team:
                    update_fields.append("team = ?")
                    params.append(clean_team)
                if clean_pos:
                    update_fields.append("position = ?")
                    params.append(clean_pos)
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
                    clean_pos, 
                    clean_team, 
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

    # Ensure all employees have baseline records for all courses
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
