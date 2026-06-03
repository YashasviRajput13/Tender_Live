import traceback
from config import settings
import psycopg2

print('DATABASE_URL=', settings.DATABASE_URL)
try:
    conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=5)
    print('connected')
    conn.close()
except Exception:
    traceback.print_exc()
