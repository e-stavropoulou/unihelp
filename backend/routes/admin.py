from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.shared import db
from models.note import Note
from models.course import Course
from models.report import Report
from models.comment import Comment  # αν έχεις comments
from utils.decorators import admin_required

admin_bp = Blueprint('admin_bp', __name__, url_prefix='/admin')


# =========================================================
# 1. ΔΙΑΧΕΙΡΙΣΗ ADMIN ΡΟΛΩΝ
# =========================================================
@admin_bp.route('/make-admin/<int:user_id>', methods=['POST'])
@jwt_required()
@admin_required
def make_admin(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.role == 'admin':
        return jsonify({'message': f'{user.username} is already an admin.'}), 200

    user.role = 'admin'
    db.session.commit()
    return jsonify({'message': f'{user.username} has been promoted to admin.'}), 200


@admin_bp.route('/admins', methods=['GET'])
@jwt_required()
@admin_required
def get_admins():
    admins = User.query.filter_by(role='admin').all()
    return jsonify([{
        'id': a.id,
        'username': a.username,
        'email': a.email,
        'full_name': a.full_name
    } for a in admins]), 200


@admin_bp.route('/remove-admin/<int:user_id>', methods=['POST'])
@jwt_required()
@admin_required
def remove_admin(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.role != 'admin':
        return jsonify({'message': f'{user.username} is not an admin.'}), 400
    user.role = 'user'
    db.session.commit()
    return jsonify({'message': f'{user.username} is no longer an admin.'}), 200


@admin_bp.route('/dashboard-access', methods=['GET'])
@jwt_required()
@admin_required
def admin_dashboard_access():
    return jsonify({"access": "granted"}), 200


# =========================================================
# 2. ΣΤΑΤΙΣΤΙΚΑ DASHBOARD
# =========================================================
@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
@admin_required
def dashboard_stats():
    total_users = User.query.count()
    total_notes = Note.query.count()

    # Top 10 χρήστες με πόντους
    top_users = User.query.order_by(User.upoints.desc()).limit(10).all()

    # Μαθήματα με τα περισσότερα αρχεία
    course_stats = db.session.query(
        Course.name, db.func.count(Note.id)
    ).join(Note, Note.course_id == Course.id)\
     .group_by(Course.id)\
     .order_by(db.func.count(Note.id).desc())\
     .limit(5).all()

    # Σημείωση με τα περισσότερα σχόλια (αν υπάρχει Comment model)
    top_commented = None
    if 'Comment' in globals():
        top_commented = db.session.query(
            Note.id, Note.title, db.func.count(Comment.id)
        ).join(Comment, Comment.note_id == Note.id)\
         .group_by(Note.id)\
         .order_by(db.func.count(Comment.id).desc()).first()

    # Σημείωση με τις περισσότερες λήψεις
    top_downloaded = Note.query.order_by(Note.downloads.desc()).first()

    return jsonify({
        "total_users": total_users,
        "total_notes": total_notes,
        "top_users": [{"username": u.username, "points": u.upoints} for u in top_users],
        "top_courses": [{"course": c[0], "count": c[1]} for c in course_stats],
        "top_commented_note": {
            "id": top_commented[0],
            "title": top_commented[1],
            "comments": top_commented[2]
        } if top_commented else None,
        "top_downloaded_note": {
            "id": top_downloaded.id,
            "title": top_downloaded.title,
            "downloads": top_downloaded.downloads
        } if top_downloaded else None
    })


# =========================================================
# 3. ΔΙΑΧΕΙΡΙΣΗ ΑΝΑΦΟΡΩΝ
# =========================================================
@admin_bp.route('/reports', methods=['GET'])
@jwt_required()
@admin_required
def get_reports():
    reports = Report.query.all()
    return jsonify([r.to_dict() for r in reports])


@admin_bp.route('/reports/<int:report_id>/resolve', methods=['POST'])
@jwt_required()
@admin_required
def resolve_report(report_id):
    data = request.get_json()
    action = data.get('action')  # "accept" ή "reject"
    if action not in ["accept", "reject"]:
        return jsonify({"error": "Invalid action"}), 400

    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    report.status = action
    db.session.commit()
    return jsonify({"message": f"Report {action}ed."})


# =========================================================
# 4. ΔΙΑΧΕΙΡΙΣΗ ΧΡΗΣΤΩΝ
# =========================================================
@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    users = User.query.all()
    return jsonify([{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "upoints": u.upoints,
        "blocked": getattr(u, "is_blocked", False)
    } for u in users])


@admin_bp.route('/users/<int:user_id>/block', methods=['POST'])
@jwt_required()
@admin_required
def block_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user.is_blocked = True
    db.session.commit()
    return jsonify({"message": "User blocked"})


# =========================================================
# 5. ΔΙΑΧΕΙΡΙΣΗ ΣΗΜΕΙΩΣΕΩΝ
# =========================================================
@admin_bp.route('/notes', methods=['GET'])
@jwt_required()
@admin_required
def get_all_notes():
    notes = Note.query.all()
    return jsonify([{
        "id": n.id,
        "title": n.title,
        "uploader": n.user.username,
        "downloads": n.downloads
    } for n in notes])


@admin_bp.route('/notes/<int:note_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_note(note_id):
    note = Note.query.get(note_id)
    if not note:
        return jsonify({"error": "Note not found"}), 404
    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Note deleted"})
