from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user_review import UserReview
from models.user import User
from models.shared import db
from sqlalchemy.sql import func
from utils.points_utils import award_points


user_reviews_bp = Blueprint("user_reviews_bp", __name__)


# 🔸 POST /reviews/user/<user_id>
@user_reviews_bp.route("/reviews/user/<int:user_id>", methods=["POST"])
@jwt_required()
def create_or_update_user_review(user_id):
    current_user_id = get_jwt_identity()

    if current_user_id == user_id:
        return jsonify({"error": "Δεν μπορείς να αξιολογήσεις τον εαυτό σου."}), 400

    data = request.get_json()
    rating = data.get("rating")
    comment = data.get("comment", "")

    if not rating or not (1 <= rating <= 5):
        return jsonify({"error": "Η βαθμολογία πρέπει να είναι από 1 έως 5."}), 400

    reviewed_user = User.query.get(user_id)
    reviewer_user = User.query.get(current_user_id)

    if not reviewed_user or not reviewer_user:
        return jsonify({"error": "Ο χρήστης δεν βρέθηκε."}), 404

    review = UserReview.query.filter_by(
        reviewer_id=current_user_id, reviewed_id=user_id
    ).first()
    
    is_new = False

    if review:
        review.rating = rating
        review.comment = comment
    else:
        review = UserReview(
            reviewer_id=current_user_id,
            reviewed_id=user_id,
            rating=rating,
            comment=comment
        )
        db.session.add(review)
        is_new = True

    db.session.commit()

    # ✅ Βράβευση μόνο σε νέα αξιολόγηση
    if is_new:
        award_points(reviewer_user, 5, "🎯 Ευχαριστούμε για την αξιολόγησή σου!")

        if rating == 4:
            award_points(reviewed_user, 3, "Έλαβες αξιολόγηση 4 αστέρων")
        elif rating == 5:
            award_points(reviewed_user, 5, "Έλαβες αξιολόγηση 5 αστέρων")

    return jsonify({
        "message": "Η αξιολόγηση αποθηκεύτηκε.",
        "review": review.to_dict()
    }), 200

# 🔸 GET /reviews/user/<user_id>
@user_reviews_bp.route("/reviews/user/<int:user_id>", methods=["GET"])
@jwt_required(optional=True)
def get_user_reviews(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Ο χρήστης δεν βρέθηκε."}), 404

    reviews = UserReview.query.filter_by(reviewed_id=user_id).all()
    avg_rating = db.session.query(func.avg(UserReview.rating)).filter_by(reviewed_id=user_id).scalar()
    count = db.session.query(func.count(UserReview.id)).filter_by(reviewed_id=user_id).scalar()

    return jsonify({
        "reviewed_user_id": user_id,
        "reviewed_username": user.username,
        "average_rating": round(avg_rating, 2) if avg_rating else None,
        "review_count": count,
        "reviews": [r.to_dict() for r in reviews]
    }), 200
