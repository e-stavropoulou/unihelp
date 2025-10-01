from flask import Blueprint, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.note import Note
from models.shared import db
import os
import mimetypes

download_notes_bp = Blueprint('download_notes', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTES_UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads', 'notes')

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

    # ✅ Μόνο αν δεν είναι ο uploader αυξάνουμε downloads
    if current_user_id != note.user_id:
        note.downloads += 1
        db.session.commit()

    file_path = note.filepath or os.path.join(NOTES_UPLOAD_FOLDER, note.filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'Το αρχείο δεν βρέθηκε στον server'}), 404

    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        mime_type = "application/octet-stream"

    return send_file(
        file_path,
        as_attachment=False,
        download_name=note.filename,
        mimetype=mime_type,
        conditional=True
    )

# 👇 Ρητά inline disposition (μερικά iOS το χρειάζονται)
    response.headers["Content-Disposition"] = f'inline; filename=\"{note.filename}\"'

    # 👇 Προαιρετικό: αποφυγή cache
    response.headers["Cache-Control"] = "no-store"

    return response