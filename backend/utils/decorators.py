from flask_jwt_extended import get_jwt_identity
from functools import wraps
from flask import jsonify
from models.user import User

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role != 'admin':  # Αν δεν έχεις UserRole class, βάλε απλά 'admin'
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper

def block_check(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        if user.is_blocked:
            return jsonify({
                "error": "blocked",
                "message": "Ο λογαριασμός σου έχει μπλοκαριστεί. Επικοινώνησε με τον διαχειριστή."
            }), 403
        return fn(*args, **kwargs)
    return wrapper
