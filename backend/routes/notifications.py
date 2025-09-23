from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.shared import db
from models.user import User
from models.notification import Notification
from datetime import datetime
from zoneinfo import ZoneInfo
import requests
import os

notifications_bp = Blueprint('notifications_bp', __name__)
ATHENS_TZ = ZoneInfo("Europe/Athens")

FCM_SERVER_KEY = os.environ.get("FCM_SERVER_KEY")

def to_athens_iso(dt: datetime) -> str:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ATHENS_TZ).isoformat()


@notifications_bp.route('/notifications', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_notifications():
    if request.method == 'OPTIONS':
        return jsonify({"message": "Preflight OK"}), 200
    try:
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        user = User.query.get(int(user_id))
        if not user:
            return jsonify({"error": "User not found"}), 404
        notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.timestamp.desc()).all()
        return jsonify([
            {
                "id": n.id,
                "message": n.message,
                "timestamp": to_athens_iso(n.timestamp),
                "is_read": n.is_read
            } for n in notifications
        ]), 200
    except Exception as e:
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500


@notifications_bp.route('/update-fcm-token', methods=['POST'])
@jwt_required()
def update_fcm_token():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        print("❌ User not found in update-fcm-token")
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    fcm_token = data.get('fcm_token')
    print(f"📥 /update-fcm-token called by user_id={user_id}, token={fcm_token}")

    if fcm_token is None:
        print("⚠️ Received null token, clearing from DB")
        user.fcm_token = None
    else:
        user.fcm_token = fcm_token

    db.session.commit()
    print(f"✅ Updated DB: user_id={user.id}, fcm_token={user.fcm_token}")

    return jsonify({"message": "FCM token updated successfully"}), 200


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


@notifications_bp.route('/notifications/unread-count', methods=['GET'])
@jwt_required()
def unread_notifications_count():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404
    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return jsonify({"unread_count": unread_count}), 200


@notifications_bp.route('/notifications/send-push', methods=['POST'])
@jwt_required()
def send_push_notification():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        target_user_id = data.get('target_user_id')
        message = data.get('message', 'Έχεις μια νέα ειδοποίηση')

        user = User.query.get(int(target_user_id))
        if not user or not user.fcm_token:
            return jsonify({"error": "User not found or missing FCM token"}), 404

        # apothikseusi sti vasi
        new_notification = Notification(
            user_id=user.id,
            message=message,
            timestamp=datetime.utcnow(),
            is_read=False
        )
        db.session.add(new_notification)
        db.session.commit()

        # apostoli push
        from utils.push_utils import send_push_notification as send_fcm_push
        status, response_text = send_fcm_push(
            token=user.fcm_token,
            title="UniHelp",
            body=message,
            data={
                "type": data.get("type", "generic")  
            }
        )

        if status == 200:
            return jsonify({"message": "Push notification sent"}), 200
        else:
            return jsonify({"error": "Push failed", "details": response_text}), 500

    except Exception as e:
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

# test push
@notifications_bp.route('/notifications/test-push', methods=['POST'])
@jwt_required()
def test_push():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user or not user.fcm_token:
        return jsonify({"error": "No FCM token found"}), 404

    from utils.push_utils import send_push_notification as send_fcm_push
    status, response_text = send_fcm_push(
        token=user.fcm_token,
        title="📢 UniHelp Test",
        body="Αν βλέπεις αυτό, το push δουλεύει σωστά!"
    )

    return jsonify({
        "status": status,
        "response": response_text
    }), status
