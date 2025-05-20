import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://localhost:5050")
JWT_SECRET = os.getenv("JWT_SECRET", "fallback-secret")
SQLALCHEMY_DATABASE_URI = os.getenv(
    "DATABASE_URI",
    "mysql://root:password123@localhost/unihelp"  # fallback
)
SQLALCHEMY_TRACK_MODIFICATIONS = False


#Email Credentials
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")