from datetime import datetime
from models.shared import db

class CommentEditHistory(db.Model):
    __tablename__ = 'comment_edit_history'

    id = db.Column(db.Integer, primary_key=True)
    comment_id = db.Column(db.Integer, db.ForeignKey('comment.id'), nullable=False)
    previous_text = db.Column(db.Text, nullable=False)
    edited_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
