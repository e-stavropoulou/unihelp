from .shared import db
from .course import Course, UserCourse  # όχι πια user_course (όχι πίνακας)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    birthdate = db.Column(db.String(20), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    avatar_url = db.Column(db.String(255), nullable=True)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(255), nullable=True)
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    fcm_token = db.Column(db.String(255), nullable=True)
    upoints = db.Column(db.Integer, default=0, nullable=False)

    role = db.Column(db.String(20), default='user', nullable=False) 

    user_courses = db.relationship('UserCourse', back_populates='user')

    def to_dict(self):
        return {
            "email": self.email,
            "username": self.username,
            "full_name": self.full_name,
            "semester": self.semester,
            "year": self.year,
            "birthdate": self.birthdate,
            "department": self.department,
            "courses": [uc.course.name for uc in self.user_courses if uc.can_help],
            "avatar_url": self.avatar_url,
            "upoints": self.upoints,
            "role": self.role

        }
