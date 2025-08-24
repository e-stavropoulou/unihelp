from datetime import datetime
from models.shared import db
from models.comment_history import CommentEditHistory  # ➕ Αν δεν έχεις κυκλική εξάρτηση

class Comment(db.Model):
    __tablename__ = 'comment'

    id = db.Column(db.Integer, primary_key=True)
    note_id = db.Column(db.Integer, db.ForeignKey('note.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    text = db.Column(db.Text, nullable=False)              # 🔸 Τρέχον σχόλιο
    original_text = db.Column(db.Text, nullable=True)      # 🔸 Πρώτη μορφή (προαιρετικό αν κρατάς history)

    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    is_edited = db.Column(db.Boolean, default=False, nullable=False)
    edited_at = db.Column(db.DateTime, nullable=True)

    # 🔄 Συσχετίσεις
    user = db.relationship('User', backref='comments')
    note = db.relationship('Note', backref='comments')
    
    # 🔁 Ιστορικό επεξεργασιών
    edit_history = db.relationship(
        'CommentEditHistory',
        backref='comment',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
