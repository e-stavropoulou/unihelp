from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.shared import db
from models.note import Note
from models.course import Course
from models.report import Report
from models.comment import Comment
from models.comment_history import CommentEditHistory
from models.course import UserCourse
from utils.decorators import admin_required
from models.notification import Notification
from utils.push_utils import send_push_notification
from datetime import datetime

admin_bp = Blueprint('admin_bp', __name__, url_prefix='/admin')

# =========================================================
# 1. ΔΙΑΧΕΙΡΙΣΗ ADMIN ΡΟΛΩΝ
# =========================================================
@admin_bp.route('/users/<int:user_id>/role', methods=['PATCH'])
@jwt_required()
@admin_required
def change_user_role(user_id):
    current_admin_id = int(get_jwt_identity())
    if user_id == current_admin_id:
        return jsonify({"error": "Δεν μπορείς να αλλάξεις τον δικό σου ρόλο"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    new_role = data.get("role")
    if new_role not in ("user", "admin"):
        return jsonify({"error": "Invalid role"}), 400

    user.role = new_role
    db.session.commit()
    return jsonify({"message": f"User role changed to {new_role}."}), 200


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

    top_users = User.query.order_by(User.upoints.desc()).limit(10).all()

    course_stats = db.session.query(
        Course.name, db.func.count(Note.id)
    ).join(Note, Note.course_id == Course.id)\
     .group_by(Course.id)\
     .order_by(db.func.count(Note.id).desc())\
     .limit(5).all()

    top_commented = db.session.query(
        Note.id, Note.title, db.func.count(Comment.id)
    ).join(Comment, Comment.note_id == Note.id)\
     .group_by(Note.id)\
     .order_by(db.func.count(Comment.id).desc()).first()

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

    def get_courses(uc_list, key):
        return [uc.course.name for uc in uc_list if getattr(uc, key)]

    return jsonify([{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "upoints": u.upoints,
        "role": u.role,
        "blocked": u.is_blocked,
        "can_help": get_courses(u.user_courses, "can_help"),
        "needs_help": get_courses(u.user_courses, "needs_help")
    } for u in users]), 200



# =========================================================
# 5. ΔΙΑΧΕΙΡΙΣΗ ΣΗΜΕΙΩΣΕΩΝ ΚΑΙ ΣΧΟΛΙΩΝ
# =========================================================
@admin_bp.route('/notes', methods=['GET'])
@jwt_required()
@admin_required
def get_all_notes():
    notes = Note.query.order_by(Note.upload_date.desc()).all()

    result = []
    for n in notes:
        course = Course.query.get(n.course_id)
        uploader = User.query.get(n.user_id)

        note_data = {
            "id": n.id,
            "title": n.title,
            "description": n.description,
            "category": n.category,
            "upload_date": n.upload_date.isoformat() if n.upload_date else None,
            "filepath": f"/static/notes/{n.filename}" if n.filename else None,
            "course": course.name if course else "Άγνωστο",
            "semester": course.semester if course else None,
            "type": course.type if course else None,
            "uploader": uploader.username if uploader else "Άγνωστος",
            "downloads": n.downloads,
            "comments": []
        }

        for c in n.comments:
            comment_data = {
                "id": c.id,
                "text": c.text,
                "edited": c.is_edited,
                "author": c.user.username if c.user else None,
                "created_at": c.timestamp.isoformat() if c.timestamp else None,
                "updated_at": c.edited_at.isoformat() if c.edited_at else None,
                "original_text": c.original_text,
                "history": [
                    {
                        "previous_text": h.previous_text,
                        "edited_at": h.edited_at.isoformat() if h.edited_at else None
                    } for h in c.edit_history
                ] if c.edit_history else []
            }
            note_data["comments"].append(comment_data)

        result.append(note_data)

    return jsonify(result), 200



@admin_bp.route('/notes/<int:note_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_note(note_id):
    note = Note.query.get(note_id)
    if not note:
        return jsonify({"error": "Note not found"}), 404
    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Note deleted"}), 200


@admin_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_comment(comment_id):
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({"error": "Comment not found"}), 404
    db.session.delete(comment)
    db.session.commit()
    return jsonify({"message": "Comment deleted"}), 200


# =========================================================
# 6. ΠΡΟΣΘΗΚΗ ΝΕΟΥ ΜΑΘΗΜΑΤΟΣ
# =========================================================
@admin_bp.route('/add-course', methods=['POST'])
@jwt_required()
@admin_required
def add_course():
    data = request.get_json()
    name = data.get('name')
    semester = data.get('semester')
    ctype = data.get('type')

    if not name or not semester or not ctype:
        return jsonify({'error': 'Λείπουν απαιτούμενα πεδία'}), 400

    # Προαιρετικός καθαρισμός
    name = name.strip()
    ctype = ctype.strip()

    # Έλεγχος αν υπάρχει ήδη μάθημα με το ίδιο όνομα
    existing = Course.query.filter_by(name=name).first()
    if existing:
        return jsonify({'error': 'Το μάθημα υπάρχει ήδη'}), 409

    # Δημιουργία νέου μαθήματος
    new_course = Course(name=name, semester=semester, type=ctype)
    db.session.add(new_course)
    db.session.commit()

    return jsonify({'message': 'Το μάθημα προστέθηκε επιτυχώς'}), 200

@admin_bp.route('/courses/<int:course_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_course(course_id):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    # Προαιρετικά: έλεγχος αν το μάθημα έχει σημειώσεις
    notes_count = Note.query.filter_by(course_id=course.id).count()
    if notes_count > 0:
        return jsonify({
            "error": "Δεν μπορεί να διαγραφεί. Υπάρχουν συνδεδεμένες σημειώσεις."
        }), 409

    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Το μάθημα διαγράφηκε επιτυχώς"}), 200

@admin_bp.route('/courses', methods=['GET'])
@jwt_required()
@admin_required
def get_courses():
    courses = Course.query.order_by(Course.semester.asc()).all()
    return jsonify([
        {
            "id": c.id,
            "name": c.name,
            "semester": c.semester,
            "type": c.type
        }
        for c in courses
    ]), 200

@admin_bp.route('/courses/<int:course_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_course(course_id):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    data = request.get_json()
    new_semester = data.get("semester")
    new_type = data.get("type")

    if new_semester is not None:
        course.semester = new_semester
    if new_type:
        course.type = new_type.strip()

    db.session.commit()
    return jsonify({"message": "Το μάθημα ενημερώθηκε επιτυχώς"}), 200

@admin_bp.route('/users/<int:user_id>/block', methods=['PATCH'])
@jwt_required()
@admin_required
def toggle_block_user(user_id):
    current_admin_id = int(get_jwt_identity())
    if user_id == current_admin_id:
        return jsonify({"error": "Δεν μπορείς να μπλοκάρεις τον εαυτό σου"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    is_blocked = data.get("is_blocked")
    if type(is_blocked) is not bool:
        return jsonify({"error": "Missing or invalid is_blocked"}), 400

    user.is_blocked = is_blocked
    db.session.commit()

    # 🔔 Δημιουργία ειδοποίησης
    message = "Ο λογαριασμός σου έχει μπλοκαριστεί από τον διαχειριστή." if is_blocked \
              else "Ο λογαριασμός σου έχει επανενεργοποιηθεί."
    notif = Notification(
        user_id=user.id,
        message=message,
        timestamp=datetime.utcnow(),
        is_read=False
    )
    db.session.add(notif)
    db.session.commit()

    # 📲 Push notification
    if user.fcm_token:
        try:
            status, resp = send_push_notification(
                token=user.fcm_token,
                title="⚠️ Ενημέρωση Λογαριασμού",
                body=message,
                data={"type": "account_block" if is_blocked else "account_unblock"}
            )
            print(f"✅ Push sent to {user.username}, status={status}")
        except Exception as e:
            print(f"❌ Failed to send push: {e}")

    return jsonify({"message": f"User {'blocked' if is_blocked else 'unblocked'}."}), 200