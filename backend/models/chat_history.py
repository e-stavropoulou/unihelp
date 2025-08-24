from models.shared import db

class ChatHistory(db.Model):
    __tablename__ = 'chat_history'

    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, nullable=False)
    user2_id = db.Column(db.Integer, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('user1_id', 'user2_id', name='unique_chat_pair'),
    )
