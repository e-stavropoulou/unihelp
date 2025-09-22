from .shared import db
from datetime import datetime

class NoteReview(db.Model):
    __tablename__ = 'note_review'

    id = db.Column(db.Integer, primary_key=True)
    
    reviewer_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    note_id = db.Column(db.Integer, db.ForeignKey('note.id', ondelete='CASCADE'), nullable=False)
    
    rating = db.Column(db.Integer, nullable=False)  # Τιμή από 1 έως 5
    comment = db.Column(db.Text, nullable=True)
    
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # 🚫 Ένας χρήστης μπορεί να βαθμολογήσει μία σημείωση μόνο μία φορά
    __table_args__ = (
        db.UniqueConstraint('reviewer_id', 'note_id', name='unique_note_review'),
    )

    # Σχέσεις για χρήστη και σημείωση
    reviewer = db.relationship("User", foreign_keys=[reviewer_id], backref="note_reviews")
    note = db.relationship("Note", foreign_keys=[note_id], backref=db.backref("reviews", passive_deletes=True))


    def to_dict(self):
        return {
            "id": self.id,
            "reviewer_id": self.reviewer_id,
            "reviewer_username": self.reviewer.username if self.reviewer else None,
            "note_id": self.note_id,
            "note_title": self.note.title if self.note else None,
            "rating": self.rating,
            "comment": self.comment,
            "timestamp": self.timestamp.isoformat()
        }
