from models.shared import db

class UserCourse(db.Model):
    __tablename__ = 'user_course'

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), primary_key=True)
    can_help = db.Column(db.Boolean, default=False)
    needs_help = db.Column(db.Boolean, default=False)

    
    user = db.relationship("User", back_populates="user_courses")
    course = db.relationship("Course", back_populates="course_users")


class Course(db.Model):
    __tablename__ = 'course'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    semester = db.Column(db.Integer, nullable=True)
    type = db.Column(db.String(50), nullable=False, default="υποχρεωτικό")

    course_users = db.relationship('UserCourse', back_populates='course')
