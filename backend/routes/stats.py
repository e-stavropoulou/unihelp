from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from models.shared import db
from models.user import User
from models.note import Note
from models.course import Course

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/stats/users', methods=['GET'])
@jwt_required()
def stats_users():
    total_users = db.session.query(func.count(User.id)).scalar() or 0
    admins = db.session.query(func.count(User.id)).filter(User.role == 'admin').scalar() or 0
    return jsonify({"total_users": int(total_users), "admins": int(admins)}), 200

@stats_bp.route('/stats/top-contributors', methods=['GET'])
@jwt_required()
def stats_top_contributors():
    results = (
        db.session.query(User.username, func.count(Note.id).label('uploads'))
        .join(Note, Note.user_id == User.id)
        .group_by(User.id, User.username)
        .order_by(func.count(Note.id).desc())
        .limit(5)
        .all()
    )
    return jsonify([{"username": u, "uploads": int(n)} for (u, n) in results]), 200

@stats_bp.route('/stats/notes-by-course', methods=['GET'])
@jwt_required()
def stats_notes_by_course():
    results = (
        db.session.query(Course.name.label('course'), func.count(Note.id).label('count'))
        .join(Note, Note.course_id == Course.id)
        .group_by(Course.name)
        .order_by(func.count(Note.id).desc())
        .all()
    )
    return jsonify([{"course": c, "count": int(cnt)} for (c, cnt) in results]), 200
