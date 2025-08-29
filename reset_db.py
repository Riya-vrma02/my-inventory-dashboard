from app import app, db  # make sure 'app' is the actual variable name of your Flask app

with app.app_context():
    db.drop_all()
    db.create_all()
    print("✅ Database reset successful.")