from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename
from flask import send_from_directory
from models.shared import db
from models.user import User
from models.course import Course
from werkzeug.security import generate_password_hash

profile_bp = Blueprint('profile_bp', __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'avatars')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@profile_bp.route('/profile/<email>', methods=['GET'])
def get_profile(email):
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'email': user.email, 
        'username': user.username,
        'department': user.department,
        'courses': [course.name for course in user.courses],
        'avatar_url': user.avatar_url if user.avatar_url else None
    })

@profile_bp.route('/upload-avatar', methods=['POST'])
def upload_avatar():
    file = request.files.get('avatar')
    email = request.form.get('email')

    if not file or not email:
        return jsonify({'error': 'Missing file or email'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    avatar_url = f'http://127.0.0.1:5000/static/avatars/{filename}'
    user.avatar_url = avatar_url
    db.session.commit()

    return jsonify({'message': 'Avatar uploaded successfully', 'avatar_url': avatar_url}), 200

@profile_bp.route('/static/avatars/<filename>')
def serve_avatar(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@profile_bp.route('/update-profile', methods=['POST'])
def update_profile():
    data = request.get_json()
    email = data.get('email')

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.full_name = data.get('full_name', user.full_name)
    user.username = data.get('username', user.username)

    # Αν θέλει να αλλάξει password
    new_password = data.get('new_password')
    if new_password:
        user.password = generate_password_hash(new_password)

    # Αν θέλει να αλλάξει courses
    selected_courses = data.get('courses', [])
    if selected_courses:
        user.courses = []
        for course_name in selected_courses:
            course = Course.query.filter_by(name=course_name).first()
            if course:
                user.courses.append(course)

    db.session.commit()

    return jsonify({'message': 'Το προφίλ ενημερώθηκε επιτυχώς.'}), 200
