from flask import Blueprint, jsonify
from models.user import User

user_profile_bp = Blueprint('user_profile_bp', __name__)

@user_profile_bp.route('/user-profile/<int:user_id>', methods=['GET'])
def get_user_profile(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
    "id": user.id,
    "username": user.username,
    "email": user.email,
    "avatar": user.avatar_url,
    "department": user.department,
    "can_help_courses": [uc.course.name for uc in user.user_courses if uc.can_help],
    "needs_help_courses": [uc.course.name for uc in user.user_courses if uc.needs_help],
    "upoints": getattr(user, 'upoints', 0) or 0
})

