import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app


def send_email(to_email, subject, body):
    sender_email = current_app.config['EMAIL_USER']
    sender_password = current_app.config['EMAIL_PASS']

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        print("📧 Email εστάλη επιτυχώς!")
    except Exception as e:
        print("❌ Σφάλμα κατά την αποστολή email:", e)


def send_verification_email(to_email, token):
    base_url = current_app.config['BASE_URL']
    verification_link = f"{base_url}/verify/{token}"
    subject = "Επιβεβαίωση Email για το UniHelp"

    body = f"""
    Γεια σου 👋

    Καλώς ήρθες στο UniHelp! 🎓

    Παρακαλούμε επιβεβαίωσε το email σου πατώντας στον παρακάτω σύνδεσμο:

    {verification_link}

    Αν δεν έκανες εσύ την εγγραφή, αγνόησε αυτό το μήνυμα.

    — Η ομάδα του UniHelp
    """

    send_email(to_email, subject, body)


def send_reset_email(to_email, token):
    base_url = current_app.config.get('BASE_URL', 'http://localhost:5050').rstrip('/')
    reset_url = f"{base_url}/reset-password/{token}"
    subject = "UniHelp | Επαναφορά Κωδικού"

    body = f"""
    Γεια σου 👋

    Ζήτησες επαναφορά του κωδικού σου στο UniHelp.

    Πάτησε τον παρακάτω σύνδεσμο για να ορίσεις νέο κωδικό (ισχύει για 1 ώρα):

    {reset_url}

    Αν δεν έκανες εσύ την αίτηση, αγνόησε αυτό το μήνυμα.

    — Η ομάδα του UniHelp
    """

    send_email(to_email, subject, body)
