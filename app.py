# app.py
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask.cli import AppGroup

from models import db
from dotenv import load_dotenv

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
    CORS(app, origins=["http://localhost:3000"])
    print("Using database:", app.config['SQLALCHEMY_DATABASE_URI'])

    from routes.api import api
    app.register_blueprint(api)
  
    

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        # --- explicit seeding ---
        from models import init_db_command, db as _db
        from models import User, Supplier, Product
        from werkzeug.security import generate_password_hash

        # same code as in init_db_command
        _db.session.execute(_db.text('TRUNCATE users, suppliers, products RESTART IDENTITY CASCADE'))

        admin = User(username="admin", email="admin@example.com", role="Admin")
        admin.set_password("admin123")
        saler = User(username="saler", email="saler@test.com", role="Salesperson")
        saler.set_password("staff123")

        supplier = Supplier(name="Default Supplier", contact="1234567890", email="supplier@example.com")
        _db.session.add_all([admin, saler, supplier])
        _db.session.commit()

        products = [
            Product(sku="A101", name="Amul butter", quantity=100, price=30.0, supplier_id=supplier.id),
            Product(sku="A102", name="Maggie",      quantity=150, price=15.0, supplier_id=supplier.id),
            Product(sku="A103", name="Milk",        quantity=75,  price=35.0, supplier_id=supplier.id),
            Product(sku="A104", name="Detergent",   quantity=75,  price=112.0, supplier_id=supplier.id),
            Product(sku="A105", name="Biscuit",     quantity=200, price=10.0, supplier_id=supplier.id),
        ]
        _db.session.add_all(products)
        _db.session.commit()
        print("✅ Sample data inserted.")
    app.run(port=5001, debug=True)