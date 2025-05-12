from flask import Blueprint, request, jsonify, send_from_directory
from models.user import db, User
from models.course import Course
from models.note import Note
from models.favorite import Favorite
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from config import BASE_URL, JWT_SECRET
from utils.jwt_utils import require_token
import os
import jwt
import re

auth_bp = Blueprint('auth', __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'avatars')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

NOTES_UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'notes')
os.makedirs(NOTES_UPLOAD_FOLDER, exist_ok=True)

JWT_EXPIRATION_MINUTES = 60

# Μη προστατευμένα endpoints
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email', '').strip()
    password = data.get('password', '')
    birthdate_str = data.get('birthdate', '')

    if not re.match(r'.+@(upatras\.gr|ceid\.upatras\.gr)$', email):
        return jsonify({'error': 'Μη έγκυρο email'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Το email υπάρχει ήδη'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.'}), 400
    try:
        birthdate_obj = datetime.strptime(birthdate_str, "%d-%m-%Y")
    except ValueError:
        return jsonify({'error': 'Μη έγκυρη μορφή ημερομηνίας.'}), 400
    today = datetime.today()
    age = (today - birthdate_obj).days // 365
    if birthdate_obj > today or age < 17:
        return jsonify({'error': 'Πρέπει να είσαι τουλάχιστον 17 ετών.'}), 400

    user = User(
        email=email,
        username=data.get('username'),
        full_name=data.get('fullName'),
        password=generate_password_hash(password),
        semester=data.get('semester'),
        year=data.get('year'),
        birthdate=birthdate_str,
        department=data.get('department', "Μηχανικών Η/Υ και Πληροφορικής")
    )

    for course_name in data.get('skills', []):
        course = Course.query.filter_by(name=course_name).first()
        if course:
            user.courses.append(course)

    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Εγγραφή επιτυχής'}), 201

@auth_bp.route('/check-credentials', methods=['POST'])
def check_credentials():
    data = request.json
    email = data.get('email', '').strip()
    username = data.get('username', '').strip()
    return jsonify({
        'email_exists': User.query.filter_by(email=email).first() is not None,
        'username_exists': User.query.filter_by(username=username).first() is not None
    }), 200

@auth_bp.route('/courses', methods=['GET'])
def get_courses():
    courses = Course.query.all()
    return jsonify([{"id": c.id, "name": c.name} for c in courses]), 200

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'error': 'Ο χρήστης δεν βρέθηκε'}), 404
    if not check_password_hash(user.password, password):
        return jsonify({'error': 'Λανθασμένος κωδικός'}), 401

    payload = {
        'email': user.email,
        'exp': datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return jsonify({'message': 'Επιτυχής σύνδεση', 'email': user.email, 'token': token}), 200

# Προστατευμένα endpoints
@auth_bp.route('/upload-note', methods=['POST'])
@require_token
def upload_note():
    user_email = request.user_email
    user = User.query.filter_by(email=user_email).first()

    files = request.files.getlist('files')
    course_id = request.form.get('course_id')
    title = request.form.get('title')
    description = request.form.get('description')
    category = request.form.get('category')

    if not files or not course_id or not title or not category:
        return jsonify({'error': 'Λείπουν απαιτούμενα πεδία'}), 400

    uploaded_files = []
    for file in files:
        if file.filename == '':
            continue
        filename = secure_filename(file.filename)
        filepath = os.path.join(NOTES_UPLOAD_FOLDER, filename)
        file.save(filepath)
        note = Note(
            user_id=user.id,
            course_id=course_id,
            title=title,
            description=description,
            category=category,
            filename=filename,
            filepath=filepath
        )
        db.session.add(note)
        uploaded_files.append(filename)

    db.session.commit()
    return jsonify({'message': 'Οι σημειώσεις ανέβηκαν επιτυχώς', 'files': uploaded_files}), 200

@auth_bp.route('/my-notes', methods=['GET'])
@require_token
def get_my_notes():
    user = User.query.filter_by(email=request.user_email).first()
    notes = Note.query.filter_by(user_id=user.id).order_by(Note.upload_date.desc()).all()
    result = [{
        'title': note.title,
        'description': note.description,
        'category': note.category,
        'upload_date': note.upload_date.strftime('%d/%m/%Y'),
        'filepath': f'{BASE_URL}/static/notes/{note.filename}',
        'course': Course.query.get(note.course_id).name if Course.query.get(note.course_id) else 'Άγνωστο'
    } for note in notes]
    return jsonify(result), 200

@auth_bp.route('/all-notes', methods=['GET'])
@require_token
def get_all_notes():
    user = User.query.filter_by(email=request.user_email).first()
    fav_ids = [fav.note_id for fav in Favorite.query.filter_by(user_id=user.id).all()]
    notes = Note.query.order_by(Note.upload_date.desc()).all()
    result = []
    for note in notes:
        user_ = User.query.get(note.user_id)
        course = Course.query.get(note.course_id)
        result.append({
            'id': note.id,
            'title': note.title,
            'description': note.description,
            'category': note.category,
            'upload_date': note.upload_date.strftime('%d/%m/%Y'),
            'filepath': f'{BASE_URL}/static/notes/{note.filename}',
            'course': course.name if course else 'Άγνωστο',
            'uploader': user_.username if user_ else 'Άγνωστος',
            'isFavorite': note.id in fav_ids
        })
    return jsonify(result), 200

@auth_bp.route('/favorites', methods=['GET'])
@require_token
def get_favorites():
    user = User.query.filter_by(email=request.user_email).first()
    favorites = Favorite.query.filter_by(user_id=user.id).all()
    note_ids = [fav.note_id for fav in favorites]
    notes = Note.query.filter(Note.id.in_(note_ids)).order_by(Note.upload_date.desc()).all()
    result = [{
        'id': note.id,
        'title': note.title,
        'description': note.description,
        'category': note.category,
        'upload_date': note.upload_date.strftime('%d/%m/%Y'),
        'filepath': f'{BASE_URL}/static/notes/{note.filename}',
        'course': Course.query.get(note.course_id).name if Course.query.get(note.course_id) else 'Άγνωστο',
        'uploader': User.query.get(note.user_id).username if User.query.get(note.user_id) else 'Άγνωστος'
    } for note in notes]
    return jsonify(result), 200

@auth_bp.route('/favorite', methods=['POST'])
@require_token
def toggle_favorite():
    user = User.query.filter_by(email=request.user_email).first()
    data = request.json
    note_id = data.get('note_id')

    existing = Favorite.query.filter_by(user_id=user.id, note_id=note_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'message': 'Αφαιρέθηκε από τα αγαπημένα.'}), 200
    else:
        new_fav = Favorite(user_id=user.id, note_id=note_id)
        db.session.add(new_fav)
        db.session.commit()
        return jsonify({'message': 'Προστέθηκε στα αγαπημένα!'}), 201

@auth_bp.route('/static/notes/<filename>')
def serve_note_file(filename):
    return send_from_directory(NOTES_UPLOAD_FOLDER, filename)

