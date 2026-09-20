import re
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def run_tests():
    print("=== 1. Testing Static Assets & SPA ===")
    r = client.get("/")
    assert r.status_code == 200, f"SPA root failed: {r.status_code}"
    print("  Root index.html: OK")

    match = re.search(r'src="(/assets/[^"]+)"', r.text)
    if match:
        asset_path = match.group(1)
        r_asset = client.get(asset_path)
        assert r_asset.status_code == 200, f"Asset failed: {r_asset.status_code}"
        print(f"  Asset {asset_path}: OK ({len(r_asset.content)} bytes)")

    print("\n=== 2. Testing Authentication ===")
    r_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r_login.status_code == 200, f"Login failed: {r_login.status_code}"
    token = r_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  Login as admin: OK (Token: {token[:20]}...)")

    print("\n=== 3. Testing Dashboard Statistics ===")
    r_dash = client.get("/api/dashboard/stats", headers=headers)
    assert r_dash.status_code == 200
    data_dash = r_dash.json()
    print(f"  Active Employees: {data_dash['active_employees_count']}")
    print(f"  Compliance Rate: {data_dash['compliance_rate']}%")
    rec = data_dash['records']
    print(f"  Records: Valid={rec['valid_count']}, Due={rec['due_soon_count']}, Overdue={rec['overdue_count']}")

    print("\n=== 4. Testing Employee 360 Profile and Mobile Number ===")
    r_emps = client.get("/api/employees?page=1&page_size=5", headers=headers)
    assert r_emps.status_code == 200
    first_emp = r_emps.json()["items"][0]
    print(f"  First Employee: {first_emp['uuds_no']} - {first_emp['full_name']} (Mobile: {first_emp['mobile_no']})")

    r_profile = client.get(f"/api/employees/{first_emp['id']}", headers=headers)
    assert r_profile.status_code == 200
    prof_data = r_profile.json()
    print(f"  Total Courses assigned: {len(prof_data['courses'])}")

    print("\n=== 5. Testing Manual Course Date Update ===")
    first_course = prof_data["courses"][0]
    rec_id = first_course["record_id"]
    r_upd = client.put(f"/api/records/{rec_id}", json={"expiry_date": "2028-12-31", "notes": "Renewed recurrent"}, headers=headers)
    assert r_upd.status_code == 200
    print(f"  Updated course {first_course['course_code']} -> New status: {r_upd.json()['status']}")

    print("\n=== 6. Testing Email Reminder and Notification Log ===")
    r_send = client.post("/api/reminders/send-now", headers=headers)
    assert r_send.status_code == 200
    send_data = r_send.json()
    print(f"  Send report: Status={send_data['status']}, Recipient={send_data['recipient']}, Overdue={send_data['overdue_count']}")

    print("\n=== 7. Testing Courses Catalogue ===")
    r_courses = client.get("/api/courses", headers=headers)
    assert r_courses.status_code == 200
    print(f"  Total catalogue courses: {len(r_courses.json())}")

    print("\n>>> ALL 7 AUTOMATED INTEGRATION TESTS PASSED PERFECTLY! <<<")

if __name__ == "__main__":
    run_tests()
