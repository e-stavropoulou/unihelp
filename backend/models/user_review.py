from .shared import db
from datetime import datetime

class UserReview(db.Model):
    __tablename__ = 'user_review'

    id = db.Column(db.Integer, primary_key=True)
    
    reviewer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reviewed_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    rating = db.Column(db.Integer, nullable=False)  #  1-5
    comment = db.Column(db.Text, nullable=True)
    
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # xristis vathmologei xristi mia fora
    __table_args__ = (
        db.UniqueConstraint('reviewer_id', 'reviewed_id', name='unique_user_review'),
    )

   
    reviewer = db.relationship("User", foreign_keys=[reviewer_id], backref="given_reviews")
    reviewed = db.relationship("User", foreign_keys=[reviewed_id], backref="received_reviews")

    def to_dict(self):
        return {
            "id": self.id,
            "reviewer_id": self.reviewer_id,
            "reviewer_username": self.reviewer.username if self.reviewer else None,
            "reviewed_id": self.reviewed_id,
            "reviewed_username": self.reviewed.username if self.reviewed else None,
            "rating": self.rating,
            "comment": self.comment,
            "timestamp": self.timestamp.isoformat()
        }
