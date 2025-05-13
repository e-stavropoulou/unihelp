from .shared import db
from .course import Course, user_course


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    birthdate = db.Column(db.String(20), nullable=False)
    courses = db.relationship('Course', secondary='user_course', backref='users')
    department = db.Column(db.String(100), nullable=False)
    avatar_url = db.Column(db.String(255), nullable=True)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(255), nullable=True)
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)



    def to_dict(self):
        return {
            "email": self.email,
            "username": self.username,
            "full_name": self.full_name,
            "semester": self.semester,
            "year": self.year,
            "birthdate": self.birthdate,
            "department": self.department,
            "courses": [course.name for course in self.courses],
            "avatar_url": self.avatar_url 
        }

