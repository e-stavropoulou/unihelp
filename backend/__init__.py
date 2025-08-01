from dotenv import load_dotenv
load_dotenv()


import pymysql
pymysql.install_as_MySQLdb()


from flask import Flask, request, current_app
from flask_cors import CORS
from flask_migrate import Migrate
from models.shared import db
from models.notification import Notification
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.search_users import search_users_bp
from routes.user_profile import user_profile_bp
from routes.download_notes import download_notes_bp
from routes.notifications import notifications_bp
from config import ( SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS, JWT_SECRET, EMAIL_USER, EMAIL_PASS, BASE_URL )
from flask_jwt_extended import JWTManager
from routes.admin import admin_bp
from routes.chat import chat_bp
from routes.comments import comments_bp
from routes.reports import reports_bp
from routes.stats import stats_bp

def create_app():
    app = Flask(__name__)

    # Σύνδεση βάσης από .env ή fallback
    app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS

    app.config["JWT_SECRET_KEY"] = JWT_SECRET
    jwt = JWTManager(app)

    app.config['EMAIL_USER'] = EMAIL_USER
    app.config['EMAIL_PASS'] = EMAIL_PASS

    app.config["BASE_URL"] = BASE_URL



    # Σύνδεση extensions
    db.init_app(app)
    migrate = Migrate(app, db)
    CORS(app, supports_credentials=True,
     resources={r"/*": {"origins": [
         "http://localhost:8100",
         "http://192.168.2.7:8100",
         "http://192.168.1.19",
         "capacitor://localhost"
     ]}})


    @app.before_request
    def log_request_info():
        print("🟡 METHOD:", request.method)
        print("🟡 URL:", request.url)
        print("🟡 HEADERS:", dict(request.headers))
        print("🟡 COOKIES:", request.cookies)
        print("🟡 BODY (if POST):", request.get_data())



    # Imports μοντέλων για να "τα βλέπει" η migrate
    from models.user import User
    from models.course import Course
    from models.note import Note
    from models.favorite import Favorite

    # Καταχώρηση blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(search_users_bp)
    app.register_blueprint(user_profile_bp)
    app.register_blueprint(download_notes_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(comments_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(stats_bp)


    return app

