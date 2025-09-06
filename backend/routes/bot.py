# routes/bot.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.bot_message import BotMessage
from models.shared import db
from models.user import User

bot_bp = Blueprint('bot', __name__)

@bot_bp.route("/bot/messages", methods=["GET"])
@jwt_required()
def get_bot_messages():
    user_id = get_jwt_identity()
    messages = BotMessage.query.filter_by(user_id=user_id).order_by(BotMessage.timestamp).all()
    return jsonify([
        {
            "role": m.role,
            "content": m.content,
            "timestamp": m.timestamp.isoformat()
        }
        for m in messages
    ])

@bot_bp.route("/bot/message", methods=["POST"])
@jwt_required()
def save_bot_message():
    user_id = get_jwt_identity()
    data = request.json
    role = data.get("role")
    content = data.get("content")

    if role not in ("user", "bot") or not content:
        return jsonify({"error": "Invalid message"}), 400

    message = BotMessage(user_id=user_id, role=role, content=content)
    db.session.add(message)
    db.session.commit()

    return jsonify({"message": "Message saved"}), 201

@bot_bp.route("/bot/messages", methods=["DELETE"])
@jwt_required()
def delete_bot_messages():
    user_id = get_jwt_identity()
    BotMessage.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"message": "Messages deleted"}), 200
