from flask import Blueprint, request, jsonify
from models.user import User
from sqlalchemy import or_

search_users_bp = Blueprint('search_users_bp', __name__)

@search_users_bp.route('/search-users', methods=['GET'])
def search_users():
    query = request.args.get('query', '').lower()
    print(f"📥 Received query: {query}")  # ✅ Εμφανίζει τι λαμβάνεται

    if not query:
        print("⚠️ Query string is empty, returning []")
        return jsonify([])

    try:
        users = User.query.filter(
            or_(
                User.username.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%")
            )
        ).all()

        print(f"🔍 Found {len(users)} matching users")

        for u in users:
            print(f"➡️ {u.username} ({u.email})")

        return jsonify([
            {"id": u.id, "username": u.username, "email": u.email}
            for u in users
        ])
    except Exception as e:
        print(f"❌ Error in search_users route: {e}")
        return jsonify({"error": "Internal Server Error"}), 500
