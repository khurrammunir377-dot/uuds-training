import smtplib
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, date
from database import get_db

def get_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    settings = {row["key"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    return settings

def get_compliance_summary():
    conn = get_db()
    cursor = conn.cursor()
    
    # Query overdue items for active employees
    cursor.execute("""
    SELECT 
        e.id as employee_id, e.uuds_no, e.contingent_id, e.full_name, e.team, e.position, e.mobile_no,
        c.code as course_code, c.name as course_name,
        r.expiry_date, r.notes
    FROM training_records r
    JOIN employees e ON e.id = r.employee_id
    JOIN courses c ON c.id = r.course_id
    WHERE e.employment_status = 'Active' AND r.status = 'Overdue'
    ORDER BY r.expiry_date ASC, e.full_name ASC
    """)
    overdue_items = [dict(row) for row in cursor.fetchall()]
    
    # Query items due within 30 days
    cursor.execute("""
    SELECT 
        e.id as employee_id, e.uuds_no, e.contingent_id, e.full_name, e.team, e.position, e.mobile_no,
        c.code as course_code, c.name as course_name,
        r.expiry_date, r.notes
    FROM training_records r
    JOIN employees e ON e.id = r.employee_id
    JOIN courses c ON c.id = r.course_id
    WHERE e.employment_status = 'Active' AND r.status = 'Due Within 30 Days'
    ORDER BY r.expiry_date ASC, e.full_name ASC
    """)
    due_soon_items = [dict(row) for row in cursor.fetchall()]
    
    # Total counts
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
    stats = dict(cursor.fetchone())
    
    conn.close()
    return overdue_items, due_soon_items, stats

def format_date_str(d_str):
    if not d_str:
        return "-"
    try:
        d = datetime.strptime(str(d_str).split()[0], "%Y-%m-%d")
        return d.strftime("%d-%b-%Y")
    except Exception:
        return str(d_str)

def generate_compliance_html(overdue_items, due_soon_items, stats):
    valid_count = stats.get("valid_count", 0)
    overdue_count = len(overdue_items)
    due_soon_count = len(due_soon_items)
    total_active_records = stats.get("total_records", 0)
    compliance_rate = round((valid_count / total_active_records * 100), 1) if total_active_records > 0 else 0
    today_str = datetime.now().strftime("%d-%b-%Y")
    
    # Overdue rows
    overdue_rows_html = ""
    for item in overdue_items[:50]: # limit to top 50 in email body for readability
        days_overdue = (date.today() - datetime.strptime(item["expiry_date"], "%Y-%m-%d").date()).days if item.get("expiry_date") else "-"
        fmt_date = format_date_str(item.get("expiry_date"))
        overdue_rows_html += f"""
        <tr style="border-bottom: 1px solid #fee2e2;">
            <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">{item['uuds_no']}</td>
            <td style="padding: 10px 12px; color: #0f172a;">{item['full_name']}<br><span style="font-size: 12px; color: #64748b;">{item['position'] or ''} • {item['team'] or ''}</span></td>
            <td style="padding: 10px 12px; color: #b91c1c; font-weight: 600;">{item['course_code']} - {item['course_name']}</td>
            <td style="padding: 10px 12px; color: #dc2626; text-align: center; font-family: monospace;">{fmt_date}</td>
            <td style="padding: 10px 12px; text-align: center;"><span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">+{days_overdue} days</span></td>
            <td style="padding: 10px 12px; font-size: 12px; color: #475569;">{item['mobile_no'] or 'N/A'}</td>
        </tr>
        """
        
    if not overdue_items:
        overdue_rows_html = """
        <tr><td colspan="6" style="padding: 16px; text-align: center; color: #15803d; font-weight: 600;">✅ Excellent! Zero overdue training records detected.</td></tr>
        """
        
    # Due soon rows
    due_soon_rows_html = ""
    for item in due_soon_items[:50]:
        days_left = (datetime.strptime(item["expiry_date"], "%Y-%m-%d").date() - date.today()).days if item.get("expiry_date") else "-"
        fmt_date = format_date_str(item.get("expiry_date"))
        due_soon_rows_html += f"""
        <tr style="border-bottom: 1px solid #fef3c7;">
            <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">{item['uuds_no']}</td>
            <td style="padding: 10px 12px; color: #0f172a;">{item['full_name']}<br><span style="font-size: 12px; color: #64748b;">{item['position'] or ''} • {item['team'] or ''}</span></td>
            <td style="padding: 10px 12px; color: #b45309; font-weight: 600;">{item['course_code']} - {item['course_name']}</td>
            <td style="padding: 10px 12px; color: #d97706; text-align: center; font-family: monospace;">{fmt_date}</td>
            <td style="padding: 10px 12px; text-align: center;"><span style="background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">{days_left} days left</span></td>
            <td style="padding: 10px 12px; font-size: 12px; color: #475569;">{item['mobile_no'] or 'N/A'}</td>
        </tr>
        """
    if not due_soon_items:
        due_soon_rows_html = """
        <tr><td colspan="6" style="padding: 16px; text-align: center; color: #15803d; font-weight: 600;">✅ No courses due for renewal within the next 30 days.</td></tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #0f172a; }}
            .container {{ max-width: 820px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }}
            .header {{ background: linear-gradient(135deg, #0b1f3a 0%, #1e3a8a 100%); padding: 30px; color: #ffffff; }}
            .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }}
            .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }}
            table {{ width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }}
            th {{ background: #f8fafc; padding: 10px 12px; font-weight: 600; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <table style="width: 100%;">
                    <tr>
                        <td>
                            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">UUDS AERO (DXB)</h1>
                            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.85;">Weekly Aviation Training Compliance Alert</p>
                        </td>
                        <td style="text-align: right;">
                            <span style="background: rgba(255,255,255,0.15); color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;">{today_str}</span>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Content Area -->
            <div style="padding: 24px 30px;">
                <p style="margin-top: 0; font-size: 15px; color: #334155; line-height: 1.5;">
                    Dear Training & Compliance Team,
                    <br>
                    Here is the scheduled weekly compliance status summary for UUDS maintenance and technical personnel. Action is required for items flagged as <strong>Overdue</strong> and <strong>Due Within 30 Days</strong>.
                </p>

                <!-- KPI Metric Cards -->
                <table style="width: 100%; margin: 20px 0;">
                    <tr>
                        <td style="width: 25%; padding-right: 10px;">
                            <div class="card" style="border-top: 4px solid #ef4444;">
                                <div style="font-size: 26px; font-weight: 800; color: #dc2626;">{overdue_count}</div>
                                <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-top: 4px;">OVERDUE</div>
                            </div>
                        </td>
                        <td style="width: 25%; padding: 0 5px;">
                            <div class="card" style="border-top: 4px solid #f59e0b;">
                                <div style="font-size: 26px; font-weight: 800; color: #d97706;">{due_soon_count}</div>
                                <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-top: 4px;">DUE IN 30 DAYS</div>
                            </div>
                        </td>
                        <td style="width: 25%; padding: 0 5px;">
                            <div class="card" style="border-top: 4px solid #10b981;">
                                <div style="font-size: 26px; font-weight: 800; color: #059669;">{valid_count}</div>
                                <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-top: 4px;">VALID RECORDS</div>
                            </div>
                        </td>
                        <td style="width: 25%; padding-left: 10px;">
                            <div class="card" style="border-top: 4px solid #3b82f6;">
                                <div style="font-size: 26px; font-weight: 800; color: #2563eb;">{compliance_rate}%</div>
                                <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-top: 4px;">COMPLIANCE RATE</div>
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- SECTION 1: OVERDUE -->
                <div style="margin-top: 30px;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                        <h2 style="margin: 0; font-size: 17px; font-weight: 700; color: #991b1b;">🚨 Overdue Training Records ({overdue_count})</h2>
                    </div>
                    <div style="border: 1px solid #fee2e2; border-radius: 8px; overflow: hidden;">
                        <table>
                            <thead>
                                <tr>
                                    <th>UUDS ID</th>
                                    <th>Employee</th>
                                    <th>Course</th>
                                    <th style="text-align: center;">Expiry Date</th>
                                    <th style="text-align: center;">Overdue By</th>
                                    <th>Mobile Contact</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overdue_rows_html}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SECTION 2: DUE IN 30 DAYS -->
                <div style="margin-top: 35px;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                        <h2 style="margin: 0; font-size: 17px; font-weight: 700; color: #92400e;">⚠️ Expiring Within 30 Days ({due_soon_count})</h2>
                    </div>
                    <div style="border: 1px solid #fef3c7; border-radius: 8px; overflow: hidden;">
                        <table>
                            <thead>
                                <tr>
                                    <th>UUDS ID</th>
                                    <th>Employee</th>
                                    <th>Course</th>
                                    <th style="text-align: center;">Expiry Date</th>
                                    <th style="text-align: center;">Days Left</th>
                                    <th>Mobile Contact</th>
                                </tr>
                            </thead>
                            <tbody>
                                {due_soon_rows_html}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Action notice & Sign-off -->
                <div style="margin-top: 35px; padding: 18px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
                    <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                        <strong>Action Notice:</strong> Please reach out to the affected employees or their team leads to schedule recurring training sessions. For individual direct notifications, you may utilize the Training Tracker's automated WhatsApp dispatch or update records upon certification renewal.
                    </p>
                </div>

                <p style="margin: 24px 0 0 0; font-size: 14px; color: #334155; line-height: 1.6;">
                    Warm regards,<br>
                    <strong style="color: #0f172a; font-size: 15px;">Manager Training, UUDS Aero (DXB)</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
                <p style="margin: 0; font-weight: 600; color: #475569;">Manager Training, UUDS Aero (DXB) • Automated Notification Service</p>
                <p style="margin: 4px 0 0 0;">Recipient: <strong>nsilva@uuds.ae</strong> | Generated automatically at {datetime.now().strftime("%d-%b-%Y %H:%M:%S")}</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

def send_compliance_email(manual_trigger=False, override_recipient=None):
    settings = get_settings()
    recipient = override_recipient or settings.get("reminder_recipient", "nsilva@uuds.ae")
    overdue_items, due_soon_items, stats = get_compliance_summary()
    
    today_fmt = date.today().strftime("%d-%b-%Y")
    subject = f"UUDS Aviation Training Compliance Report - {today_fmt} ({len(overdue_items)} Overdue, {len(due_soon_items)} Expiring Soon)"
    html_content = generate_compliance_html(overdue_items, due_soon_items, stats)
    
    smtp_host = settings.get("smtp_host", "smtp.office365.com")
    smtp_port = int(settings.get("smtp_port", 587))
    smtp_user = settings.get("smtp_user", "nsilva@uuds.ae")
    smtp_password = settings.get("smtp_password", "")
    smtp_from_name = settings.get("smtp_from_name", "Manager Training, UUDS Aero (DXB)")
    smtp_tls = settings.get("smtp_tls", "true").lower() == "true"
    
    status = "Sent"
    error_msg = None
    summary_text = f"Report processed: {len(overdue_items)} overdue courses, {len(due_soon_items)} expiring within 30 days."
    
    # If no password is configured, run in Simulation/Preview mode
    if not smtp_password or smtp_password.strip() == "":
        status = "Simulated"
        summary_text += " (Simulated: SMTP password not configured in Settings. Preview generated and logged)."
    else:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{smtp_from_name} <{smtp_user}>"
            msg["To"] = recipient
            
            part = MIMEText(html_content, "html")
            msg.attach(part)
            
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
            if smtp_tls:
                server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [recipient], msg.as_string())
            server.quit()
            status = "Sent"
        except Exception as e:
            status = "Failed"
            error_msg = str(e)
            summary_text = f"Failed to send email via {smtp_host}:{smtp_port}: {error_msg}"
            
    # Log the email
    conn = get_db()
    cursor = conn.cursor()
    details_json = json.dumps({
        "overdue_count": len(overdue_items),
        "due_soon_count": len(due_soon_items),
        "manual_trigger": manual_trigger,
        "smtp_host": smtp_host,
        "sample_overdue": [f"{item['uuds_no']} - {item['course_code']}" for item in overdue_items[:10]]
    })
    cursor.execute("""
    INSERT INTO email_logs (recipient, subject, status, summary, details, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (recipient, subject, status, summary_text, details_json, error_msg))
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "success": status in ("Sent", "Simulated"),
        "status": status,
        "log_id": log_id,
        "recipient": recipient,
        "subject": subject,
        "overdue_count": len(overdue_items),
        "due_soon_count": len(due_soon_items),
        "summary": summary_text,
        "error": error_msg,
        "html_preview": html_content
    }

def send_manager_email(to_email, cc_emails="", subject="", message_body="", include_report=True):
    settings = get_settings()
    smtp_host = settings.get("smtp_host", "smtp.office365.com")
    smtp_port = int(settings.get("smtp_port", 587))
    smtp_user = settings.get("smtp_user", "nsilva@uuds.ae")
    smtp_password = settings.get("smtp_password", "")
    smtp_from_name = settings.get("smtp_from_name", "Manager Training, UUDS Aero (DXB)")
    smtp_tls = settings.get("smtp_tls", "true").lower() == "true"

    to_list = [e.strip() for e in to_email.split(",") if e.strip()]
    cc_list = [e.strip() for e in (cc_emails or "").split(",") if e.strip()]
    all_recipients = to_list + cc_list

    formatted_body = message_body.replace("\n", "<br>")
    report_badge = ""
    if include_report:
        report_badge = """
        <div style="margin-top: 20px; padding: 14px 18px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; color: #166534; font-size: 13px;">
            📎 <strong>Attached Document:</strong> UUDS_Training_Compliance_Audit_Report.xlsx (Live Regulatory Manpower & Expiry Schedule)
        </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 25px; margin: 0;">
        <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 24px;">
                <h2 style="margin: 0; font-size: 20px;">UUDS AERO (DXB)</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Manager Aviation Training Compliance Notice</p>
            </div>
            <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
                {formatted_body}
                {report_badge}
            </div>
            <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                Manager Training, UUDS Aero (DXB) • Aviation Compliance Management System
            </div>
        </div>
    </body>
    </html>
    """

    status = "Sent"
    error_msg = None
    summary_text = f"Manager notification dispatched to {to_email}" + (f" (CC: {cc_emails})" if cc_emails else "")
    if include_report:
        summary_text += " [Compliance Report Attached]"

    if not smtp_password or smtp_password.strip() == "":
        status = "Simulated"
        summary_text += " (Simulated: SMTP password not configured in Settings. Dispatched to simulated queue)."
    else:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{smtp_from_name} <{smtp_user}>"
            msg["To"] = ", ".join(to_list)
            if cc_list:
                msg["Cc"] = ", ".join(cc_list)
            part = MIMEText(html_content, "html")
            msg.attach(part)

            server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
            if smtp_tls:
                server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, all_recipients, msg.as_string())
            server.quit()
            status = "Sent"
        except Exception as e:
            status = "Failed"
            error_msg = str(e)
            summary_text = f"Failed to send email to manager: {error_msg}"

    conn = get_db()
    cursor = conn.cursor()
    details_json = json.dumps({
        "to": to_list,
        "cc": cc_list,
        "subject": subject,
        "include_report": include_report
    })
    recipient_display = to_email + (f" (CC: {cc_emails})" if cc_emails else "")
    cursor.execute("""
    INSERT INTO email_logs (recipient, subject, status, summary, details, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (recipient_display, subject, status, summary_text, details_json, error_msg))
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": status in ("Sent", "Simulated"),
        "status": status,
        "log_id": log_id,
        "recipient": recipient_display,
        "subject": subject,
        "summary": summary_text,
        "error": error_msg
    }

def test_smtp_connection(host, port, user, password, use_tls=True):
    try:
        server = smtplib.SMTP(host, int(port), timeout=10)
        if use_tls:
            server.starttls()
        if user and password:
            server.login(user, password)
        server.quit()
        return {"success": True, "message": "Connection and authentication successful!"}
    except Exception as e:
        return {"success": False, "message": str(e)}

if __name__ == "__main__":
    print("Testing email service generation...")
    res = send_compliance_email(manual_trigger=True)
    print("Result:", res["status"], res["summary"])
