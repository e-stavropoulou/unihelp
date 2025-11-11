import os
import fitz  
import pytesseract
from PIL import Image
from docx import Document
import json

from app import create_app
from models.shared import db
from models.note import Note
from models.user import User
from models.course import Course
from models.comment import Comment
from models.note_review import NoteReview
from models.user_review import UserReview

app = create_app()
app.app_context().push()

# fakelos me tis simioseis (dynamic path για Mac + Server)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTES_FOLDER = os.path.join(BASE_DIR, "uploads", "notes")


ALLOWED_EXTENSIONS = ('.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg')


def extract_text_from_pdf(path):
    """eksagw keimeno apo pdf, me pytesseract an den yparxei"""
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text()

    if not text.strip():
        # an den vtrethei text → OCR fallback
        print(f"🔄 OCR σε σκαναρισμένο PDF: {path}")
        text_pages = []
        for page_num in range(len(doc)):
            pix = doc[page_num].get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            ocr_text = pytesseract.image_to_string(img, lang="ell+eng")
            text_pages.append(ocr_text)
        text = "\n".join(text_pages)

    return text


def extract_text_from_docx(path):
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_text_from_txt(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()


def extract_text_from_image(path):
    img = Image.open(path)
    return pytesseract.image_to_string(img, lang="ell+eng")

def get_note_avg_rating(note_id):
    reviews = NoteReview.query.filter_by(note_id=note_id).all()
    if not reviews:
        return None, 0
    avg = round(sum(r.rating for r in reviews) / len(reviews), 2)
    return avg, len(reviews)


def get_user_avg_rating(user_id):
    reviews = UserReview.query.filter_by(reviewed_id=user_id).all()
    if not reviews:
        return None, 0
    avg = round(sum(r.rating for r in reviews) / len(reviews), 2)
    return avg, len(reviews)



def extract_text(path, ext):
    try:
        ext = ext.lower().strip()
        if ext == ".pdf":
            return extract_text_from_pdf(path)
        elif ext == ".docx":
            return extract_text_from_docx(path)
        elif ext == ".txt":
            return extract_text_from_txt(path)
        elif ext in (".jpg", ".jpeg", ".png"):
            return extract_text_from_image(path)
        else:
            return None
    except Exception as e:
        print(f"❌ Σφάλμα με {path}: {e}")
        return None


def process_all_notes():
    results = []
    all_notes = Note.query.all()

    for note in all_notes:
        filename = (note.filename or "").strip()
        ext = os.path.splitext(filename)[1].lower().strip()

        note_rating, note_count = get_note_avg_rating(note.id)
        user_rating, user_count = get_user_avg_rating(note.user.id) if note.user else (None, 0)

        semester_val = None
        course_type_val = None

        if note.course:
            if note.course.semester:  # Αν υπάρχει εξάμηνο
                semester_val = note.course.semester
                course_type_val = note.course.type
            else:  # Αν ΔΕΝ υπάρχει εξάμηνο
                semester_val = note.course.type  # ➡️ Εδώ βάζουμε τον τύπο στο πεδίο εξάμηνο
                course_type_val = note.course.type

        if ext not in ALLOWED_EXTENSIONS:
            print(f"⏩ Παράλειψη μη υποστηριζόμενου αρχείου: {filename}")

            cleaned_text = (
                f"📘 Αυτή η σημείωση ({note.title or 'Χωρίς τίτλο'}) αφορά το μάθημα "
                f"{note.course.name if note.course else 'Άγνωστο μάθημα'} και έχει ανέβει από τον χρήστη "
                f"{note.user.username if note.user else 'Άγνωστος'}. "
                f"⚠️ Το αρχείο έχει τύπο {ext} που δεν υποστηρίζεται για εξαγωγή περιεχομένου."
            )

            results.append({
                "filename": filename,
                "extension": ext,
                "title": note.title or "Χωρίς τίτλο",
                "text": cleaned_text,
                "downloads": getattr(note, "downloads", 0),
                "comments": len(note.comments) if hasattr(note, "comments") else 0,
                "uploader": note.user.username if note.user else "Άγνωστος",
                "course": note.course.name if note.course else "Άγνωστο μάθημα",
                "semester": semester_val,
                "course_type": course_type_val,
                "upload_date": note.upload_date.isoformat() if note.upload_date else None,  # ➕ Ημερομηνία
                "note_rating": f"{note_rating} ⭐ ({note_count} reviews)" if note_rating else "χωρίς αξιολόγηση",
                "uploader_rating": f"{user_rating} ⭐ ({user_count} reviews)" if user_rating else "χωρίς αξιολόγηση"
            })


            continue  


        full_path = os.path.join(NOTES_FOLDER, filename)
        if not os.path.exists(full_path):
            print(f"❌ Δεν βρέθηκε το αρχείο: {full_path}")
            continue

        print(f"📄 Επεξεργασία: {filename}")

        try:
            text = extract_text(full_path, ext)
            cleaned_text = text.strip() if text else ""

            if not cleaned_text:
                print(f"⚠️ Δεν εξήχθη κείμενο από: {filename}")
                cleaned_text = (
                    f"📘 Το αρχείο αφορά το μάθημα {note.course.name if note.course else 'Άγνωστο μάθημα'} και έχει ανέβει από τον χρήστη "
                    f"{note.user.username if note.user else 'Άγνωστος'}. Ο τίτλος της σημείωσης είναι: {note.title or 'Χωρίς τίτλο'}. "
                    "⚠️ Δεν ήταν δυνατό να εξαχθεί το ακριβές περιεχόμενο, αλλά περιέχει χρήσιμες πληροφορίες σχετικές με το μάθημα."
                )


        except Exception as e:
            print(f"❌ Σφάλμα με {filename}: {e}")
            cleaned_text = "❌ Παρουσιάστηκε σφάλμα κατά την επεξεργασία του αρχείου."

        results.append({
            "filename": filename,
            "extension": ext,
            "title": note.title or "Χωρίς τίτλο",
            "text": cleaned_text,
            "downloads": getattr(note, "downloads", 0),
            "comments": len(note.comments) if hasattr(note, "comments") else 0,
            "uploader": note.user.username if note.user else "Άγνωστος",
            "course": note.course.name if note.course else "Άγνωστο μάθημα",
            "semester": semester_val,
            "course_type": course_type_val,
            "upload_date": note.upload_date.strftime("%Y-%m-%d %H:%M") if note.upload_date else None,
            "note_rating": f"{note_rating} ⭐ ({note_count} reviews)" if note_rating else "χωρίς αξιολόγηση",
            "uploader_rating": f"{user_rating} ⭐ ({user_count} reviews)" if user_rating else "χωρίς αξιολόγηση"
        })


    with open("notes_text_dataset.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Ολοκληρώθηκε η αποθήκευση. Συνολικά αρχεία: {len(results)}")


if __name__ == "__main__":
    process_all_notes()
