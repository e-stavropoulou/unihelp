from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.shared import db
from models.report import Report
from models.user import User
from models.note import Note
from datetime import datetime
from zoneinfo import ZoneInfo
from utils.points_utils import award_points
from models.notification import Notification
from utils.push_utils import send_push_notification

reports_bp = Blueprint('reports_bp', __name__)
ATHENS_TZ = ZoneInfo("Europe/Athens")

def to_athens_iso(dt: datetime) -> str:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ATHENS_TZ).isoformat()


# POST /report
@reports_bp.route('/report', methods=['POST'])
@jwt_required()
def create_report():
    data = request.get_json()
    user_id = get_jwt_identity()

    category = data.get("category")
    description = data.get("description", "")
    reported_user_id = data.get("reported_user_id")
    note_id = data.get("note_id")

    if not category:
        return jsonify({"error": "Category is required"}), 400

    report = Report(
        reported_by=user_id,
        reported_user_id=reported_user_id,
        note_id=note_id,
        category=category,
        description=description,
        status='pending'
    )

    db.session.add(report)
    db.session.commit()

    return jsonify({"message": "Report created"}), 201


# GET /my-reports
@reports_bp.route('/my-reports', methods=['GET'])
@jwt_required()
def my_reports():
    user_id = get_jwt_identity()
    reports = Report.query.filter_by(reported_by=user_id).order_by(Report.timestamp.desc()).all()

    result = []
    for r in reports:
        reported_user = User.query.get(r.reported_user_id) if r.reported_user_id else None
        note = Note.query.get(r.note_id) if r.note_id else None

        result.append({
            "id": r.id,
            "category": r.category,
            "description": r.description,
            "status": r.status,
            "timestamp": to_athens_iso(r.timestamp),
            "reported_user": reported_user.username if reported_user else None,
            "note_title": note.title if note else None
        })

    return jsonify(result)


# GET /admin/reports
@reports_bp.route('/admin/reports', methods=['GET'])
@jwt_required()
def get_pending_reports():
    current_user_id = get_jwt_identity()
    admin = User.query.get(current_user_id)

    if not admin or admin.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    reports = Report.query.filter_by(status='pending').order_by(Report.timestamp.desc()).all()

    result = []
    for r in reports:
        reported_by_username = r.reported_by_user.username if r.reported_by_user else None
        reported_user_username = r.reported_user.username if r.reported_user else None
        note_title = r.note.title if r.note else None

        result.append({
            "id": r.id,
            "category": r.category,
            "description": r.description,
            "status": r.status,
            "timestamp": to_athens_iso(r.timestamp),
            "reported_by": reported_by_username or "—",
            "reported_user": reported_user_username or "—",
            "note_id": r.note_id,
            "note_title": note_title or "—"
        })

    return jsonify(result), 200

# POST /admin/reports/<id>/accept
@reports_bp.route('/admin/reports/<int:report_id>/accept', methods=['POST'])
@jwt_required()
def accept_report(report_id):
    current_user_id = get_jwt_identity()
    admin = User.query.get(current_user_id)
    if not admin or admin.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    report = Report.query.get_or_404(report_id)
    report.status = 'accepted'

    reporter = User.query.get(report.reported_by)
    if reporter:
        # award_points (in-app + push)
        award_points(reporter, 3, "🚨 Η αναφορά σου έγινε δεκτή! Κέρδισες 3 πόντους.")

    db.session.commit()
    return jsonify({"message": "Report accepted"}), 200


# POST /admin/reports/<id>/reject
@reports_bp.route('/admin/reports/<int:report_id>/reject', methods=['POST'])
@jwt_required()
def reject_report(report_id):
    current_user_id = get_jwt_identity()
    admin = User.query.get(current_user_id)
    if not admin or admin.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    report = Report.query.get_or_404(report_id)
    report.status = 'rejected'
    db.session.commit()

    return jsonify({"message": "Report rejected"}), 200


# GET /admin/reports/history
@reports_bp.route('/admin/reports/history', methods=['GET'])
@jwt_required()
def get_reports_history():
    current_user_id = get_jwt_identity()
    admin = User.query.get(current_user_id)

    if not admin or admin.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    reports = Report.query.filter(Report.status.in_(["accepted", "rejected"]))\
        .order_by(Report.timestamp.desc())\
        .all()

    result = []
    for r in reports:
        reported_by_username = r.reported_by_user.username if r.reported_by_user else None
        reported_user_username = r.reported_user.username if r.reported_user else None
        note_title = r.note.title if r.note else None

        result.append({
            "id": r.id,
            "category": r.category,
            "description": r.description,
            "status": r.status,
            "timestamp": to_athens_iso(r.timestamp),
            "reported_by": reported_by_username or "—",
            "reported_user": reported_user_username or "—",
            "note_id": r.note_id,
            "note_title": note_title or "—"
        })

    return jsonify(result), 200
