# models/favorite.py
from models.shared import db

class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    note_id = db.Column(db.Integer, db.ForeignKey('note.id'), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'note_id', name='unique_favorite'),
    )
