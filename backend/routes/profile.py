from flask import Blueprint, request, jsonify, send_from_directory, url_for
import os
from werkzeug.utils import secure_filename
from models.shared import db
from models.user import User
from models.course import Course, UserCourse
from werkzeug.security import generate_password_hash
from config import BASE_URL
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.sql import func
from models.user_review import UserReview


profile_bp = Blueprint('profile_bp', __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'avatars')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@profile_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # ✅ Αν ο χρήστης έχει avatar, ξαναχτίσε σωστό URL με βάση το τρέχον host
    avatar_url = None
    if user.avatar_url:
        filename = user.avatar_url.split("/")[-1]  # μόνο το όνομα αρχείου
        avatar_url = url_for("profile_bp.serve_avatar", filename=filename, _external=True)


    # ✅ Υπολογισμός μέσου όρου & πλήθους αξιολογήσεων
    avg_rating = db.session.query(func.avg(UserReview.rating)).filter_by(reviewed_id=user.id).scalar()
    review_count = db.session.query(func.count(UserReview.id)).filter_by(reviewed_id=user.id).scalar()

    return jsonify({
        'email': user.email,
        'username': user.username,
        'department': user.department,
        'avatar_url': avatar_url,  # 👈 εδώ βάζουμε το dynamic URL
        'can_help_courses': [uc.course.name for uc in user.user_courses if uc.can_help],
        'can_help_courses_ids': [uc.course_id for uc in user.user_courses if uc.can_help],
        'needs_help_courses': [uc.course.name for uc in user.user_courses if uc.needs_help],
        'needs_help_courses_ids': [uc.course_id for uc in user.user_courses if uc.needs_help],
        'upoints': user.upoints,
        'role': user.role,
        'average_rating': round(avg_rating, 2) if avg_rating else None,
        'review_count': review_count or 0
    })




@profile_bp.route('/upload-avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    file = request.files.get('avatar')
    if not file:
        return jsonify({'error': 'Missing file'}), 400

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    # 👉 Στη βάση αποθηκεύουμε μόνο το filename
    user.avatar_url = filename
    db.session.commit()

    # 👉 Το πλήρες URL το χτίζουμε με url_for
    avatar_url = url_for("profile_bp.serve_avatar", filename=filename, _external=True)


    return jsonify({'message': 'Avatar uploaded successfully', 'avatar_url': avatar_url}), 200


@profile_bp.route('/static/avatars/<filename>')
def serve_avatar(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@profile_bp.route('/update-profile', methods=['POST'])
@jwt_required()
def update_profile():
    data = request.get_json()
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.full_name = data.get('full_name', user.full_name)
    user.username = data.get('username', user.username)

    new_password = data.get('new_password')
    if new_password:
        user.password = generate_password_hash(new_password)

    selected_courses = data.get('courses', [])
    if selected_courses:
        user.courses = []
    for course_id in selected_courses:
        course = Course.query.get(course_id)
        if course:
            user.courses.append(course)


    db.session.commit()
    return jsonify({'message': 'Το προφίλ ενημερώθηκε επιτυχώς.'}), 200

@profile_bp.route('/update-needs-help', methods=['POST'])
@jwt_required()
def update_needs_help():
    data = request.get_json()
    course_id = data.get('course_id')
    needs_help = data.get('needs_help')

    if course_id is None or needs_help is None:
        return jsonify({'error': 'Missing course_id or needs_help'}), 400

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    uc = next((uc for uc in user.user_courses if uc.course_id == course_id), None)

    if uc:
        uc.needs_help = needs_help
    else:
        db.session.add(UserCourse(
            user_id=user.id,
            course_id=course_id,
            can_help=False,
            needs_help=needs_help
        ))

    db.session.commit()
    return jsonify({'message': 'Ενημερώθηκε η λίστα μαθημάτων που χρειάζεσαι βοήθεια'}), 200

@profile_bp.route('/update-can-help', methods=['POST'])
@jwt_required()
def update_can_help():
    data = request.get_json()
    course_id = data.get('course_id')
    can_help = data.get('can_help')

    if course_id is None or can_help is None:
        return jsonify({'error': 'Missing course_id or can_help'}), 400

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    uc = next((uc for uc in user.user_courses if uc.course_id == course_id), None)

    if uc:
        uc.can_help = can_help
    else:
        db.session.add(UserCourse(
            user_id=user.id,
            course_id=course_id,
            can_help=can_help,
            needs_help=False  # ή True/False ανάλογα με το προεπιλεγμένο
        ))

    db.session.commit()
    return jsonify({'message': 'Η λίστα μαθημάτων ενημερώθηκε (can_help).'}), 200
