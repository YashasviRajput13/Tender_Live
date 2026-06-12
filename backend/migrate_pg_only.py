import psycopg2
import base64
from urllib.parse import quote


def build_stable_url(href, tender_ref=""):
    try:
        path_parts = href.rstrip('/').split('/')
        last_part = path_parts[-1]
        first_segment = last_part.split('A13h1')[0]
        first_segment = first_segment.rstrip('=')
        padding_needed = (4 - len(first_segment) % 4) % 4
        padded = first_segment + '=' * padding_needed
        decoded = base64.b64decode(padded).decode('utf-8', errors='ignore').strip()
        if decoded.isdigit():
            return f"https://eprocure.gov.in/eprocure/app?page=FrontEndTenderDetails&service=page&id={decoded}"
    except Exception as e:
        print(f"  [WARN] decode failed: {e}")
    safe_ref = quote(tender_ref.strip(), safe='')
    return f"https://eprocure.gov.in/eprocure/app?page=FrontEndAdvancedSearchPage&service=page&searchKey={safe_ref}"


conn = psycopg2.connect(host='db', port=5432, dbname='tenderai', user='postgres', password='postgres_secure_pwd')
cur = conn.cursor()
cur.execute("SELECT id, tender_id, source_url FROM tenders WHERE source_name='CPPP' AND source_url LIKE '%tendersfullview%'")
rows = cur.fetchall()
print(f"Found {len(rows)} CPPP records with session-based URLs in PostgreSQL")

updated = 0
for row_id, tender_id, source_url in rows:
    new_url = build_stable_url(source_url, tender_id)
    print(f"  ID={row_id} [{tender_id}]")
    print(f"    OLD: {source_url[:80]}...")
    print(f"    NEW: {new_url}")
    cur.execute("UPDATE tenders SET source_url=%s WHERE id=%s", (new_url, row_id))
    updated += 1

conn.commit()
conn.close()
print(f"\n[OK] PostgreSQL: Updated {updated} records.")
