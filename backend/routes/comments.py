from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.shared import db
from models.comment import Comment
from models.note import Note
from models.user import User
from datetime import datetime
from zoneinfo import ZoneInfo


comments_bp = Blueprint('comments_bp', __name__)

ATHENS_TZ = ZoneInfo("Europe/Athens")

def to_athens_iso(dt: datetime) -> str:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ATHENS_TZ).isoformat()


# -------------------------
# GET comments for a note
# -------------------------
@comments_bp.route('/notes/<int:note_id>/comments', methods=['GET'])
@jwt_required()
def get_comments(note_id):
    comments = Comment.query.filter_by(note_id=note_id).order_by(Comment.timestamp).all()

    return jsonify([
    {
        "id": c.id,
        "text": c.text,
        "timestamp": to_athens_iso(c.timestamp),
        "is_edited": c.is_edited,
        "edited_at": to_athens_iso(c.edited_at) if c.edited_at else None,
        "username": c.user.username,
        "user_id": c.user_id
    }
    for c in comments
]), 200


# -------------------------
# POST new comment
# -------------------------
@comments_bp.route('/notes/<int:note_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(note_id):
    user_id = int(get_jwt_identity())  # cast
    data = request.get_json()

    note = Note.query.get(note_id)
    if not note:
        return jsonify({"error": "Note not found"}), 404

    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Comment text cannot be empty"}), 400

    new_comment = Comment(
        note_id=note_id,
        user_id=user_id,
        text=text,
        timestamp=datetime.utcnow()
    )

    db.session.add(new_comment)
    db.session.commit()

    user = User.query.get(user_id)

    return jsonify({
        "id": new_comment.id,
        "text": new_comment.text,
        "timestamp": to_athens_iso(new_comment.timestamp),
        "username": user.username,
        "user_id": user.id
    }), 201

# -------------------------
# PUT edit comment
# -------------------------
@comments_bp.route('/comments/<int:comment_id>', methods=['PUT'])
@jwt_required()
def edit_comment(comment_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()

    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({"error": "Comment not found"}), 404

    if comment.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Comment text cannot be empty"}), 400

    comment.text = text
    comment.is_edited = True
    comment.edited_at = datetime.utcnow()  # καταγραφή πότε έγινε το edit

    db.session.commit()

    return jsonify({
        "id": comment.id,
        "text": comment.text,
        "timestamp": to_athens_iso(comment.timestamp),
        "is_edited": comment.is_edited,
        "edited_at": to_athens_iso(comment.edited_at) if comment.edited_at else None,
        "username": comment.user.username,
        "user_id": comment.user_id
    }), 200


# -------------------------
# DELETE comment
# -------------------------
@comments_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user_id = int(get_jwt_identity())  # cast

    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({"error": "Comment not found"}), 404

    if comment.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(comment)
    db.session.commit()

    return jsonify({"message": "Comment deleted"}), 200
