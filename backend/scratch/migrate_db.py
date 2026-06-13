import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE tenders ADD COLUMN bid_detail_url VARCHAR;"))
            print("Added bid_detail_url")
        except Exception as e:
            print("Error adding bid_detail_url:", e)
        
        try:
            conn.execute(text("ALTER TABLE tenders ADD COLUMN pdf_url VARCHAR;"))
            print("Added pdf_url")
        except Exception as e:
            print("Error adding pdf_url:", e)
        
        conn.commit()

if __name__ == "__main__":
    run_migration()
