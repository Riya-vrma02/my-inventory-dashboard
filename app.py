import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask.cli import AppGroup
from dotenv import load_dotenv

from models import db

load_dotenv()

def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:021105@localhost:5432/inventory_dashboard'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key')

    CORS(app, origins=["http://localhost:3000"])
    db.init_app(app)
    JWTManager(app)

    print("Using database:", app.config['SQLALCHEMY_DATABASE_URI'])

    # Register blueprints
    from routes.api import api
    app.register_blueprint(api)

    return app


# ✅ create global app object for Gunicorn
app = create_app()

if __name__ == '__main__':
    # Only run locally
    with app.app_context():
        db.create_all()  # safe for local dev (no drop_all!)
        print("✅ Tables ensured in local dev.")
    app.run(port=5001, debug=True)
