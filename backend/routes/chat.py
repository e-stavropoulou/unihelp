from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.chat import ChatRoom, Message
from models.user import User
from models.shared import db
from datetime import datetime
from zoneinfo import ZoneInfo
from utils.points_utils import award_points
from models.chat_history import ChatHistory
from sqlalchemy.sql import func
from sqlalchemy import or_
from models.chat_visibility import ChatVisibility
import traceback

chat_bp = Blueprint('chat_bp', __name__)
ATHENS_TZ = ZoneInfo("Europe/Athens")


def log(msg):
    print(f"[CHAT_BP] {msg}", flush=True)


def to_athens_iso(dt: datetime) -> str:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ATHENS_TZ).isoformat()



@chat_bp.route('/chats/<int:other_user_id>', methods=['POST'])
@jwt_required()
def start_or_get_chat(other_user_id):
    current_user_id = int(get_jwt_identity())
    log(f"start_or_get_chat: user={current_user_id}, other={other_user_id}")

    existing_chat = ChatRoom.query.filter(
        ((ChatRoom.user1_id == current_user_id) & (ChatRoom.user2_id == other_user_id)) |
        ((ChatRoom.user1_id == other_user_id) & (ChatRoom.user2_id == current_user_id))
    ).first()

    if existing_chat:
        log(f"Existing chat found: {existing_chat.id}")
        return jsonify({"chat_id": existing_chat.id})

    new_chat = ChatRoom(user1_id=current_user_id, user2_id=other_user_id)
    db.session.add(new_chat)
    db.session.commit()
    log(f"New chat created: {new_chat.id}")
    return jsonify({"chat_id": new_chat.id})



@chat_bp.route('/chats', methods=['GET'])
@jwt_required()
def get_user_chats():
    current_user_id = int(get_jwt_identity())
    log(f"get_user_chats: user={current_user_id}")

    last_message_times = db.session.query(
        Message.chat_id,
        func.max(Message.timestamp).label('last_message_time')
    ).group_by(Message.chat_id).subquery()

    chats = db.session.query(ChatRoom, last_message_times.c.last_message_time). \
        outerjoin(last_message_times, ChatRoom.id == last_message_times.c.chat_id). \
        filter(
            (ChatRoom.user1_id == current_user_id) | (ChatRoom.user2_id == current_user_id)
        ). \
        order_by(last_message_times.c.last_message_time.desc()).all()

    log(f"Found {len(chats)} chats for user {current_user_id}")
    result = []
    for chat, last_time in chats:
        other_user_id = chat.user2_id if chat.user1_id == current_user_id else chat.user1_id
        other_user = User.query.get(other_user_id)
        if not other_user:
            log(f"Chat {chat.id} partner {other_user_id} not found")
            continue

        visibility = ChatVisibility.query.filter_by(
            user_id=current_user_id, chat_id=chat.id
        ).first()

        unread_count = Message.query.filter_by(chat_id=chat.id, is_read=False) \
            .filter(Message.sender_id != current_user_id).count()

        log(f"Chat {chat.id} → other={other_user.username}, unread={unread_count}")

        result.append({
            "chat_id": chat.id,
            "other_user_id": other_user.id,
            "other_username": other_user.username,
            "other_avatar": other_user.avatar_url,
            "unread_count": unread_count,
            "last_message_time": to_athens_iso(last_time) if last_time else None,
            "hidden": (visibility.hidden if visibility else False) if visibility else False
        })

    return jsonify(result)



@chat_bp.route('/chats/<int:chat_id>/messages', methods=['GET'])
@jwt_required()
def get_chat_messages(chat_id):
    log(f"get_chat_messages: chat_id={chat_id}")
    try:
        current_user_id = int(get_jwt_identity())
        chat = ChatRoom.query.get(chat_id)
        log(f"User {current_user_id} fetching messages for chat {chat_id}")

        if not chat or current_user_id not in [chat.user1_id, chat.user2_id]:
            log("Unauthorized access")
            return jsonify({"error": "Unauthorized"}), 403

        visibility = ChatVisibility.query.filter_by(user_id=current_user_id, chat_id=chat_id).first()
        if visibility:
            log(f"Visibility for user {current_user_id} in chat {chat_id}: hidden={visibility.hidden}, reset_at={visibility.reset_at}")

        query = Message.query.filter_by(chat_id=chat_id)

        if visibility and visibility.reset_at:
            log(f"Applying reset_at filter: {visibility.reset_at}")
            query = query.filter(Message.timestamp > visibility.reset_at)

        messages = query.order_by(Message.timestamp.asc()).all()
        log(f"Fetched {len(messages)} messages for chat {chat_id}")

        payload = [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "username": m.sender.username if getattr(m, "sender", None) else "Unknown",
                "content": m.content,
                "timestamp": to_athens_iso(m.timestamp) if m.timestamp else None
            }
            for m in messages
        ]
        return jsonify(payload)

    except Exception as e:
        log("❌ ERROR get_chat_messages:")
        log(traceback.format_exc())
        return jsonify({"error": str(e)}), 500



@chat_bp.route('/chats/<int:chat_id>/messages', methods=['POST'])
@jwt_required()
def send_message(chat_id):
    from utils.push_utils import send_push_notification
    log(f"send_message: chat_id={chat_id}")
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        content = data.get('content')
        log(f"User {current_user_id} sending: {content}")

        if not content or not str(content).strip():
            return jsonify({"error": "Empty message"}), 400

        chat = ChatRoom.query.get(chat_id)
        if not chat or current_user_id not in [chat.user1_id, chat.user2_id]:
            log("Unauthorized send attempt")
            return jsonify({"error": "Unauthorized"}), 403

        message = Message(chat_id=chat_id, sender_id=current_user_id, content=content)
        db.session.add(message)
        db.session.flush()
        log(f"Message persisted (id={message.id})")

        recipient_id = chat.user2_id if chat.user1_id == current_user_id else chat.user1_id
        sender = User.query.get(current_user_id)
        recipient = User.query.get(recipient_id)

        unhide_and_reset_visibility(recipient_id, chat.id)
        unhide_and_reset_visibility(current_user_id, chat.id)

        history_exists = ChatHistory.query.filter(
            ((ChatHistory.user1_id == current_user_id) & (ChatHistory.user2_id == recipient_id)) |
            ((ChatHistory.user1_id == recipient_id) & (ChatHistory.user2_id == current_user_id))
        ).first()
        if not history_exists:
            new_history = ChatHistory(user1_id=current_user_id, user2_id=recipient_id)
            db.session.add(new_history)
            award_points(sender, 5, "💬 Νέα συζήτηση")

        db.session.commit()
        log("Message + visibilities committed")

        if recipient and recipient.fcm_token:
            try:
                status, push_resp = send_push_notification(
                    token=recipient.fcm_token,
                    title="📩 Νέο Μήνυμα",
                    body=f"Ο {sender.username} σου έστειλε μήνυμα!" if sender else "Νέο μήνυμα",
                    data={
                        "type": "message",
                        "chat_id": str(chat.id),
                        "sender_id": str(current_user_id),
                        "content": content,
                        "message_id": str(message.id),
                        "created_at": to_athens_iso(datetime.utcnow())
                    }
                )
                log(f"Push sent to {recipient.email} → {status}")
            except Exception as e:
                log(f"❌ Push error: {e}")
        else:
            log("Recipient has no FCM token")

        return jsonify({
            "message": "Message sent",
            "id": message.id,
            "chat_id": chat.id,
            "sender_id": current_user_id,
            "content": content,
            "timestamp": to_athens_iso(message.timestamp) if message.timestamp else None
        })

    except Exception as e:
        log("❌ ERROR send_message:")
        log(traceback.format_exc())
        db.session.rollback()
        return jsonify({"error": str(e)}), 500



@chat_bp.route('/messages/unread-count', methods=['GET'])
@jwt_required()
def get_unread_message_count():
    user_id = int(get_jwt_identity())
    count = Message.query.filter_by(is_read=False).join(ChatRoom).filter(
        (ChatRoom.user1_id == user_id) | (ChatRoom.user2_id == user_id),
        Message.sender_id != user_id
    ).count()
    log(f"Unread count for {user_id}: {count}")
    return jsonify({"unread_count": count})



@chat_bp.route('/chats/<int:chat_id>/mark-read', methods=['PUT'])
@jwt_required()
def mark_messages_as_read(chat_id):
    user_id = int(get_jwt_identity())
    log(f"mark_messages_as_read: chat {chat_id}, user {user_id}")
    messages = Message.query.filter_by(chat_id=chat_id, is_read=False) \
        .filter(Message.sender_id != user_id).all()
    for msg in messages:
        msg.is_read = True
    db.session.commit()
    log(f"Marked {len(messages)} messages as read")
    return jsonify({"message": "Messages marked as read"})



@chat_bp.route('/chats/<int:chat_id>/hide', methods=['POST'])
@jwt_required()
def hide_chat(chat_id):
    current_user_id = int(get_jwt_identity())
    chat = ChatRoom.query.get(chat_id)
    log(f"hide_chat: user {current_user_id}, chat {chat_id}")

    if not chat or current_user_id not in [chat.user1_id, chat.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403

    visibility = ChatVisibility.query.filter_by(user_id=current_user_id, chat_id=chat_id).first()
    now = datetime.utcnow()

    if not visibility:
        visibility = ChatVisibility(
            user_id=current_user_id,
            chat_id=chat_id,
            hidden=True,
            hidden_at=now,
            reset_at=now
        )
        db.session.add(visibility)
        log("Created new visibility entry")
    else:
        visibility.hidden = True
        visibility.hidden_at = now
        visibility.reset_at = now
        log("Updated visibility entry")

    db.session.commit()
    return jsonify({"message": "Chat hidden for this user"})


def unhide_and_reset_visibility(user_id: int, chat_id: int) -> None:
    vis = ChatVisibility.query.filter_by(user_id=user_id, chat_id=chat_id).first()
    if vis:
        log(f"Unhiding chat {chat_id} for user {user_id}")
        vis.hidden = False
        vis.hidden_at = None
        
    else:
        log(f"Creating new ChatVisibility for user {user_id}, chat {chat_id}")
        vis = ChatVisibility(
            user_id=user_id,
            chat_id=chat_id,
            hidden=False,
            hidden_at=None,
            reset_at=None
        )
        db.session.add(vis)
    db.session.add(vis)



@chat_bp.route('/chats/<int:chat_id>/partner', methods=['GET'])
@jwt_required()
def get_chat_partner(chat_id):
    current_user_id = int(get_jwt_identity())
    chat = ChatRoom.query.get(chat_id)
    log(f"get_chat_partner: user={current_user_id}, chat={chat_id}")

    if not chat or current_user_id not in [chat.user1_id, chat.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403

    other_user_id = chat.user2_id if chat.user1_id == current_user_id else chat.user1_id
    other_user = User.query.get(other_user_id)
    if not other_user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "other_user_id": other_user.id,
        "other_username": other_user.username,
        "other_avatar": other_user.avatar_url
    })

