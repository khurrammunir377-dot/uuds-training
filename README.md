# UUDS Aviation Training Compliance Tracker

An enterprise-grade, desktop-ready application designed for **UUDS Aero Services LLC (Dubai)** to track technical manpower training compliance, monitor mandatory EASA Part 145 / GCAA CAR 145 certifications, automate email alerts to `nsilva@uuds.ae`, and send direct WhatsApp reminders to staff.

---

## 🚀 One-Click Launch (Windows)

### 1. Initial Setup (One-Click)
Double-click `setup_windows.bat` in this directory. It will automatically:
- Check Python and Node.js
- Install required backend dependencies
- Import all technical staff from `Manpower and Training Schedule- R4 27 Aug 2026 (version 1) - Copy.xlsx`
- Link mobile numbers from `staff with mobile no.xlsx`
- Build the optimized desktop frontend
- Register Windows Startup Auto-Start (so it starts automatically whenever the PC powers on)

### 2. Daily Start
Double-click `start_windows.bat`.
It starts the compliance server and opens the application in a **maximized, native software window** (using Edge/Chrome App mode without browser address bars).

### 3. Auto-Start Toggle
Double-click `autostart_toggle.bat` anytime to enable or disable PC boot autostart.

---

## 🔐 Default Login Credentials

| Role | Username | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin` | `admin123` | Full access: CRUD staff, edit course records, manage catalogue, trigger emails, configure settings |
| **Viewer / User** | `viewer` | `viewer123` | Read-only compliance review, profile inspection |

---

## 🌟 Key Capabilities

### 1. Modern Aviation Dashboard
- Executive KPI Cards: Valid, Due Within 30 Days, Overdue, and Not Recorded training records.
- Overall Compliance Rate (%) calculation.
- Compliance Breakdown by Team (Team A, Team B, Team C, Leather, P/Booth, Workshop, Office, etc.).
- Most Expired Courses leaderboard.
- Immediate Action Matrix with one-click direct WhatsApp reminder buttons.

### 2. Technical Staff Database & 360° Profile
- **Status Tabs**: Active Roster (244 staff), Unpaid Leave (15), DWC TX (18), Resigned (151), Redundancy (35), Non Technical, and All Database (484+ total records).
- **Search & Filters**: Search by UUDS ID, Staff No, Full Name, Mobile, or Position.
- **Complete 360° Profile Modal**:
  - Full details, department, designation, DXB start date, and mobile number.
  - Complete matrix of **all 21 mandatory courses**.
  - Expiry dates, completion dates, days remaining / overdue.
  - **Inline "Update Date"**: Instantly change completion or expiry dates per employee. Status recalculates automatically (Green, Amber, Red, Grey).
  - Complete Audit Trail & Change History per employee.
  - Print/Export Training Card.

### 3. Direct Personal WhatsApp Reminders
- Each employee with a mobile number has a direct WhatsApp reminder button.
- Clicking **WhatsApp** formats a personalized message detailing their overdue or impending training courses and opens WhatsApp Web/Desktop directly:
  > *"Dear [Name], This is an urgent training notification from UUDS Training Department. Your mandatory certification for [Course] is overdue (expired on [Date]). Please coordinate with the training division..."*

### 4. Automated & Manual Weekly Email Reminders
- Scheduled weekly email dispatch to **nsilva@uuds.ae** via Microsoft 365 / Outlook SMTP.
- **"Send Report Now"** button in Navbar and Reminder Center for instant on-demand email dispatch.
- Beautiful, executive-grade HTML email summary with KPI cards and tables of overdue & 30-day expiring personnel.
- **Notification Log**: Complete history of dispatched emails with an interactive **"Preview HTML"** viewer.

### 5. Emirates MLZ Training Catalogue
- Pre-populated with Emirates MLZ courses (OL-1237, OL-723, OL-1666, OL-1667, OL-1653, OL-1073, OL-1678, OL-1707, OL-2550, OL-1395, OL-1732, OL-2136, OL-2529, OL-1968, OL-1965, OL-1090, OL-498, OL-2669, OL-2208) plus induction and competency modules.
- Add new courses with automatic assignment to all active staff.
- Modify course validity periods (e.g., 24 months, 12 months, permanent).

### 6. Office 365 / Outlook Configuration
- Configurable in Settings: SMTP Host (`smtp.office365.com`), Port (587), Username/Email (`nsilva@uuds.ae`), Password / App Password, STARTTLS toggle, and schedule (e.g., Monday 08:00 AM GST).
- Built-in "Test SMTP Connection" button to verify credentials.
- Graceful simulation mode if password is not entered yet.

---

## 📂 File Architecture

```
UUDS Training Tracker/
├── backend/
│   ├── server.py              # FastAPI server, REST API, scheduler & static files
│   ├── database.py            # SQLite schema, tables & user management
│   ├── importer.py            # Excel ETL & mobile number matching engine
│   ├── email_service.py       # Office 365 SMTP dispatcher & HTML template
│   ├── uuds_training.db       # SQLite database
│   └── test_integration.py    # Automated test suite
├── frontend/
│   ├── src/
│   │   ├── components/        # Navbar, Sidebar, StatusBadge, Toast, ConfirmationModal
│   │   ├── pages/             # Dashboard, Employees, EmployeeProfileModal, Reminders, Courses, Settings, Login
│   │   ├── context/           # AuthContext
│   │   └── api.js             # Unified API client
│   ├── dist/                  # Compiled production bundle
│   └── package.json
├── setup_windows.bat          # One-click installer & autostart configurator
├── start_windows.bat          # Maximized desktop app launcher
├── autostart_toggle.bat       # Toggle autostart on Windows boot
└── README.md
```
