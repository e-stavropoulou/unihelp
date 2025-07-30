from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.shared import db
from models.report import Report
from models.user import User
from models.note import Note
from datetime import datetime
from zoneinfo import ZoneInfo


reports_bp = Blueprint('reports_bp', __name__)

ATHENS_TZ = ZoneInfo("Europe/Athens")

def to_athens_iso(dt: datetime) -> str:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ATHENS_TZ).isoformat()


# -----------------------
# POST /report -> Δημιουργία αναφοράς
# -----------------------
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


# -----------------------
# GET /my-reports -> Δείχνει αναφορές που έχω κάνει
# -----------------------
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
