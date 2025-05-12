# backend/config.py
import os
from dotenv import load_dotenv


load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://192.168.1.3:5050")
JWT_SECRET = os.getenv("JWT_SECRET", "fallback-secret")
