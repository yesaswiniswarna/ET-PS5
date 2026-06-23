import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "aeroguard.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create pollution reports table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pollution_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        city TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        photo_url TEXT,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending'
    )
    """)
    
    # Create inspector dispatches table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dispatches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER,
        ward_name TEXT NOT NULL,
        inspector_name TEXT NOT NULL,
        action_taken TEXT NOT NULL,
        dispatch_time TEXT NOT NULL,
        FOREIGN KEY (report_id) REFERENCES pollution_reports (id)
    )
    """)
    
    conn.commit()
    conn.close()
    print("SQLite Database initialized at:", DB_PATH)

def add_report(city, lat, lng, category, description, photo_url, timestamp):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO pollution_reports (city, lat, lng, category, description, photo_url, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
    """, (city, lat, lng, category, description, photo_url, timestamp))
    conn.commit()
    report_id = cursor.lastrowid
    conn.close()
    return report_id

def get_reports(city=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if city:
        cursor.execute("SELECT * FROM pollution_reports WHERE city = ? ORDER BY timestamp DESC", (city,))
    else:
        cursor.execute("SELECT * FROM pollution_reports ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_report_status(report_id, status):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE pollution_reports SET status = ? WHERE id = ?", (status, report_id))
    conn.commit()
    conn.close()

def add_dispatch(report_id, ward_name, inspector_name, action_taken, dispatch_time):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO dispatches (report_id, ward_name, inspector_name, action_taken, dispatch_time)
    VALUES (?, ?, ?, ?, ?)
    """, (report_id, ward_name, inspector_name, action_taken, dispatch_time))
    conn.commit()
    dispatch_id = cursor.lastrowid
    if report_id:
        cursor.execute("UPDATE pollution_reports SET status = 'Dispatched' WHERE id = ?", (report_id,))
        conn.commit()
    conn.close()
    return dispatch_id

def get_dispatches():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM dispatches ORDER BY dispatch_time DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

if __name__ == "__main__":
    init_db()
