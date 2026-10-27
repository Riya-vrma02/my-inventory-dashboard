import os
import sys

from flask import Flask, app
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from models import db

load_dotenv()


def create_app():
    app = Flask(__name__)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print(
            "FATAL: DATABASE_URL is not set. Copy backend/.env.example to "
            "backend/.env and fill in your Postgres connection string.",
            file=sys.stderr,
        )
        sys.exit(1)

    jwt_secret = os.getenv("JWT_SECRET_KEY")
    if not jwt_secret:
        print(
            "FATAL: JWT_SECRET_KEY is not set. Add it to backend/.env.",
            file=sys.stderr,
        )
        sys.exit(1)

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = jwt_secret

    # Covers the ports Create React App commonly falls back to (3000 is taken
    # a lot of the time, CRA silently offers 3001, 3002, ...).
    CORS(
        app,
        resources={r"/api/*": {"origins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        ]}},
        supports_credentials=True,
    )

    db.init_app(app)
    JWTManager(app)

    from routes.api import api
    from routes.preprocessing import preprocessing
    from routes.ml_evaluation import ml_evaluation_bp

    app.register_blueprint(api)
    app.register_blueprint(preprocessing)
    app.register_blueprint(ml_evaluation_bp)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app


app = create_app()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("Database tables ensured.")
    print(f"Using database: {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1]}")
    app.run(port=5001, debug=True)
