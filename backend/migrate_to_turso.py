import sqlite3
import libsql_client
import sys
import time

TURSO_URL = "https://uuds-training-khurram.aws-ap-south-1.turso.io"
TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTUzNDMzODcsImlkIjoiMDFhMjAyY2QtZDEwMS03NDBhLTkzY2MtMWMyMzdkZjNmOGQxIiwia2lkIjoiR01OZzY4czd0MTkta1B3aUZOX21rQVktaEZ0cDRMaHJUaVl5R2VrSE9aNCIsInJpZCI6IjA2OTYzOGExLTdjMzMtNDY4ZC1hYTE2LTk0MWI5YTI1M2UwMSJ9.DswYCcnFtw_nKs9LN5-3rZfXoBURLZbz1sG8qzsBQ7ya7GfeYQAHP7V3dMUubMJuslAyQT3dsDnjUvqcIx8QDg"

LOCAL_DB = "backend/uuds_training.db"

def migrate():
    print("=" * 60)
    print("STARTING TURSO DATABASE MIGRATION")
    print("=" * 60)

    # 1. Connect local
    local_conn = sqlite3.connect(LOCAL_DB)
    local_cur = local_conn.cursor()

    # 2. Connect Turso
    print("Connecting to Turso Cloud...")
    turso = libsql_client.create_client_sync(url=TURSO_URL, auth_token=TURSO_TOKEN)

    # 3. Create Schema
    tables_order = ['users', 'employees', 'courses', 'training_records', 'audit_logs', 'email_logs', 'settings']
    
    print("\n[1/3] Creating tables and indexes in Turso...")
    for t in tables_order:
        local_cur.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{t}'")
        row = local_cur.fetchone()
        if row and row[0]:
            print(f"  Creating table {t}...")
            turso.execute(f"DROP TABLE IF EXISTS {t}")
            turso.execute(row[0])

    # Create indexes
    local_cur.execute("SELECT sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL")
    for row in local_cur.fetchall():
        idx_sql = row[0]
        if idx_sql:
            try:
                turso.execute(idx_sql)
            except Exception as e:
                print(f"  Index warning: {e}")

    # 4. Migrate Data
    print("\n[2/3] Migrating data into Turso...")
    BATCH_SIZE = 250

    for t in tables_order:
        local_cur.execute(f"PRAGMA table_info({t})")
        cols = [c[1] for c in local_cur.fetchall()]
        cols_str = ", ".join(cols)
        placeholders = ", ".join(["?"] * len(cols))
        insert_sql = f"INSERT INTO {t} ({cols_str}) VALUES ({placeholders})"

        local_cur.execute(f"SELECT {cols_str} FROM {t}")
        rows = local_cur.fetchall()
        total_rows = len(rows)
        print(f"  Migrating {t} ({total_rows} rows)...")

        for i in range(0, total_rows, BATCH_SIZE):
            chunk = rows[i:i + BATCH_SIZE]
            stmts = [(insert_sql, list(r)) for r in chunk]
            turso.batch(stmts)
            print(f"    Inserted {min(i + BATCH_SIZE, total_rows)}/{total_rows} rows...")

    # 5. Verification
    print("\n[3/3] Verifying row counts...")
    all_match = True
    for t in tables_order:
        local_cur.execute(f"SELECT COUNT(*) FROM {t}")
        local_cnt = local_cur.fetchone()[0]

        res = turso.execute(f"SELECT COUNT(*) as cnt FROM {t}")
        turso_cnt = res.rows[0]["cnt"]

        match_str = "MATCH [OK]" if local_cnt == turso_cnt else "MISMATCH [ERROR]"
        if local_cnt != turso_cnt:
            all_match = False
        print(f"  {t:20}: Local={local_cnt:6} | Turso={turso_cnt:6} -> {match_str}")

    local_conn.close()
    turso.close()

    print("=" * 60)
    if all_match:
        print("MIGRATION COMPLETED SUCCESSFULLY! All data verified.")
    else:
        print("WARNING: Some row counts did not match.")
    print("=" * 60)

if __name__ == "__main__":
    migrate()
