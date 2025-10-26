from flask import Blueprint, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.note import Note
from models.shared import db
import os
import mimetypes
import imghdr  # ✅ για ανίχνευση εικόνων

download_notes_bp = Blueprint('download_notes', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTES_UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads', 'notes')

def is_pdf_file(path: str) -> bool:
    try:
        with open(path, 'rb') as f:
            return f.read(5) == b'%PDF-'
    except Exception:
        return False

@download_notes_bp.route('/download/<int:note_id>', methods=['GET'])
@jwt_required()
def download_note(note_id):
    note = Note.query.get(note_id)
    if not note:
        return jsonify({'error': 'Η σημείωση δεν βρέθηκε.'}), 404

    try:
        current_user_id = int(get_jwt_identity())
    except:
        current_user_id = None

    # ✅ αύξηση downloads μόνο αν δεν είναι ο uploader
    if current_user_id != note.user_id:
        note.downloads += 1
        db.session.commit()

    file_path = note.filepath or os.path.join(NOTES_UPLOAD_FOLDER, note.filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'Το αρχείο δεν βρέθηκε στον server'}), 404

    # 1) PDF με signature → ΠΑΝΤΑ inline ως application/pdf
    if is_pdf_file(file_path):
        resp = send_file(
            file_path,
            as_attachment=False,
            download_name=note.filename,
            mimetype="application/pdf",
            conditional=True
        )
        resp.headers["Content-Disposition"] = f'inline; filename="{note.filename}"'
        return resp

    # 2) Εικόνες (jpg/png/gif/webp) → inline με σωστό image/*
    img_kind = imghdr.what(file_path)  # 'jpeg', 'png', 'gif', 'webp', ...
    if img_kind:
        img_mime = f'image/{ "jpeg" if img_kind=="jpeg" else img_kind }'
        resp = send_file(
            file_path,
            as_attachment=False,
            download_name=note.filename,
            mimetype=img_mime,
            conditional=True
        )
        resp.headers["Content-Disposition"] = f'inline; filename="{note.filename}"'
        return resp

    # 3) Ό,τι άλλο → attachment (κατέβασμα)
    mime_type, _ = mimetypes.guess_type(note.filename or file_path)
    if mime_type is None:
        mime_type = "application/octet-stream"

    return send_file(
        file_path,
        as_attachment=True,              # 👉 θα βάλει μόνο του attachment disposition
        download_name=note.filename,
        mimetype=mime_type,
        conditional=True
    )
@download_notes_bp.route('/notes/<int:note_id>/increment-downloads', methods=['POST'])
@jwt_required()
def increment_downloads(note_id):
    note = Note.query.get_or_404(note_id)

    current_user_id = int(get_jwt_identity())
    if current_user_id != note.user_id:
        note.downloads = (note.downloads or 0) + 1
        db.session.commit()

    return jsonify({"downloads": note.downloads})
