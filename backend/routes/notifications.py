from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.shared import db
from models.user import User
from models.notification import Notification
from datetime import datetime
from zoneinfo import ZoneInfo


notifications_bp = Blueprint('notifications_bp', __name__)

ATHENS_TZ = ZoneInfo("Europe/Athens")

def to_athens_iso(dt: datetime) -> str:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ATHENS_TZ).isoformat()


# 🔔 Επιστροφή όλων των ειδοποιήσεων για τον χρήστη
@notifications_bp.route('/notifications', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_notifications():
    print("🔔 Είσοδος στο /notifications")

    if request.method == 'OPTIONS':
        return jsonify({"message": "Preflight OK"}), 200

    try:
        user_id = get_jwt_identity()
        if not user_id:
            print("🚫 Δεν βρέθηκε token – unauthorized")
            return jsonify({"error": "Unauthorized"}), 401

        print(f"🧠 Χρήστης με ID: {user_id}")
        user = User.query.get(int(user_id))


        if not user:
            print("❌ Χρήστης δεν βρέθηκε")
            return jsonify({"error": "User not found"}), 404

        notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.timestamp.desc()).all()
        print(f"✅ Βρέθηκαν {len(notifications)} ειδοποιήσεις")

        return jsonify([
            {
                "id": n.id,
                "message": n.message,
                "timestamp": to_athens_iso(n.timestamp),
                "is_read": n.is_read
            } for n in notifications
        ]), 200

    except Exception as e:
        print("🔥 Σφάλμα στο /notifications:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500


# ✔️ Αποθήκευση FCM Token
@notifications_bp.route('/update-fcm-token', methods=['POST'])
@jwt_required()
def update_fcm_token():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))


    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    fcm_token = data.get('fcm_token')
    if not fcm_token:
        return jsonify({"error": "Token is required"}), 400

    user.fcm_token = fcm_token
    db.session.commit()

    return jsonify({"message": "FCM token updated successfully"}), 200


# ✔️ Σήμανση ειδοποίησης ως διαβασμένη
@notifications_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))


    if not user:
        return jsonify({"error": "User not found"}), 404

    notif = Notification.query.get(notification_id)
    if not notif or notif.user_id != user.id:
        return jsonify({"error": "Notification not found"}), 404

    notif.is_read = True
    db.session.commit()
    return jsonify({"message": "Notification marked as read"}), 200


# ✔️ Διαγραφή ειδοποίησης
@notifications_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))


    if not user:
        return jsonify({"error": "User not found"}), 404

    notif = Notification.query.get(notification_id)
    if not notif or notif.user_id != user.id:
        return jsonify({"error": "Not found"}), 404

    db.session.delete(notif)
    db.session.commit()
    return jsonify({"message": "Notification deleted"}), 200


# 🔢 Επιστροφή αριθμού αδιάβαστων ειδοποιήσεων
@notifications_bp.route('/notifications/unread-count', methods=['GET'])
@jwt_required()
def unread_notifications_count():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))


    if not user:
        return jsonify({"error": "User not found"}), 404

    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return jsonify({"unread_count": unread_count}), 200
