from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func, desc
from models.shared import db
from models.user import User
from models.note import Note
from models.course import Course
from models.comment import Comment
from models.report import Report
from flask import url_for
from sqlalchemy import cast, Float
from models.user_review import UserReview
from models.note_review import NoteReview

import os

stats_bp = Blueprint('stats', __name__)

# 1. Συνολικοί χρήστες και admins
@stats_bp.route('/stats/users', methods=['GET'])
@jwt_required()
def stats_users():
    total_users = db.session.query(func.count(User.id)).scalar() or 0
    admins = db.session.query(func.count(User.id)).filter(User.role == 'admin').scalar() or 0
    return jsonify({"total_users": total_users, "admins": admins}), 200

# 2. Top Contributors (βάσει uploads)
@stats_bp.route('/stats/top-contributors', methods=['GET'])
@jwt_required()
def stats_top_contributors():
    results = (
        db.session.query(User.username, User.upoints)
        .order_by(User.upoints.desc())
        .limit(5)
        .all()
    )
    return jsonify([{"username": u, "upoints": int(p)} for (u, p) in results]), 200


# 3. Μαθήματα με τα περισσότερα αρχεία
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

# 4. Συνολικό πλήθος σημειώσεων
@stats_bp.route('/stats/total-notes', methods=['GET'])
@jwt_required()
def total_notes():
    total = db.session.query(func.count(Note.id)).scalar() or 0
    return jsonify({'total_notes': total}), 200


# 7. Συνολικός αριθμός αναφορών
@stats_bp.route('/stats/total-reports', methods=['GET'])
@jwt_required()
def total_reports():
    total = db.session.query(func.count(Report.id)).scalar() or 0
    return jsonify({'total_reports': total}), 200

# 8. Χρήστες με τις περισσότερες αναφορές
@stats_bp.route('/stats/most-reported-users', methods=['GET'])
@jwt_required()
def most_reported_users():
    results = (
        db.session.query(User.username, func.count(Report.id).label('report_count'))
        .join(Report, Report.reported_user_id == User.id)
        .group_by(User.id)
        .order_by(desc('report_count'))
        .limit(5)
        .all()
    )
    return jsonify([{"username": u, "report_count": int(r)} for (u, r) in results]), 200

# 9. Συχνές κατηγορίες παραπόνων
@stats_bp.route('/stats/report-categories', methods=['GET'])
@jwt_required()
def report_categories():
    results = (
        db.session.query(Report.category, func.count(Report.id).label('count'))
        .group_by(Report.category)
        .order_by(desc('count'))
        .all()
    )
    return jsonify([{"category": c, "count": int(n)} for (c, n) in results]), 200

@stats_bp.route('/stats/top-commented-note', methods=['GET'])
@jwt_required()
def top_commented_note():
    result = (
        db.session.query(Note.id, Note.title, Note.filename, func.count(Comment.id).label('comment_count'))
        .join(Comment, Comment.note_id == Note.id)
        .group_by(Note.id)
        .order_by(desc('comment_count'))
        .first()
    )
    if result:
        file_url = f"{os.getenv('BASE_URL')}/static/notes/{result.filename}"
        return jsonify({
            'note_id': result.id,
            'title': result.title,
            'comment_count': result.comment_count,
            'file_url': file_url
        }), 200
    return jsonify({}), 200


@stats_bp.route('/stats/top-downloaded-note', methods=['GET'])
@jwt_required()
def top_downloaded_note():
    result = (
        db.session.query(Note.id, Note.title, Note.filename, Note.downloads)
        .order_by(Note.downloads.desc())
        .first()
    )
    if result:
        file_url = f"{os.getenv('BASE_URL')}/static/notes/{result.filename}"
        return jsonify({
            'note_id': result.id,
            'title': result.title,
            'downloads': result.downloads,
            'file_url': file_url
        }), 200
    return jsonify({}), 200


@stats_bp.route('/stats/top-reported-notes', methods=['GET'])
@jwt_required()
def top_reported_notes():
    results = (
        db.session.query(
            Note.title,
            func.count(Report.id).label('report_count')
        )
        .join(Report, Report.note_id == Note.id)
        .group_by(Note.id, Note.title)
        .order_by(desc('report_count'))
        .limit(5)   # ✅ top 5
        .all()
    )

    return jsonify([
        {"title": title, "report_count": int(rc)}
        for (title, rc) in results
    ]), 200

@stats_bp.route('/stats/top-uploaders', methods=['GET'])
@jwt_required()
def stats_top_uploaders():
    results = (
        db.session.query(User.username, func.count(Note.id).label('uploads'))
        .join(Note, Note.user_id == User.id)
        .group_by(User.id, User.username)
        .order_by(func.count(Note.id).desc())
        .limit(5)
        .all()
    )
    return jsonify([{"username": u, "uploads": int(n)} for (u, n) in results]), 200




@stats_bp.route('/stats/top-rated-users', methods=['GET'])
@jwt_required()
def top_rated_users():
    k = 5  # παράγοντας εμπιστοσύνης

    max_ratings = (
        db.session.query(func.count(UserReview.id))
        .join(User, User.id == UserReview.reviewed_id)
        .group_by(User.id)
        .order_by(func.count(UserReview.id).desc())
        .limit(1)
        .scalar()
    ) or 0

    subq = (
        db.session.query(
            User.id.label("user_id"),
            func.avg(UserReview.rating).label("avg_rating"),
            func.count(UserReview.id).label("count_ratings")
        )
        .join(UserReview, UserReview.reviewed_id == User.id)
        .group_by(User.id)
        .subquery()
    )

    score_expr = (subq.c.avg_rating * (subq.c.count_ratings / (subq.c.count_ratings + k)))

    results = (
        db.session.query(
            User.username,
            subq.c.avg_rating,
            subq.c.count_ratings,
            score_expr.label("score")
        )
        .join(subq, subq.c.user_id == User.id)
        .order_by(desc("score"))
        .limit(5)
        .all()
    )

    return jsonify([
        {
            "username": u,
            "avg_rating": float(avg),
            "count_ratings": int(cnt),
            "score": round(float(sc), 3) if sc is not None else 0
        }
        for (u, avg, cnt, sc) in results
    ]), 200




@stats_bp.route('/stats/top-rated-notes', methods=['GET'])
@jwt_required()
def top_rated_notes():
    k = 5  # παράγοντας εμπιστοσύνης

    max_ratings = (
        db.session.query(func.count(NoteReview.id))
        .join(Note, Note.id == NoteReview.note_id)
        .group_by(Note.id)
        .order_by(func.count(NoteReview.id).desc())
        .limit(1)
        .scalar()
    ) or 0

    subq = (
        db.session.query(
            Note.id.label("note_id"),
            Note.title.label("title"),
            func.avg(NoteReview.rating).label("avg_rating"),
            func.count(NoteReview.id).label("count_ratings")
        )
        .join(NoteReview, NoteReview.note_id == Note.id)
        .group_by(Note.id, Note.title)
        .subquery()
    )

    score_expr = (subq.c.avg_rating * (subq.c.count_ratings / (subq.c.count_ratings + k)))

    results = (
        db.session.query(
            subq.c.title,
            subq.c.avg_rating,
            subq.c.count_ratings,
            score_expr.label("score")
        )
        .order_by(desc("score"))
        .limit(10)
        .all()
    )

    return jsonify([
        {
            "title": t,
            "avg_rating": float(avg),
            "count_ratings": int(cnt),
            "score": round(float(sc), 3) if sc is not None else 0
        }
        for (t, avg, cnt, sc) in results
    ]), 200
