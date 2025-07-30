from .shared import db
from datetime import datetime

class Report(db.Model):
    __tablename__ = 'report'

    id = db.Column(db.Integer, primary_key=True)
    reported_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reported_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    note_id = db.Column(db.Integer, db.ForeignKey('note.id'), nullable=True)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending/accepted/rejected
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Σχέσεις
    reported_by_user = db.relationship("User", foreign_keys=[reported_by])
    reported_user = db.relationship("User", foreign_keys=[reported_user_id])
    note = db.relationship("Note", foreign_keys=[note_id])


def to_dict(self):
    return {
        "id": self.id,
        "reported_by": self.reported_by,
        "reported_user_id": self.reported_user_id,
        "note_id": self.note_id,
        "category": self.category,
        "description": self.description,
        "status": self.status,
        "timestamp": self.timestamp.isoformat()
    }
