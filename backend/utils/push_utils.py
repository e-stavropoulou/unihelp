import os
import requests
from google.oauth2 import service_account
import google.auth.transport.requests

# 📌 Project ID από το Firebase project σου
PROJECT_ID = "unihelp-notifications"

# 📌 Scopes για FCM
SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]

# 📌 Το JSON service account αρχείο σου
SERVICE_ACCOUNT_FILE = os.path.join(
    os.path.dirname(__file__), "..", "fcm", "service_account.json"
)



# 📌 Νέο endpoint για HTTP v1
FCM_URL = f"https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send"


def get_access_token():
    """Φτιάχνει νέο OAuth2 access token (~1h διάρκεια)"""
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    request = google.auth.transport.requests.Request()
    credentials.refresh(request)
    return credentials.token


def send_push_notification(token: str, title: str, body: str, image: str = None, data: dict = None):

    """Στέλνει push notification σε ένα συγκεκριμένο FCM token (notification-only)"""
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

    # ➕ Αν έχει image
    if image:
        message["message"]["image"] = image

    # ➕ Αν έχει data
    if data:
        message["message"]["data"] = data  


    try:
        response = requests.post(FCM_URL, headers=headers, json=message)
        print("🟢 Το αίτημα στο FCM έγινε.")
        print(f"🔔 Push response: {response.status_code} - {response.text}")
        return response.status_code, response.text
    except Exception as e:
        print(f"❌ Exception στο push: {e}")
        return 500, str(e)
