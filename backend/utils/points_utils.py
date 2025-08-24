# utils/points_utils.py

from models.notification import Notification
from models.shared import db
from models.user import User
from utils.push_utils import send_push_notification  # ✅

def award_points(user: User, amount: int, reason: str = None):
    user.upoints += amount

    if reason:
        # ✅ Ειδοποίηση in-app
        reward = Notification(user_id=user.id, message=reason)
        db.session.add(reward)

        # ✅ Push notification
        if user.fcm_token:
            try:
                title = "🎉 Μπράβο!"
                status, msg = send_push_notification(
                    token=user.fcm_token,
                    title=title,
                    body=reason,
                    data={
                        "type": "points",
                        "points": str(amount)
                    }
                )

                print(f"[Push 🔔] Status: {status} | {msg}")
            except Exception as e:
                print(f"[Push ❌] Exception: {e}")
