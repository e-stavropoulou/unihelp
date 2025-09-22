from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.note_review import NoteReview
from models.user import User
from models.note import Note
from models.shared import db
from sqlalchemy.sql import func
from utils.points_utils import award_points


note_reviews_bp = Blueprint("note_reviews_bp", __name__)

# 🔸 POST /reviews/note/<note_id>
@note_reviews_bp.route("/reviews/note/<int:note_id>", methods=["POST"])
@jwt_required()
def create_or_update_note_review(note_id):
    current_user_id = get_jwt_identity()
    data = request.get_json()
    rating = data.get("rating")
    comment = data.get("comment", "")

    if not rating or not (1 <= rating <= 5):
        return jsonify({"error": "Η βαθμολογία πρέπει να είναι από 1 έως 5."}), 400

    note = Note.query.get(note_id)
    if not note:
        return jsonify({"error": "Η σημείωση δεν βρέθηκε."}), 404

    if note.user_id == current_user_id:
        return jsonify({"error": "Δεν μπορείς να αξιολογήσεις τη δική σου σημείωση."}), 400

    existing_review = NoteReview.query.filter_by(reviewer_id=current_user_id, note_id=note_id).first()
    if existing_review:
        return jsonify({"error": "Έχεις ήδη αξιολογήσει αυτή τη σημείωση."}), 400

    review = NoteReview(
        reviewer_id=current_user_id,
        note_id=note_id,
        rating=rating,
        comment=comment
    )
    db.session.add(review)

    # ✅ Πόντοι για reviewer
    reviewer = User.query.get(current_user_id)
    if reviewer:
        award_points(reviewer, 5, "🎯 Ευχαριστούμε για την αξιολόγησή σου!")

    # ✅ Πόντοι για uploader αν πήρε 4 ή 5
    uploader = note.user
    if uploader:
        if rating == 4:
            award_points(uploader, 3, "📚 Η σημείωσή σου αξιολογήθηκε με 4 αστέρια!")
        elif rating == 5:
            award_points(uploader, 5, "🌟 Η σημείωσή σου αξιολογήθηκε με 5 αστέρια!")

    db.session.commit()

    return jsonify({"message": "Η αξιολόγηση καταχωρήθηκε.", "review": review.to_dict()}), 201


# 🔸 GET /reviews/note/<note_id>
@note_reviews_bp.route("/reviews/note/<int:note_id>", methods=["GET"])
@jwt_required(optional=True)
def get_note_reviews(note_id):
    note = Note.query.get(note_id)
    if not note:
        return jsonify({"error": "Η σημείωση δεν βρέθηκε."}), 404

    reviews = NoteReview.query.filter_by(note_id=note_id).all()
    avg_rating = db.session.query(func.avg(NoteReview.rating)).filter_by(note_id=note_id).scalar()
    count = db.session.query(func.count(NoteReview.id)).filter_by(note_id=note_id).scalar()

    return jsonify({
        "note_id": note_id,
        "note_title": note.title,
        "average_rating": round(avg_rating, 2) if avg_rating else None,
        "review_count": count,
        "reviews": [r.to_dict() for r in reviews]
    }), 200
