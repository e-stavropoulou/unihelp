import requests
import os

FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send"
FCM_SERVER_KEY = os.environ.get("FCM_SERVER_KEY")

def send_push_notification(token, title, body):
    if not FCM_SERVER_KEY:
        print("⚠️ Το FCM_SERVER_KEY λείπει από τα environment variables.")
        return 401, "Missing server key"

    headers = {
        "Authorization": f"key={FCM_SERVER_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "to": token,
        "notification": {
            "title": title,
            "body": body
        },
        "priority": "high"
    }

    response = requests.post(FCM_ENDPOINT, headers=headers, json=payload)
    print(f"🔔 Push response: {response.status_code} - {response.text}")
    return response.status_code, response.text
