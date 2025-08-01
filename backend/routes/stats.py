from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from models.user import User
from models.note import Note
from sqlalchemy import func

stats_bp = Blueprint('stats', __name__)

# -----------------------------
# 1. Συνολικοί χρήστες και admins
# -----------------------------
@stats_bp.route('/stats/users', methods=['GET'])
@jwt_required()
def stats_users():
    total_users = User.query.count()
    admins = User.query.filter_by(role='admin').count()

    return jsonify({
        "total_users": total_users,
        "admins": admins
    }), 200


# -----------------------------
# 2. Top contributors
# -----------------------------
@stats_bp.route('/stats/top-contributors', methods=['GET'])
@jwt_required()
def stats_top_contributors():
    # Παίρνει top 5 χρήστες με βάση τον αριθμό σημειώσεων
    results = (
        User.query
        .join(Note, User.id == Note.user_id)
        .with_entities(User.username, func.count(Note.id).label('uploads'))
        .group_by(User.id, User.username)
        .order_by(func.count(Note.id).desc())
        .limit(5)
        .all()
    )

    data = [{"username": r.username, "uploads": r.uploads} for r in results]
    return jsonify(data), 200


# -----------------------------
# 3. Σημειώσεις ανά μάθημα
# -----------------------------
@stats_bp.route('/stats/notes-by-course', methods=['GET'])
@jwt_required()
def stats_notes_by_course():
    # Παίρνει το πλήθος σημειώσεων ανά μάθημα
    results = (
        Note.query
        .with_entities(Note.course, func.count(Note.id).label('count'))
        .group_by(Note.course)
        .all()
    )

    data = [{"course": r.course, "count": r.count} for r in results]
    return jsonify(data), 200
