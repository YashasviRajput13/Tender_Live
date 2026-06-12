"""
Migration: Fix CPPP source_url records that contain session-based tendersfullview URLs.

Run this script from the project root:
    python migrate_cppp_urls.py

It will:
  1. Fix dev.db (SQLite) - used in local development
  2. Fix the running Docker PostgreSQL container (if accessible)
"""

import base64
import sqlite3
import re
from urllib.parse import quote


def build_stable_url(href: str, tender_ref: str = "") -> str:
    """
    Convert a CPPP tendersfullview session URL to a permanent NIC eProcure URL.
    Mirrors the fixed logic in cppp_scraper.py.
    """
    try:
        path_parts = href.rstrip('/').split('/')
        last_part = path_parts[-1]
        first_segment = last_part.split('A13h1')[0]
        # Strip existing padding before re-padding
        first_segment = first_segment.rstrip('=')
        padding_needed = (4 - len(first_segment) % 4) % 4
        padded = first_segment + '=' * padding_needed
        decoded = base64.b64decode(padded).decode('utf-8', errors='ignore').strip()
        if decoded.isdigit():
            return f"https://eprocure.gov.in/eprocure/app?page=FrontEndTenderDetails&service=page&id={decoded}"
    except Exception as e:
        print(f"  [WARN] base64 decode failed for {href[:60]}...: {e}")

    # Fallback: search by reference
    safe_ref = quote(tender_ref.strip(), safe='')
    return f"https://eprocure.gov.in/eprocure/app?page=FrontEndAdvancedSearchPage&service=page&searchKey={safe_ref}"


# ──────────────────────────────────────────────
# 1. Fix dev.db (SQLite)
# ──────────────────────────────────────────────
print("=" * 60)
print("Step 1: Migrating dev.db (SQLite)")
print("=" * 60)

try:
    conn = sqlite3.connect("dev.db")
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, tender_id, source_url FROM tenders WHERE source_name='CPPP' AND source_url LIKE '%tendersfullview%'"
    )
    rows = cursor.fetchall()
    print(f"Found {len(rows)} CPPP records with session-based URLs in dev.db\n")

    updated = 0
    for row_id, tender_id, source_url in rows:
        new_url = build_stable_url(source_url, tender_id)
        print(f"  ID={row_id}  [{tender_id[:30]}]")
        print(f"    OLD: {source_url[:80]}...")
        print(f"    NEW: {new_url}")
        cursor.execute("UPDATE tenders SET source_url=? WHERE id=?", (new_url, row_id))
        updated += 1

    conn.commit()
    conn.close()
    print(f"\n[OK] dev.db: Updated {updated} records.\n")

except Exception as e:
    print(f"[ERROR] dev.db migration failed: {e}\n")


# ──────────────────────────────────────────────
# 2. Fix Docker PostgreSQL
# ──────────────────────────────────────────────
print("=" * 60)
print("Step 2: Migrating Docker PostgreSQL")
print("=" * 60)

try:
    import psycopg2

    conn_pg = psycopg2.connect(
        host="localhost",
        port=5432,
        dbname="tenderai",
        user="postgres",
        password="postgres_secure_pwd"
    )
    cursor_pg = conn_pg.cursor()

    cursor_pg.execute(
        "SELECT id, tender_id, source_url FROM tenders WHERE source_name='CPPP' AND source_url LIKE '%tendersfullview%'"
    )
    rows_pg = cursor_pg.fetchall()
    print(f"Found {len(rows_pg)} CPPP records with session-based URLs in PostgreSQL\n")

    updated_pg = 0
    for row_id, tender_id, source_url in rows_pg:
        new_url = build_stable_url(source_url, tender_id)
        print(f"  ID={row_id}  [{tender_id[:30]}]")
        print(f"    OLD: {source_url[:80]}...")
        print(f"    NEW: {new_url}")
        cursor_pg.execute("UPDATE tenders SET source_url=%s WHERE id=%s", (new_url, row_id))
        updated_pg += 1

    conn_pg.commit()
    conn_pg.close()
    print(f"\n[OK] PostgreSQL: Updated {updated_pg} records.\n")

except ImportError:
    print("[SKIP] psycopg2 not installed locally -- skipping PostgreSQL migration.")
    print("   Run inside Docker instead:\n")
    print("   docker exec -it tenderai-backend python /app/migrate_cppp_urls.py\n")
except Exception as e:
    print(f"[ERROR] PostgreSQL migration failed: {e}")
    print("   Try running inside the Docker container:\n")
    print("   docker exec -it tenderai-backend python /app/migrate_cppp_urls.py\n")

print("=" * 60)
print("Migration complete.")
print("=" * 60)
