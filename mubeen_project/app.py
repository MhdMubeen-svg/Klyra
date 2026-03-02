import os
from flask import Flask, render_template, request, jsonify, session
import psycopg2
import psycopg2.extras
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date
from ml_model import predict_student

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24).hex())

# ── Database URL (Neon PostgreSQL) ──
DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql://neondb_owner:npg_3UWnGdya8BLl@ep-morning-rice-aiedlc6c-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
)

# ══ DATABASE ══════════════════════════════
def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn

def init_db():
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username  VARCHAR(100) UNIQUE NOT NULL,
            email     VARCHAR(200) UNIQUE NOT NULL,
            password  TEXT NOT NULL,
            firstName VARCHAR(100) NOT NULL,
            lastName  VARCHAR(100) DEFAULT '',
            createdAt TEXT DEFAULT CURRENT_DATE
        )''')
        cur.execute('''CREATE TABLE IF NOT EXISTS students (
            id             SERIAL PRIMARY KEY,
            user_id        INTEGER NOT NULL REFERENCES users(id),
            name           VARCHAR(200) NOT NULL,
            register_no    VARCHAR(100) NOT NULL,
            dept           TEXT DEFAULT '',
            semester       TEXT DEFAULT '',
            acad_year      TEXT DEFAULT '',
            gender         VARCHAR(20) DEFAULT '',
            attendance     INTEGER DEFAULT 0,
            hour_study     INTEGER DEFAULT 0,
            internal       INTEGER DEFAULT 0,
            arrears        INTEGER DEFAULT 0,
            projects       INTEGER DEFAULT 0,
            internships    INTEGER DEFAULT 0,
            sports         INTEGER DEFAULT 0,
            outer_programs INTEGER DEFAULT 0,
            certs          INTEGER DEFAULT 0,
            leader         INTEGER DEFAULT 0,
            class_rank     TEXT DEFAULT '',
            score          INTEGER DEFAULT 0,
            level          TEXT DEFAULT 'basic',
            dt_prediction  TEXT DEFAULT '',
            rf_prediction  TEXT DEFAULT '',
            date_added     TEXT DEFAULT CURRENT_DATE
        )''')
        conn.commit()
        cur.close()
    except Exception as e:
        conn.rollback()
        print(f"[DB INIT] Error: {e}")
    finally:
        conn.close()

init_db()
print("[OK] PostgreSQL database connected and tables ready")

# ══ HELPERS ═══════════════════════════════
def safe_int(value, default=0, min_val=None, max_val=None):
    """Safely convert a value to int with optional clamping."""
    try:
        v = int(value)
    except (TypeError, ValueError):
        v = default
    if min_val is not None:
        v = max(min_val, v)
    if max_val is not None:
        v = min(max_val, v)
    return v

def calc_score(d):
    att  = safe_int(d.get('attendance', 0), 0, 0, 100)
    hrs  = safe_int(d.get('hour_study', 0), 0, 0, 16)
    intl = safe_int(d.get('internal', 0), 0, 0, 100)
    proj = safe_int(d.get('projects', 0), 0, 0, 5)
    intr = safe_int(d.get('internships', 0), 0, 0, 3)
    sp   = safe_int(d.get('sports', 0), 0, 0, 1)
    out  = safe_int(d.get('outer_programs', 0), 0, 0, 2)
    lead = safe_int(d.get('leader', 0), 0, 0, 2)
    cert = safe_int(d.get('certs', 0), 0, 0, 3)
    return max(0, min(100, round(
        att/100*25 + hrs/16*10 + intl/100*25 +
        proj/5*15  + intr/3*10 + sp*4 +
        out/2*4    + lead/2*4  + cert/3*3
    )))

def get_level(score, arrears):
    if arrears > 0 or score < 30:
        return 'ineligible'
    if score >= 80:
        return 'advanced'
    if score >= 60:
        return 'adv_intermediate'
    if score >= 50:
        return 'intermediate'
    return 'basic'

def current_user():
    uid = session.get('user_id')
    if not uid:
        return None
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT * FROM users WHERE id=%s', (uid,))
        u = cur.fetchone()
        cur.close()
        return dict(u) if u else None
    finally:
        conn.close()

def user_dict(u):
    """Return only safe user fields (never expose password hash)."""
    return {
        'id': u['id'],
        'username': u['username'],
        'email': u['email'],
        'firstName': u['firstname'],
        'lastName': u.get('lastname') or '',
        'createdAt': u.get('createdat') or ''
    }

# ══ PAGE ══════════════════════════════════
@app.route('/')
def index():
    return render_template('index.html')

# ══ AUTH API ══════════════════════════════
@app.route('/api/login', methods=['POST'])
def api_login():
    d = request.get_json()
    if not isinstance(d, dict):
        return jsonify({'ok': False, 'msg': 'Invalid request.'}), 400
    ident = (d.get('identifier') or '').strip()
    pw = d.get('password') or ''
    if not ident or not pw:
        return jsonify({'ok': False, 'msg': 'Please fill in all fields.'})
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            'SELECT * FROM users WHERE username=%s OR email=%s',
            (ident, ident.lower())
        )
        u = cur.fetchone()
        cur.close()
    finally:
        conn.close()
    if not u:
        return jsonify({'ok': False, 'msg': 'No account found with that username or email.'})
    if not check_password_hash(u['password'], pw):
        return jsonify({'ok': False, 'msg': 'Incorrect password. Please try again.'})
    session['user_id'] = u['id']
    return jsonify({'ok': True, 'user': user_dict(u)})

@app.route('/api/signup', methods=['POST'])
def api_signup():
    d = request.get_json()
    if not isinstance(d, dict):
        return jsonify({'ok': False, 'msg': 'Invalid request.'}), 400
    fn = (d.get('firstName') or '').strip()
    ln = (d.get('lastName') or '').strip()
    un = (d.get('username') or '').strip()
    em = (d.get('email') or '').strip().lower()
    pw = d.get('password') or ''
    if not fn or not un or not em or not pw:
        return jsonify({'ok': False, 'msg': 'Please fill in all required fields.'})
    if len(un) < 3:
        return jsonify({'ok': False, 'field': 'username', 'msg': 'Username must be at least 3 characters.'})
    if len(pw) < 6:
        return jsonify({'ok': False, 'field': 'password', 'msg': 'Password must be at least 6 characters.'})
    if '@' not in em:
        return jsonify({'ok': False, 'field': 'email', 'msg': 'Please enter a valid email address.'})
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT id FROM users WHERE username=%s', (un,))
        if cur.fetchone():
            cur.close()
            return jsonify({'ok': False, 'field': 'username', 'msg': 'Username already taken.'})
        cur.execute('SELECT id FROM users WHERE email=%s', (em,))
        if cur.fetchone():
            cur.close()
            return jsonify({'ok': False, 'field': 'email', 'msg': 'Email already registered.'})
        cur.execute(
            'INSERT INTO users (username,email,password,firstName,lastName) VALUES (%s,%s,%s,%s,%s)',
            (un, em, generate_password_hash(pw), fn, ln)
        )
        conn.commit()
        cur.execute('SELECT * FROM users WHERE username=%s', (un,))
        u = cur.fetchone()
        cur.close()
    finally:
        conn.close()
    session['user_id'] = u['id']
    return jsonify({'ok': True, 'user': user_dict(u)})

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'ok': True})

@app.route('/api/me')
def api_me():
    u = current_user()
    if not u:
        return jsonify({'ok': False})
    return jsonify({'ok': True, 'user': user_dict(u)})

@app.route('/api/check-username')
def api_check_username():
    un = (request.args.get('u') or '').strip()
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute('SELECT id FROM users WHERE username=%s', (un,))
        taken = cur.fetchone() is not None
        cur.close()
    finally:
        conn.close()
    return jsonify({'taken': taken})

# ══ STUDENTS API ══════════════════════════
@app.route('/api/students', methods=['GET'])
def api_get_students():
    u = current_user()
    if not u:
        return jsonify({'ok': False, 'msg': 'Not logged in'}), 401
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            'SELECT * FROM students WHERE user_id=%s ORDER BY score DESC',
            (u['id'],)
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()
    return jsonify({'ok': True, 'students': [dict(r) for r in rows]})

@app.route('/api/students', methods=['POST'])
def api_add_student():
    u = current_user()
    if not u:
        return jsonify({'ok': False, 'msg': 'Not logged in'}), 401
    d = request.get_json()
    if not isinstance(d, dict):
        return jsonify({'ok': False, 'msg': 'Invalid request.'}), 400
    name = (d.get('name') or '').strip()
    register_no = (d.get('register_no') or '').strip()
    if not name or not register_no:
        return jsonify({'ok': False, 'msg': 'Name and Register Number are required.'})
    score = calc_score(d)
    arrears = safe_int(d.get('arrears', 0), 0, 0)
    level = get_level(score, arrears)
    today = date.today().strftime('%d/%m/%Y')

    # ── ML Predictions ──
    ml_result = predict_student(
        attendance=safe_int(d.get('attendance', 0), 0, 0, 100),
        internal=safe_int(d.get('internal', 0), 0, 0, 100),
        study_hours=safe_int(d.get('hour_study', 0), 0, 0, 16),
        arrears=arrears
    )
    dt_pred = ml_result['dt_prediction']
    rf_pred = ml_result['rf_prediction']

    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('''INSERT INTO students
            (user_id,name,register_no,dept,semester,acad_year,gender,
             attendance,hour_study,internal,arrears,projects,internships,
             sports,outer_programs,certs,leader,class_rank,score,level,
             dt_prediction,rf_prediction,date_added)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id''', (
            u['id'], name, register_no,
            (d.get('dept') or '').strip(), (d.get('semester') or '').strip(),
            (d.get('acad_year') or '').strip(), (d.get('gender') or '').strip(),
            safe_int(d.get('attendance', 0)), safe_int(d.get('hour_study', 0)),
            safe_int(d.get('internal', 0)), arrears,
            safe_int(d.get('projects', 0)), safe_int(d.get('internships', 0)),
            safe_int(d.get('sports', 0)), safe_int(d.get('outer_programs', 0)),
            safe_int(d.get('certs', 0)), safe_int(d.get('leader', 0)),
            (d.get('class_rank') or '').strip(), score, level,
            dt_pred, rf_pred, today
        ))
        new_id = cur.fetchone()['id']
        conn.commit()
        cur.execute('SELECT * FROM students WHERE id=%s', (new_id,))
        student = cur.fetchone()
        cur.close()
    finally:
        conn.close()
    return jsonify({
        'ok': True, 'student': dict(student),
        'score': score, 'level': level,
        'dt_prediction': dt_pred, 'rf_prediction': rf_pred
    })

@app.route('/api/students/<int:sid>', methods=['DELETE'])
def api_delete_student(sid):
    u = current_user()
    if not u:
        return jsonify({'ok': False}), 401
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute('DELETE FROM students WHERE id=%s AND user_id=%s', (sid, u['id']))
        conn.commit()
        cur.close()
    finally:
        conn.close()
    return jsonify({'ok': True})

@app.route('/api/students/clear', methods=['DELETE'])
def api_clear_students():
    u = current_user()
    if not u:
        return jsonify({'ok': False}), 401
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute('DELETE FROM students WHERE user_id=%s', (u['id'],))
        conn.commit()
        cur.close()
    finally:
        conn.close()
    return jsonify({'ok': True})

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
