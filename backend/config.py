import os
from dotenv import load_dotenv


env = os.getenv("FLASK_ENV", "development")

if env == "production":
    load_dotenv(".env.production")
else:
    load_dotenv(".env")

BASE_URL = os.getenv("BASE_URL", "http://localhost:5050")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")
JWT_SECRET = os.getenv("JWT_SECRET", "fallback-secret")
SQLALCHEMY_DATABASE_URI = os.getenv(
    "DATABASE_URI",
    "mysql+pymysql://unihelp:supersecurepass@localhost/unihelp" # fallback
)
SQLALCHEMY_TRACK_MODIFICATIONS = False


#Email Credentials
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
