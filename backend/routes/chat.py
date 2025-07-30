# routes/chat.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.chat import ChatRoom, Message
from models.user import User
from models.shared import db
from datetime import datetime
from zoneinfo import ZoneInfo


chat_bp = Blueprint('chat_bp', __name__)

ATHENS_TZ = ZoneInfo("Europe/Athens")

def to_athens_iso(dt: datetime) -> str:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ATHENS_TZ).isoformat()


# 🔹 Δημιουργία ή λήψη chat με άλλο χρήστη
@chat_bp.route('/chats/<int:other_user_id>', methods=['POST'])
@jwt_required()
def start_or_get_chat(other_user_id):
    current_user_id = get_jwt_identity()

    existing_chat = ChatRoom.query.filter(
        ((ChatRoom.user1_id == current_user_id) & (ChatRoom.user2_id == other_user_id)) |
        ((ChatRoom.user1_id == other_user_id) & (ChatRoom.user2_id == current_user_id))
    ).first()

    if existing_chat:
        return jsonify({"chat_id": existing_chat.id})

    new_chat = ChatRoom(user1_id=current_user_id, user2_id=other_user_id)
    db.session.add(new_chat)
    db.session.commit()
    return jsonify({"chat_id": new_chat.id})


# 🔹 Επιστροφή όλων των chats του χρήστη
@chat_bp.route('/chats', methods=['GET'])
@jwt_required()
def get_user_chats():
    current_user_id = int(get_jwt_identity())
    print(f"🧠 Current user ID: {current_user_id}")

    chats = ChatRoom.query.filter(
        (ChatRoom.user1_id == current_user_id) | (ChatRoom.user2_id == current_user_id)
    ).all()

    result = []

    for chat in chats:
        print(f"📌 Chat ID: {chat.id}, user1: {chat.user1_id}, user2: {chat.user2_id}")

        # Προσδιορισμός του άλλου χρήστη
        if chat.user1_id == current_user_id:
            other_user_id = chat.user2_id
        else:
            other_user_id = chat.user1_id

        other_user = User.query.get(other_user_id)

        if not other_user:
            continue

        # 🆕 Υπολογισμός αδιάβαστων μηνυμάτων
        unread_count = Message.query.filter_by(chat_id=chat.id, is_read=False)\
            .filter(Message.sender_id != current_user_id).count()

        result.append({
            "chat_id": chat.id,
            "other_user_id": other_user.id,
            "other_username": other_user.username,
            "other_avatar": other_user.avatar_url,
            "unread_count": unread_count  # ✅ Εδώ προστίθεται
        })

    return jsonify(result)




# 🔹 Ανάκτηση μηνυμάτων ενός chat
@chat_bp.route('/chats/<int:chat_id>/messages', methods=['GET'])
@jwt_required()
def get_chat_messages(chat_id):
    current_user_id = get_jwt_identity()

    chat = ChatRoom.query.get(chat_id)
    print(f"🔍 Chat: {chat}")
    print(f"🧑‍💻 current_user_id (from token): {current_user_id} ({type(current_user_id)})")
    print(f"👥 chat.user1_id: {chat.user1_id} ({type(chat.user1_id)})")
    print(f"👥 chat.user2_id: {chat.user2_id} ({type(chat.user2_id)})")

    # Προσωρινά log check
    if not chat:
        print("❌ Chat not found")
    elif int(current_user_id) not in [chat.user1_id, chat.user2_id]:
        print("❌ User is not part of this chat")

    if not chat or int(current_user_id) not in [chat.user1_id, chat.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403

    messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.timestamp).all()

    return jsonify([
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "content": m.content,
             "timestamp": to_athens_iso(m.timestamp)
        }
        for m in messages
    ])


# 🔹 Αποστολή μηνύματος
@chat_bp.route('/chats/<int:chat_id>/messages', methods=['POST'])
@jwt_required()
def send_message(chat_id):
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    content = data.get('content')

    print("📥 Νέο μήνυμα:")
    print("🔑 Χρήστης:", current_user_id)
    print("💬 Chat ID:", chat_id)

    if not content:
        return jsonify({"error": "Empty message"}), 400

    chat = ChatRoom.query.get(chat_id)
    if not chat or (current_user_id not in [chat.user1_id, chat.user2_id]):
        return jsonify({"error": "Unauthorized"}), 403

    message = Message(chat_id=chat_id, sender_id=current_user_id, content=content)
    db.session.add(message)
    db.session.commit()

    return jsonify({"message": "Message sent", "id": message.id})

# 🔹 Λήψη στοιχείων άλλου χρήστη για ένα συγκεκριμένο chat (όπως στο /chats)
@chat_bp.route('/chats/<int:chat_id>/partner', methods=['GET'])
@jwt_required()
def get_chat_partner(chat_id):
    current_user_id = int(get_jwt_identity())
    chat = ChatRoom.query.get(chat_id)

    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    if current_user_id not in [chat.user1_id, chat.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403

    # Βρες ποιος είναι ο "άλλος" χρήστης
    partner_id = chat.user2_id if chat.user1_id == current_user_id else chat.user1_id
    partner = User.query.get(partner_id)

    if not partner:
        return jsonify({"error": "User not found"}), 404

    # ✅ Στέλνει ίδια ονόματα με το /chats endpoint
    return jsonify({
        "other_user_id": partner.id,
        "other_username": partner.username,
        "other_avatar": partner.avatar_url
    })


@chat_bp.route('/messages/unread-count', methods=['GET'])
@jwt_required()
def get_unread_message_count():
    user_id = get_jwt_identity()
    
    count = Message.query.filter_by(is_read=False).join(ChatRoom).filter(
        (ChatRoom.user1_id == user_id) | (ChatRoom.user2_id == user_id),
        Message.sender_id != user_id
    ).count()

    return jsonify({"unread_count": count})


@chat_bp.route('/chats/<int:chat_id>/mark-read', methods=['PUT'])
@jwt_required()
def mark_messages_as_read(chat_id):
    user_id = get_jwt_identity()

    messages = Message.query.filter_by(chat_id=chat_id, is_read=False).filter(Message.sender_id != user_id).all()
    
    for msg in messages:
        msg.is_read = True

    db.session.commit()
    return jsonify({"message": "Messages marked as read"})
