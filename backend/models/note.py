# models/note.py
from datetime import datetime
from models.shared import db

class Note(db.Model):
    __tablename__ = 'note'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=False)  # π.χ. "Σημειώσεις", "Διαφάνειες"
    filename = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    filepath = db.Column(db.String(255), nullable=False)
    downloads = db.Column(db.Integer, default=0, nullable=False) 

    # Σχέσεις
    user = db.relationship("User", backref="notes")
    course = db.relationship("Course", backref="notes")

    # ✅ Σχέσεις με cascade delete
    comments = db.relationship(
    "Comment", backref="note",
    cascade="all, delete-orphan",
    passive_deletes=True   # ✅
    )
    reports = db.relationship(
        "Report", backref="note",
        cascade="all, delete-orphan",
        passive_deletes=True   # ✅
    )
    favorites = db.relationship(
        "Favorite", backref="note",
        cascade="all, delete-orphan",
        passive_deletes=True   # ✅
    )
