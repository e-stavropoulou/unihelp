from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from sqlalchemy import or_

search_users_bp = Blueprint('search_users_bp', __name__)

@search_users_bp.route('/search-users', methods=['GET'])
@jwt_required()
def search_users():
    query = request.args.get('query', '').lower()
    current_user_id = get_jwt_identity()
    print(f"📥 Received query: {query} from user ID {current_user_id}")

    if not query:
        print("⚠️ Query string is empty, returning []")
        return jsonify([])

    try:
        users = User.query.filter(
            or_(
                User.username.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%")
            ),
            User.id != current_user_id  # ✅ Μην επιστρέψεις τον εαυτό του
        ).all()

        print(f"🔍 Found {len(users)} matching users (excluding self)")

        for u in users:
            print(f"➡️ {u.username} ({u.email})")

        return jsonify([
            {"id": u.id, "username": u.username, "email": u.email}
            for u in users
        ])
    except Exception as e:
        print(f"❌ Error in search_users route: {e}")
        return jsonify({"error": "Internal Server Error"}), 500
