from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from models.shared import db
from routes.auth import auth_bp
from routes.profile import profile_bp
from config import ( SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS, JWT_SECRET, EMAIL_USER, EMAIL_PASS, BASE_URL )
from flask_jwt_extended import JWTManager

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

    
    CORS(app, resources={r"/*": {"origins": ["http://localhost:8100", "http://192.168.1.3:8100"]}}, supports_credentials=True)


    # Imports μοντέλων για να "τα βλέπει" η migrate
    from models.user import User
    from models.course import Course
    from models.note import Note
    from models.favorite import Favorite

    # Καταχώρηση blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)

    return app

