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
from sqlalchemy.orm import aliased

chat_bp = Blueprint('chat_bp', __name__)
ATHENS_TZ = ZoneInfo("Europe/Athens")

def to_athens_iso(dt: datetime) -> str:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ATHENS_TZ).isoformat()

# dhmiourgia i energou chat me allo xristi
@chat_bp.route('/chats/<int:other_user_id>', methods=['POST'])
@jwt_required()
def start_or_get_chat(other_user_id):
    current_user_id = int(get_jwt_identity())

    # des an to chat yparxei
    existing_chat = ChatRoom.query.filter(
        ((ChatRoom.user1_id == current_user_id) & (ChatRoom.user2_id == other_user_id)) |
        ((ChatRoom.user1_id == other_user_id) & (ChatRoom.user2_id == current_user_id))
    ).first()

    if existing_chat:
        return jsonify({"chat_id": existing_chat.id})

    # dhmioyrgia neou chat 
    new_chat = ChatRoom(user1_id=current_user_id, user2_id=other_user_id)
    db.session.add(new_chat)
    db.session.commit()

    return jsonify({"chat_id": new_chat.id})


# lipsi twn chats tou xristi
@chat_bp.route('/chats', methods=['GET'])
@jwt_required()
def get_user_chats():
    current_user_id = int(get_jwt_identity())

    
    last_message_times = db.session.query(
        Message.chat_id,
        func.max(Message.timestamp).label('last_message_time')
    ).group_by(Message.chat_id).subquery()

    # join me to chatroom kai taksinomisi me vasi to teleytaio minima
    chats = db.session.query(ChatRoom, last_message_times.c.last_message_time).\
        outerjoin(last_message_times, ChatRoom.id == last_message_times.c.chat_id).\
        filter(
            (ChatRoom.user1_id == current_user_id) |
            (ChatRoom.user2_id == current_user_id)
        ).\
        order_by(last_message_times.c.last_message_time.desc()).all()

    result = []
    for chat, last_time in chats:
        other_user_id = chat.user2_id if chat.user1_id == current_user_id else chat.user1_id
        other_user = User.query.get(other_user_id)
        if not other_user:
            continue

        unread_count = Message.query.filter_by(chat_id=chat.id, is_read=False)\
            .filter(Message.sender_id != current_user_id).count()

        result.append({
            "chat_id": chat.id,
            "other_user_id": other_user.id,
            "other_username": other_user.username,
            "other_avatar": other_user.avatar_url,
            "unread_count": unread_count,
            "last_message_time": to_athens_iso(last_time) if last_time else None
        })

    return jsonify(result)


# anaktisi twn minimatwn enos chat
@chat_bp.route('/chats/<int:chat_id>/messages', methods=['GET'])
@jwt_required()
def get_chat_messages(chat_id):
    current_user_id = int(get_jwt_identity())
    chat = ChatRoom.query.get(chat_id)

    if not chat or current_user_id not in [chat.user1_id, chat.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403

    messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.timestamp.asc()).all()
    return jsonify([
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "username": m.sender.username if getattr(m, "sender", None) else "Unknown",
            "content": m.content,
            "timestamp": to_athens_iso(m.timestamp) if m.timestamp else None
        }
        for m in messages
    ])



# send message se chat
@chat_bp.route('/chats/<int:chat_id>/messages', methods=['POST'])
@jwt_required()
def send_message(chat_id):
    from models.notification import Notification
    from utils.push_utils import send_push_notification

    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    content = data.get('content')

    if not content:
        return jsonify({"error": "Empty message"}), 400

    chat = ChatRoom.query.get(chat_id)
    if not chat or current_user_id not in [chat.user1_id, chat.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403

    
    message = Message(chat_id=chat_id, sender_id=current_user_id, content=content)
    db.session.add(message)
    db.session.commit()   

    
    recipient_id = chat.user2_id if chat.user1_id == current_user_id else chat.user1_id
    sender = User.query.get(current_user_id)

    
    recipient = db.session.query(User).filter_by(id=recipient_id).first()
    db.session.refresh(recipient)

    if recipient and recipient.fcm_token:
        try:
            status, push_resp = send_push_notification(
                token=recipient.fcm_token,
                title="📩 Νέο Μήνυμα",
                body=f"Ο {sender.username} σου έστειλε μήνυμα!",
                data={
                    "type": "message",
                    "chat_id": str(chat.id),
                    "sender_id": str(current_user_id),
                    "content": content,
                    "created_at": to_athens_iso(datetime.utcnow())
                }
            )
            print(f"✅ Push σε {recipient.username}: {status}")
        except Exception as e:
            print(f"❌ Αποτυχία push σε {recipient.email}: {e}")
    else:
        print(f"⚠️ Ο {recipient.username if recipient else 'N/A'} δεν έχει fcm_token.")

    
    history_exists = ChatHistory.query.filter(
        ((ChatHistory.user1_id == current_user_id) & (ChatHistory.user2_id == recipient_id)) |
        ((ChatHistory.user1_id == recipient_id) & (ChatHistory.user2_id == current_user_id))
    ).first()

    if not history_exists:
        
        new_history = ChatHistory(user1_id=current_user_id, user2_id=recipient_id)
        db.session.add(new_history)

        
        award_points(sender, 5, "💬 Κέρδισες 5 πόντους για τη δημιουργία νέας συζήτησης!")

    db.session.commit()
    return jsonify({"message": "Message sent", "id": message.id})


# anaktisi arithmou anagnwristwn minimatwn
@chat_bp.route('/messages/unread-count', methods=['GET'])
@jwt_required()
def get_unread_message_count():
    user_id = int(get_jwt_identity())
    
    count = Message.query.filter_by(is_read=False).join(ChatRoom).filter(
        (ChatRoom.user1_id == user_id) | (ChatRoom.user2_id == user_id),
        Message.sender_id != user_id
    ).count()

    return jsonify({"unread_count": count})


# markarismata minimatwn 
@chat_bp.route('/chats/<int:chat_id>/mark-read', methods=['PUT'])
@jwt_required()
def mark_messages_as_read(chat_id):
    user_id = int(get_jwt_identity())
    messages = Message.query.filter_by(chat_id=chat_id, is_read=False)\
        .filter(Message.sender_id != user_id).all()
    
    for msg in messages:
        msg.is_read = True

    db.session.commit()
    return jsonify({"message": "Messages marked as read"})


# delete chat
@chat_bp.route('/chats/<int:chat_id>', methods=['DELETE'])
@jwt_required()
def delete_chat(chat_id):
    current_user_id = int(get_jwt_identity())
    chat = ChatRoom.query.get(chat_id)

    if not chat or current_user_id not in [chat.user1_id, chat.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403

    
    Message.query.filter_by(chat_id=chat_id).delete()
    db.session.delete(chat)

    
    history_exists = ChatHistory.query.filter(
        ((ChatHistory.user1_id == chat.user1_id) & (ChatHistory.user2_id == chat.user2_id)) |
        ((ChatHistory.user1_id == chat.user2_id) & (ChatHistory.user2_id == chat.user1_id))
    ).first()

    if not history_exists:
        new_history = ChatHistory(user1_id=chat.user1_id, user2_id=chat.user2_id)
        db.session.add(new_history)

    db.session.commit()
    return jsonify({"message": "Chat deleted"})

# anaktisi pliroforiwn allou xristi se chat
@chat_bp.route('/chats/<int:chat_id>/partner', methods=['GET'])
@jwt_required()
def get_chat_partner(chat_id):
    current_user_id = int(get_jwt_identity())
    chat = ChatRoom.query.get(chat_id)

    if not chat or current_user_id not in [chat.user1_id, chat.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403

    # anaktisi pliroforiwn allou xristi
    other_user_id = chat.user2_id if chat.user1_id == current_user_id else chat.user1_id
    other_user = User.query.get(other_user_id)

    if not other_user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "other_user_id": other_user.id,
        "other_username": other_user.username,
        "other_avatar": other_user.avatar_url
    })
