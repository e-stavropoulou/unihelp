import jwt
from flask import request, jsonify
from functools import wraps
from config import JWT_SECRET  # Τώρα έρχεται από .env

def require_token(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Λείπει ή μη έγκυρο token'}), 401

        token = auth_header.split(' ')[1]

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            request.user_email = payload['email']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Το token έληξε'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Μη έγκυρο token'}), 401

        return func(*args, **kwargs)
    return wrapper
