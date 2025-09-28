from flask import Blueprint, request, jsonify, send_from_directory, redirect, current_app, send_file
from models.user import db, User
from models.course import Course, UserCourse
from models.note import Note
from models.favorite import Favorite
from utils.push_utils import send_push_notification
from werkzeug.utils import secure_filename
import requests
import os
from models.notification import Notification
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo  
from config import BASE_URL
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)
import os
import re
import secrets
from utils.email_utils import send_verification_email, send_reset_email
from models.comment import Comment
from utils.decorators import block_check
import mimetypes



auth_bp = Blueprint('auth', __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'avatars')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

NOTES_UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'notes')
os.makedirs(NOTES_UPLOAD_FOLDER, exist_ok=True)

JWT_EXPIRATION_MINUTES = 60

ATHENS_TZ = ZoneInfo("Europe/Athens")

def to_athens_iso(dt: datetime) -> str:
    """
    datetime (UTC ή naive) se ISO string Europe/Athens
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        # esto oti dt apo DB einai UTC
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ATHENS_TZ).isoformat()



# register
@auth_bp.route('/register', methods=['POST'])
def register():
    print("🚀 Register endpoint reached")

    data = request.json
    print("📥 Data received:", data)

    skills = data.get('skills')  # can help
    if not skills or not isinstance(skills, list) or len(skills) == 0:
        print("❌ No skills provided!")
        return jsonify({'error': 'Πρέπει να επιλέξεις τουλάχιστον 1 μάθημα.'}), 400

    email = data.get('email', '').strip()
    password = data.get('password', '')
    birthdate_str = data.get('birthdate', '')
    print("📨 Registering:", email)

    if not re.match(r'.+@(upatras\.gr|ceid\.upatras\.gr)$', email):
        print("❌ Invalid email format!")
        return jsonify({'error': 'Μη έγκυρο email'}), 400
    if User.query.filter_by(email=email).first():
        print("❌ Email already exists!")
        return jsonify({'error': 'Το email υπάρχει ήδη'}), 400
    if len(password) < 8:
        print("❌ Password too short!")
        return jsonify({'error': 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.'}), 400

    try:
        birthdate_obj = datetime.strptime(birthdate_str, "%d-%m-%Y")
    except ValueError:
        print("❌ Invalid birthdate format!")
        return jsonify({'error': 'Μη έγκυρη μορφή ημερομηνίας.'}), 400

    today = datetime.today()
    age = (today - birthdate_obj).days // 365
    if birthdate_obj > today or age < 17:
        print("❌ Underage or future birthdate!")
        return jsonify({'error': 'Πρέπει να είσαι τουλάχιστον 17 ετών.'}), 400

    user = User(
        email=email,
        username=data.get('username'),
        full_name=data.get('full_name') or data.get('fullName'),
        password=generate_password_hash(password),
        semester=data.get('semester'),
        year=data.get('year'),
        birthdate=birthdate_str,
        department=data.get('department', "Μηχανικών Η/Υ και Πληροφορικής")
    )

    # sxesi UserCourse me can_help = True
    print("📚 Adding selected skills (can_help=True):", skills)
    for course_name in skills:
        course = Course.query.filter_by(name=course_name).first()
        if course:
            uc = UserCourse(user=user, course=course, can_help=True)
            db.session.add(uc)
        else:
            print(f"⚠️ Course not found: {course_name}")

    # Token gia epalitheusi email
    token = secrets.token_urlsafe(32)
    user.verification_token = token
    user.is_verified = False

    db.session.add(user)
    db.session.commit()
    print("✅ User and skills committed to DB")

    print("📧 Sending verification email to:", user.email)
    send_verification_email(user.email, token)

    print("✅ All done! Returning response")
    return jsonify({
        'message': 'Εγγραφή επιτυχής',
        'token': token,
        'email': user.email
    }), 201



# login
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    print("🟢 /login called with data:", data)

    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    user = User.query.filter_by(email=email).first()
    if not user:
        print("🔴 User not found")
        return jsonify({'message': 'Ο χρήστης δεν βρέθηκε'}), 404

    if not check_password_hash(user.password, password):
        print("🔴 Wrong password")
        return jsonify({'message': 'Λανθασμένος κωδικός'}), 401

    if not user.is_verified:
        print("🔴 User not verified")
        return jsonify({
            'message': 'Ο λογαριασμός σου δεν έχει ενεργοποιηθεί. Έλεγξε το email σου.',
            'error': 'not_verified'
        }), 403
    
        # elegxos gia block
    if user.is_blocked:
        print("🔴 User is blocked")
        return jsonify({
            'message': 'Ο λογαριασμός σου έχει μπλοκαριστεί. Επικοινώνησε με τον διαχειριστή στέλνοντας email: st1067476@ceid.upatras.gr.',
            'error': 'blocked'
        }), 403

    # access + refresh tokens
    access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    refresh_token = create_refresh_token(identity=str(user.id))
    print("🟢 Login success, tokens created")

    return jsonify({
        'message': 'Επιτυχής σύνδεση',
        'email': user.email,
        'user_id': user.id,
        'role': user.role,
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token': access_token
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)   
def refresh():
    user_id = get_jwt_identity()
    new_access = create_access_token(identity=str(user_id))
    return jsonify({'access_token': new_access}), 200


# check if email or username exists
@auth_bp.route('/check-credentials', methods=['POST'])
def check_credentials():
    data = request.json
    email = data.get('email', '').strip()
    username = data.get('username', '').strip()
    return jsonify({
        'email_exists': User.query.filter_by(email=email).first() is not None,
        'username_exists': User.query.filter_by(username=username).first() is not None
    }), 200

# courses
@auth_bp.route('/courses', methods=['GET'])
def get_courses():
    courses = Course.query.all()
    return jsonify([
    {
        "id": c.id,
        "name": c.name,
        "semester": c.semester,
        "type": c.type
    } for c in courses
]), 200


# upload note
@auth_bp.route('/upload-note', methods=['POST'])
@jwt_required()
@block_check
def upload_note():
    from models.course import UserCourse
    from models.notification import Notification
    from utils.push_utils import send_push_notification

    print("💣 ΕΚΤΕΛΕΣΗ ΤΟΥ ΠΡΑΓΜΑΤΙΚΟΥ /upload-note BACKEND 💣")

    print("\n📥 [UPLOAD] Νέα αίτηση για ανέβασμα σημείωσης")

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    NOTES_UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads', 'notes')
    os.makedirs(NOTES_UPLOAD_FOLDER, exist_ok=True)


    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    print(f"👤 Συνδεδεμένος χρήστης: {user.username} (ID: {user.id})")

    files = request.files.getlist('files')
    course_id = request.form.get('course_id')
    title = request.form.get('title')
    description = request.form.get('description')
    category = request.form.get('category')

    print(f"📎 Αρχεία: {len(files)}")
    print(f"📚 course_id: {course_id} | 🏷️ Τίτλος: {title} | 🧾 Περιγραφή: {description} | 📂 Κατηγορία: {category}")

    if not files or not course_id or not title or not category or not description:
        print("❌ Λείπουν απαιτούμενα πεδία!")
        return jsonify({'error': 'Λείπουν απαιτούμενα πεδία'}), 400

    uploaded_files = []
    for file in files:
        if file.filename == '':
            print("⚠️ Αγνοήθηκε αρχείο χωρίς όνομα.")
            continue
        filename = secure_filename(file.filename)
        filepath = os.path.join(NOTES_UPLOAD_FOLDER, filename)
        file.save(filepath)
        print(f"📤 Αποθηκεύτηκε αρχείο: {filename}")
        note = Note(
            user_id=user.id,
            course_id=course_id,
            title=title,
            description=description,
            category=category,
            filename=filename,
            filepath=filepath
        )
        db.session.add(note)
        uploaded_files.append(filename)

    # prso8hkh 10 pontwn ston xrhsth
    user.upoints += 10
    print("⭐ Προστέθηκαν 10 πόντοι στον χρήστη.")

    # dhmioyrgia notification epibravewshs
    reward_notification = Notification(
        user_id=user.id,
        message="Μπράβο! 🎉 Κέρδισες 10 πόντους για την ανάρτηση της σημείωσης."
    )
    db.session.add(reward_notification)

    # push epibravewshs
    if user.fcm_token:
        try:
            status, resp = send_push_notification(
                token=user.fcm_token,
                title="🏆 Επιβράβευση",
                body="Μπράβο! Κέρδισες 10 πόντους για την ανάρτηση της σημείωσης.",
                data={"type": "points", "points_awarded": "10"}
            )
            print(f"✅ Push επιβράβευσης στάλθηκε στον {user.username}: {status}")
        except Exception as e:
            print(f"❌ Σφάλμα στο push επιβράβευσης: {e}")
    else:
        print("⚠️ Ο χρήστης δεν έχει FCM token, δεν εστάλη push.")


    db.session.commit()
    print("✅ Αποθηκεύτηκαν οι σημειώσεις και η ειδοποίηση επιβράβευσης.")

    # eidopoisi se allous xrhstes pou endiaferontai
    course = Course.query.get(course_id)
    if not course:
        print("❌ Δεν βρέθηκε το μάθημα.")
        return jsonify({'error': 'Το μάθημα δεν υπάρχει'}), 404

    print(f"📚 Μάθημα: {course.name} (ID: {course.id})")

    interested_users = UserCourse.query.filter(
        UserCourse.course_id == course.id,
        (UserCourse.needs_help == True) | (UserCourse.can_help == True)
    ).all()

    print(f"🔍 Εντοπίστηκαν {len(interested_users)} χρήστες που ενδιαφέρονται για το μάθημα.")

    notifications = []
    for uc in interested_users:
        if uc.user_id == user.id:
            continue  # αγνόησε τον εαυτό του
        notif = Notification(
            user_id=uc.user_id,
            message=f"Ανέβηκε νέα σημείωση στο μάθημα {course.name}!"
        )
        notifications.append(notif)

    db.session.add_all(notifications)
    db.session.commit()
    print(f"📨 Δημιουργήθηκαν {len(notifications)} ειδοποιήσεις στη βάση.")

    # push
    sent_count = 0
    for uc in interested_users:
        if uc.user_id == user.id:
            continue

        recipient = User.query.get(uc.user_id)
        if recipient and recipient.fcm_token:
            print(f"📲 Προσπάθεια push σε {recipient.username} | Token: {recipient.fcm_token[:20]}...")
            try:
                status, push_resp = send_push_notification(
                    token=recipient.fcm_token,
                    title="📚 Νέα Σημείωση",
                    body=f"Ανέβηκε νέα σημείωση στο μάθημα {course.name}!",
                    data={
                        "type": "note",            
                        "course_id": str(course.id),
                        "note_title": title,
                        "uploader": user.username
                    }
                )

                print(f"✅ Push σε {recipient.username}: {status}")
                sent_count += 1
            except Exception as e:
                print(f"❌ Αποτυχία push σε {recipient.email}: {e}")
        else:
            print(f"⚠️ Χρήστης {recipient.username if recipient else 'N/A'} δεν έχει fcm_token.")

    print(f"🚀 Ολοκληρώθηκε αποστολή push σε {sent_count} χρήστες.")

    return jsonify({'message': 'Οι σημειώσεις ανέβηκαν επιτυχώς', 'files': uploaded_files}), 200




# my notes
@auth_bp.route('/my-notes', methods=['GET'])
@jwt_required()
def get_my_notes():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))


    notes = Note.query.filter_by(user_id=user.id).order_by(Note.upload_date.desc()).all()
    result = []

    for note in notes:
        course = Course.query.get(note.course_id)
        result.append({
            'id': note.id,
            'title': note.title,
            'description': note.description,
            'category': note.category,
            'upload_date': to_athens_iso(note.upload_date),
            'filepath': f'{BASE_URL}/download/{note.id}',
            'course': course.name if course else 'Άγνωστο',
            'semester': course.semester if course else None,
            'type': course.type if course else None
        })

    return jsonify(result), 200


# all notes
@auth_bp.route('/all-notes', methods=['GET'])
@jwt_required()
@block_check
def get_all_notes():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    fav_ids = [fav.note_id for fav in Favorite.query.filter_by(user_id=user.id).all()]
    notes = Note.query.order_by(Note.upload_date.desc()).all()

    result = []
    for note in notes:
        user_ = User.query.get(note.user_id)
        course = Course.query.get(note.course_id)

        result.append({
            'id': note.id,
            'title': note.title,
            'description': note.description,
            'downloads': note.downloads,
            'category': note.category,
            'upload_date': to_athens_iso(note.upload_date),
            'filepath': f'{BASE_URL}/download/{note.id}',
            'course': course.name if course else 'Άγνωστο',
            'semester': course.semester if course else None,
            'type': course.type if course else None,
            'uploader': user_.username if user_ else 'Άγνωστος',
            'user_id': note.user_id,          # 👈 πρόσθεσέ το εδώ
            'isFavorite': note.id in fav_ids
        })

    return jsonify(result), 200



# edit note
@auth_bp.route('/edit-note/<int:note_id>', methods=['PUT'])
@jwt_required()
def edit_note(note_id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))


    note = Note.query.get(note_id)

    if not note or note.user_id != user.id:
        return jsonify({'error': 'Δεν έχεις δικαίωμα επεξεργασίας αυτής της σημείωσης.'}), 403

    
    title = request.form.get('title')
    description = request.form.get('description')
    category = request.form.get('category')
    course_id = request.form.get('course_id')

    note.title = title or note.title
    note.description = description or note.description
    note.category = category or note.category
    note.course_id = course_id or note.course_id

    
    new_file = request.files.get('file')
    if new_file:
        if note.filepath and os.path.exists(note.filepath):
            os.remove(note.filepath)

        from werkzeug.utils import secure_filename
        filename = secure_filename(new_file.filename)
        filepath = os.path.join(NOTES_UPLOAD_FOLDER, filename)
        new_file.save(filepath)

        note.filename = filename
        note.filepath = filepath

    db.session.commit()
    return jsonify({'message': 'Η σημείωση ενημερώθηκε επιτυχώς.'}), 200


# delete note
@auth_bp.route('/delete-note/<int:note_id>', methods=['DELETE'])
@jwt_required()
def delete_note(note_id):
    import traceback

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    print(f"🟢 Διαγραφή σημείωσης: note_id={note_id}, user_id={user_id}")

    note = Note.query.get(note_id)

    if not note:
        print("❌ Σημείωση δεν βρέθηκε στη βάση")
        return jsonify({'error': 'Η σημείωση δεν βρέθηκε.'}), 404

    if note.user_id != user.id:
        print(f"❌ Ο χρήστης {user.id} προσπάθησε να διαγράψει σημείωση που ανήκει στον {note.user_id}")
        return jsonify({'error': 'Δεν έχεις δικαίωμα διαγραφής αυτής της σημείωσης.'}), 403

    try:
        # 🗑️ Διαγραφή αρχείου αν υπάρχει
        if note.filepath and os.path.exists(note.filepath):
            os.remove(note.filepath)
            print(f"🗑️ Αρχείο διαγράφηκε: {note.filepath}")
        else:
            print(f"⚠️ Το αρχείο δεν βρέθηκε στο filesystem: {note.filepath}")

        # 🗑️ Διαγραφή σημείωσης (θα καθαρίσει αυτόματα favorites/comments/reports λόγω cascade)
        db.session.delete(note)
        db.session.commit()

        print(f"✅ Η σημείωση {note.id} διαγράφηκε επιτυχώς από DB")
        return jsonify({'message': 'Η σημείωση διαγράφηκε επιτυχώς.'}), 200

    except Exception as e:
        print("❌ Σφάλμα κατά τη διαγραφή:", str(e))
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'error': f'Σφάλμα κατά τη διαγραφή: {str(e)}'}), 500


    
# get note
@auth_bp.route('/get-note/<int:note_id>', methods=['GET'])
@jwt_required()
def get_note(note_id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))


    note = Note.query.get(note_id)

    if not note or note.user_id != user.id:
        return jsonify({'error': 'Δεν έχεις πρόσβαση σε αυτή τη σημείωση.'}), 403

    course = Course.query.get(note.course_id)

    return jsonify({
        'id': note.id,
        'title': note.title,
        'description': note.description,
        'category': note.category,
        'course_id': note.course_id,
        'course': {
            'id': course.id,
            'name': course.name,
            'semester': course.semester
        } if course else None
    }), 200

# favories
@auth_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_favorites():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))


    favorites = Favorite.query.filter_by(user_id=user.id).all()
    note_ids = [fav.note_id for fav in favorites]
    notes = Note.query.filter(Note.id.in_(note_ids)).order_by(Note.upload_date.desc()).all()

    result = []
    for note in notes:
        course = Course.query.get(note.course_id)
        uploader = User.query.get(note.user_id)

        result.append({
            'id': note.id,
            'title': note.title,
            'description': note.description,
            'category': note.category,
            'upload_date': to_athens_iso(note.upload_date),
            'filepath': f'{BASE_URL}/download/{note.id}',
            'course': course.name if course else 'Άγνωστο',
            'semester': course.semester if course else None,
            'type': course.type if course else None,
            'uploader': uploader.username if uploader else 'Άγνωστος'
        })

    return jsonify(result), 200


# toggle favorite
@auth_bp.route('/favorite', methods=['POST'])
@jwt_required()
def toggle_favorite():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))


    data = request.json
    note_id = data.get('note_id')

    existing = Favorite.query.filter_by(user_id=user.id, note_id=note_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'message': 'Αφαιρέθηκε από τα αγαπημένα.'}), 200
    else:
        new_fav = Favorite(user_id=user.id, note_id=note_id)
        db.session.add(new_fav)
        db.session.commit()
        return jsonify({'message': 'Προστέθηκε στα αγαπημένα!'}), 201



# epiveveosi email

@auth_bp.route('/verify/<token>', methods=['GET'])
def verify_email(token):
    user = User.query.filter_by(verification_token=token).first()
    frontend = current_app.config.get('FRONTEND_URL', 'http://localhost:8080').rstrip('/')

    print("👉 FRONTEND_URL που χρησιμοποιώ:", frontend)

    if not user:
        return redirect(f"{frontend}/verify-invalid")

    user.is_verified = True
    user.verification_token = None
    db.session.commit()

    return redirect(f"{frontend}/email-verified")





@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    data = request.json
    email = data.get('email', '').strip()

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({
        'error': 'user_not_found',
        'message': 'Δεν υπάρχει χρήστης με αυτό το email.'
    }), 404
    if user.is_verified:
        return jsonify({
        'error': 'already_verified',
        'message': 'Ο λογαριασμός σου είναι ήδη επιβεβαιωμένος. Μπορείς να συνδεθείς.'
    }), 403


    import secrets
    from utils.email_utils import send_verification_email

    user.verification_token = secrets.token_urlsafe(32)
    db.session.commit()

    send_verification_email(user.email, user.verification_token)

    return jsonify({'message': 'Το email επιβεβαίωσης εστάλη ξανά.'}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email', '').strip()

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Δεν βρέθηκε χρήστης με αυτό το email.'}), 404

    token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=1)

    user.reset_token = token
    user.reset_token_expiry = expiry
    db.session.commit()

    send_reset_email(user.email, token)

    return jsonify({'message': 'Στάλθηκε email επαναφοράς κωδικού.'}), 200


@auth_bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    data = request.json
    new_password = data.get('password', '')

    if len(new_password) < 8:
        return jsonify({'error': 'Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.'}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user or user.reset_token_expiry < datetime.utcnow():
        return jsonify({'error': 'Ο σύνδεσμος έχει λήξει ή δεν είναι έγκυρος.'}), 400

    # elegxei an o neos kwdikos einai idios me ton palio
    if check_password_hash(user.password, new_password):
        return jsonify({'error': 'Ο νέος κωδικός δεν μπορεί να είναι ίδιος με τον τρέχοντα.'}), 400

    user.password = generate_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()

    return jsonify({'message': 'Ο νέος κωδικός ορίστηκε με επιτυχία!'}), 200
