from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from models.shared import db
from routes.auth import auth_bp
from routes.profile import profile_bp

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    migrate = Migrate(app, db)

    # CORS επιτρέποντας προσωρινά όλα τα origins και headers
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


    # Imports μοντέλων (για migrations)
    from models.user import User
    from models.course import Course
    from models.note import Note
    from models.favorite import Favorite

    # Καταχώρηση blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)

    return app
