# clean_db.py
from app import create_app
from models.shared import db
from models.user import User
from models.notification import Notification
from models.report import Report
from models.comment import Comment
from models.comment_history import CommentEditHistory
from models.course import UserCourse   
from models.chat import ChatRoom, Message
from models.chat_history import ChatHistory
from models.note import Note
from models.user_review import UserReview

app = create_app()

with app.app_context():
    User.query.update({User.upoints: 0})

    Notification.query.delete()
    Report.query.delete()
    CommentEditHistory.query.delete()
    Comment.query.delete()
    UserCourse.query.delete()
    Message.query.delete()
    ChatRoom.query.delete()
    ChatHistory.query.delete()
    Note.query.delete()
    UserReview.query.delete()

    db.session.commit()
    print("✅ Database cleanup complete (Courses kept, user points reset)")
