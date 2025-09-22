# models/favorite.py
from models.shared import db

class Favorite(db.Model):
    __tablename__ = 'favorite'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id', ondelete='CASCADE'),   # αν θες να σβήνονται και τα favorites όταν σβήσει ο χρήστης
        nullable=False
    )
    note_id = db.Column(
        db.Integer,
        db.ForeignKey('note.id', ondelete='CASCADE'),   # ✅ όταν σβήνει το note, φεύγουν και τα favorites
        nullable=False
    )

    __table_args__ = (
        db.UniqueConstraint('user_id', 'note_id', name='unique_favorite'),
    )
