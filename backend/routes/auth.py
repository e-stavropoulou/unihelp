from flask import Blueprint, request, jsonify, send_from_directory
from models.user import db, User
from models.course import Course
import re
import os
from werkzeug.utils import secure_filename
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from models.note import Note
from models.favorite import Favorite

auth_bp = Blueprint('auth', __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'avatars')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

NOTES_UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'notes')
os.makedirs(NOTES_UPLOAD_FOLDER, exist_ok=True)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email', '').strip()
    password = data.get('password', '')
    birthdate_str = data.get('birthdate', '')

    # Έλεγχος email format
    if not re.match(r'.+@(upatras\.gr|ceid\.upatras\.gr)$', email):
        return jsonify({'error': 'Μη έγκυρο email'}), 400

    # Έλεγχος αν υπάρχει ήδη
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Το email υπάρχει ήδη'}), 400

    # Έλεγχος ισχυρού κωδικού
    if len(password) < 8:
        return jsonify({'error': 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.'}), 400

    # Έλεγχος ημερομηνίας (format, μέλλον, ηλικία)
    try:
        birthdate_obj = datetime.strptime(birthdate_str, "%d-%m-%Y")
    except ValueError:
        return jsonify({'error': 'Μη έγκυρη μορφή ημερομηνίας. Χρησιμοποίησε dd-mm-yyyy.'}), 400

    today = datetime.today()
    age = (today - birthdate_obj).days // 365

    if birthdate_obj > today:
        return jsonify({'error': 'Η ημερομηνία γέννησης δεν μπορεί να είναι στο μέλλον.'}), 400

    if age < 17:
        return jsonify({'error': 'Πρέπει να είσαι τουλάχιστον 17 ετών για να εγγραφείς.'}), 400

    # Δημιουργία χρήστη
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

    selected_courses = data.get('skills', [])
    for course_name in selected_courses:
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

    email_exists = User.query.filter_by(email=email).first() is not None
    username_exists = User.query.filter_by(username=username).first() is not None

    return jsonify({
        'email_exists': email_exists,
        'username_exists': username_exists
    }), 200



@auth_bp.route('/courses', methods=['GET'])
def get_courses():
    courses = Course.query.all()
    result = [{"id": course.id, "name": course.name} for course in courses]
    return jsonify(result), 200

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

    return jsonify({'message': 'Επιτυχής σύνδεση', 'email': user.email}), 200


@auth_bp.route('/upload-note', methods=['POST'])
def upload_note():
    files = request.files.getlist('files')
    user_email = request.form.get('email')
    course_id = request.form.get('course_id')
    title = request.form.get('title')
    description = request.form.get('description')
    category = request.form.get('category')

    if not files or not user_email or not course_id or not title or not category:
        return jsonify({'error': 'Λείπουν απαιτούμενα πεδία'}), 400

    user = User.query.filter_by(email=user_email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

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
def get_my_notes():
    email = request.args.get('email')
    if not email:
        return jsonify({'error': 'Missing email'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    notes = Note.query.filter_by(user_id=user.id).order_by(Note.upload_date.desc()).all()

    result = []
    for note in notes:
        course = Course.query.get(note.course_id)
        result.append({
            'title': note.title,
            'description': note.description,
            'category': note.category,
            'upload_date': note.upload_date.strftime('%d/%m/%Y'),
            'filepath': f'http://127.0.0.1:5000/static/notes/{note.filename}',
            'course': course.name if course else 'Άγνωστο'
        })

    return jsonify(result), 200

@auth_bp.route('/static/notes/<filename>')
def serve_note_file(filename):
    return send_from_directory(NOTES_UPLOAD_FOLDER, filename)

@auth_bp.route('/all-notes', methods=['GET'])
def get_all_notes():
    email = request.args.get('email')
    user = User.query.filter_by(email=email).first() if email else None
    user_fav_note_ids = [fav.note_id for fav in Favorite.query.filter_by(user_id=user.id).all()] if user else []

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
            'filepath': f'http://127.0.0.1:5000/static/notes/{note.filename}',
            'course': course.name if course else 'Άγνωστο',
            'uploader': user_.username if user_ else 'Άγνωστος',
            'isFavorite': note.id in user_fav_note_ids
        })

    return jsonify(result), 200



@auth_bp.route('/favorites/<email>', methods=['GET'])
def get_favorites(email):
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    favorites = Favorite.query.filter_by(user_id=user.id).all()
    note_ids = [fav.note_id for fav in favorites]

    # Πάρε όλα τα notes που είναι αγαπημένα
    notes = Note.query.filter(Note.id.in_(note_ids)).order_by(Note.upload_date.desc()).all()

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
            'filepath': f'http://127.0.0.1:5000/static/notes/{note.filename}',
            'course': course.name if course else 'Άγνωστο',
            'uploader': user_.username if user_ else 'Άγνωστος'
        })

    return jsonify(result), 200

@auth_bp.route('/favorite', methods=['POST'])
def toggle_favorite():
    data = request.json
    email = data.get('email')
    note_id = data.get('note_id')

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

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
