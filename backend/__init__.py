# __init__.py

import os
from flask import Flask, request, jsonify, send_from_directory

from dotenv import load_dotenv
load_dotenv()

import pymysql
pymysql.install_as_MySQLdb()

from datetime import timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager

from models.shared import db
from models.notification import Notification
from models.chat_history import ChatHistory


# ✅ Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials

# Blueprints
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.search_users import search_users_bp
from routes.user_profile import user_profile_bp
from routes.download_notes import download_notes_bp
from routes.notifications import notifications_bp
from routes.admin import admin_bp
from routes.chat import chat_bp
from routes.comments import comments_bp
from routes.reports import reports_bp
from routes.stats import stats_bp

from config import (
    SQLALCHEMY_DATABASE_URI,
    SQLALCHEMY_TRACK_MODIFICATIONS,
    JWT_SECRET,
    EMAIL_USER,
    EMAIL_PASS,
    BASE_URL,
)

def create_app():
    app = Flask(__name__)

    # -------------------- Βάση/Γενικές Ρυθμίσεις --------------------
    app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS

    app.config['EMAIL_USER'] = EMAIL_USER
    app.config['EMAIL_PASS'] = EMAIL_PASS
    app.config['BASE_URL']   = BASE_URL

    # ✅ Firebase Admin init (μόνο μία φορά)
    if not firebase_admin._apps:
        cred = credentials.Certificate("firebase/service-account.json")
        firebase_admin.initialize_app(cred)

    # -------------------- JWT Ρυθμίσεις --------------------
    app.config['JWT_SECRET_KEY'] = JWT_SECRET
    app.config['JWT_ACCESS_TOKEN_EXPIRES']  = timedelta(minutes=15)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=7)
    app.config['JWT_DECODE_LEEWAY'] = 10

    jwt = JWTManager(app)

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify(msg='Token has expired'), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return jsonify(msg='Invalid token', detail=reason), 422

    @jwt.unauthorized_loader
    def missing_token_callback(reason):
        return jsonify(msg='Missing Authorization Header'), 401

    # -------------------- CORS --------------------
    CORS(
        app,
        resources={r"/*": {"origins": [
            "http://localhost:8100",
            "http://192.168.2.7:8100",
            "http://localhost:4201",
            "http://192.168.2.7:4201",
            "http://192.168.2.26:8100",
            "http://192.168.2.26:4201",
            "http://localhost:8080",
            "http://192.168.2.26:8080",
            "http://192.168.2.6:8100",
            "http://192.168.2.6:4201",
            "http://192.168.2.6:8080",
            "capacitor://localhost"
        ]}}
    )

    # -------------------- Extensions --------------------
    db.init_app(app)
    Migrate(app, db)

    @app.before_request
    def log_request_info():
        print("🟡 METHOD:", request.method)
        print("🟡 URL:", request.url)
        print("🟡 HEADERS:", dict(request.headers))
        print("🟡 COOKIES:", request.cookies)
        print("🟡 BODY (if POST):", request.get_data())

    from models.user import User
    from models.course import Course
    from models.note import Note
    from models.favorite import Favorite
    from models.comment_history import CommentEditHistory

    # -------------------- Blueprints --------------------
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

        # -------------------- Frontend Build --------------------
    build_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "www")
    app.static_folder = build_dir
    app.static_url_path = ""

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        full_path = os.path.join(build_dir, path)

        # Αν ζητάει static αρχείο → στείλτο
        if os.path.exists(full_path) and not os.path.isdir(full_path):
            return send_from_directory(build_dir, path)

        # Διαφορετικά γύρνα πάντα index.html
        print("👉 SPA fallback triggered for:", path)
        return send_from_directory(build_dir, "index.html")


    return app
