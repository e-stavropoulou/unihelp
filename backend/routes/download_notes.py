# routes/download_notes.py

from flask import Blueprint, jsonify, send_from_directory
from flask_jwt_extended import jwt_required
from models.note import Note
from models.shared import db
import os

download_notes_bp = Blueprint('download_notes', __name__)

NOTES_UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'notes')

@download_notes_bp.route('/download/<int:note_id>', methods=['GET'])
def download_note(note_id):
    note = Note.query.get(note_id)
    if not note:
        return jsonify({'error': 'Η σημείωση δεν βρέθηκε.'}), 404

    note.downloads += 1
    db.session.commit()

    return send_from_directory(NOTES_UPLOAD_FOLDER, note.filename, as_attachment=True)
