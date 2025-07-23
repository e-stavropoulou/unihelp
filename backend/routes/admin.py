from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from utils.decorators import admin_required
from models.shared import db 



admin_bp = Blueprint('admin_bp', __name__, url_prefix='/admin')

@admin_bp.route('/make-admin/<int:user_id>', methods=['POST'])
@jwt_required()
@admin_required
def make_admin(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.role == 'admin':
        return jsonify({'message': f'{user.username} is already an admin.'}), 200

    user.role = 'admin'
    db.session.commit()
    return jsonify({'message': f'{user.username} has been promoted to admin.'}), 200


@admin_bp.route('/admins', methods=['GET'])
@jwt_required()
@admin_required
def get_admins():
    admins = User.query.filter_by(role='admin').all()
    return jsonify([{
        'id': a.id,
        'username': a.username,
        'email': a.email,
        'full_name': a.full_name
    } for a in admins]), 200


@admin_bp.route('/remove-admin/<int:user_id>', methods=['POST'])
@jwt_required()
@admin_required
def remove_admin(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.role != 'admin':
        return jsonify({'message': f'{user.username} is not an admin.'}), 400
    user.role = 'user'
    db.session.commit()
    return jsonify({'message': f'{user.username} is no longer an admin.'}), 200


@admin_bp.route('/dashboard-access', methods=['GET'])
@jwt_required()
@admin_required
def admin_dashboard_access():
    return jsonify({"access": "granted"}), 200

