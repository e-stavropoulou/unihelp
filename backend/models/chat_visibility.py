from models.shared import db
from datetime import datetime

class ChatVisibility(db.Model):
    __tablename__ = 'chat_visibility'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat_room.id'), nullable=False)
    hidden = db.Column(db.Boolean, default=False)
    hidden_at = db.Column(db.DateTime, default=datetime.utcnow)
    reset_at = db.Column(db.DateTime)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'chat_id', name='unique_user_chat'),
    )
