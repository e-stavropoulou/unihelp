import os
import requests
from google.oauth2 import service_account
import google.auth.transport.requests
import json

from models.shared import db
from models.user import User

PROJECT_ID = "unihelp-notifications"
SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]

SERVICE_ACCOUNT_FILE = os.path.join(
    os.path.dirname(__file__), "..", "fcm", "service_account.json"
)

FCM_URL = f"https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send"


def get_access_token():
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    request = google.auth.transport.requests.Request()
    credentials.refresh(request)
    return credentials.token


def send_push_notification(token: str, title: str, body: str, image: str = None, data: dict = None):
    """Sends a push notification via Firebase Cloud Messaging (FCM)."""
    print("🚨 ΚΛΗΘΗΚΕ send_push_notification με token:", token)
    access_token = get_access_token()
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; UTF-8"
    }

    message = {
        "message": {
            "token": token,
            "notification": {
                "title": title,
                "body": body
            }
        }
    }

    if image:
        message["message"]["image"] = image

    if data:
        message["message"]["data"] = data

    try:
        response = requests.post(FCM_URL, headers=headers, json=message)
        print("🟢 Το αίτημα στο FCM έγινε.")
        print(f"🔔 Push response: {response.status_code} - {response.text}")

        # UNREGISTERED
        if response.status_code == 404 and "UNREGISTERED" in response.text:
            print(f"⚠️ Token {token} είναι UNREGISTERED – διαγραφή από DB")
            user = User.query.filter_by(fcm_token=token).first()
            if user:
                user.fcm_token = None
                db.session.commit()

        return response.status_code, response.text

    except Exception as e:
        print(f"❌ Exception στο push: {e}")
        return 500, str(e)
