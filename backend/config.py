import os
from dotenv import load_dotenv
from datetime import timedelta


env = os.getenv("FLASK_ENV", "development")

if env == "production":
    load_dotenv(".env.production")
else:
    load_dotenv(".env")

BASE_URL = os.getenv("BASE_URL", "https://api-unihelp.imslab.gr")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://unihelp.imslab.gr")
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

# JWT config
JWT_SECRET_KEY = JWT_SECRET
JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)   # access λήγει σε 30 λεπτά
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)      # refresh ισχύει 7 μέρες

# 👇 Επιπλέον ρυθμίσεις για να δουλεύει και με ?jwt=...
JWT_TOKEN_LOCATION = ["headers", "query_string"]
JWT_QUERY_STRING_NAME = "jwt"