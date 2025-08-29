from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# --- User Model ---
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(300), nullable=False)
    role = db.Column(db.String(20), default="user")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# --- Product Model ---
class Product(db.Model):
    __tablename__ = 'products'
    sku  = db.Column(db.String(50), primary_key=True)   # <-- now PK
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    price = db.Column(db.Float, nullable=False, default=0.0)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'))  # ✅ FK added
    supplier = db.relationship('Supplier', back_populates='products_supplied')
    def to_dict(self):
        return {
            "sku": self.sku,
            "name": self.name,
            "quantity": self.quantity,
            "price": self.price,
            'supplier_id': self.supplier_id
            
        }

# ------------- Sale -------------
class Sale(db.Model):
    __tablename__ = 'sales'
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), db.ForeignKey('products.sku'), nullable=False)  # <-- changed
    quantity_sold = db.Column(db.Integer, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)


# ------------- Defective_Product -------------
class Defective_Product(db.Model):
    __tablename__ = 'defective_products'
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), db.ForeignKey('products.sku'), nullable=False) 
    quantity = db.Column(db.Integer, nullable=False, default=0)
    date_reported = db.Column(db.Date, default=datetime.utcnow)
    reason = db.Column(db.String(100))

# ------------- RestockOrder -------------
class RestockOrder(db.Model):
    __tablename__ = 'restock_orders'
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), db.ForeignKey('products.sku'), nullable=False)  # <-- changed
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='pending')
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

# ------------- Stock -------------
class Stock(db.Model):
    __tablename__ = 'stock'
    sku = db.Column(db.String(50), db.ForeignKey('products.sku'), primary_key=True)  # <-- changed
    quantity = db.Column(db.Integer, nullable=False, default=0)

# ------------- Forecast -------------
class Forecast(db.Model):
    __tablename__ = 'forecasts'
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), db.ForeignKey('products.sku'))  # <-- changed
    predicted_quantity = db.Column(db.Integer, nullable=False)
    forecast_date = db.Column(db.Date, default=datetime.utcnow)

#--- SUPPLIER MODEL---
class Supplier(db.Model):
    __tablename__ = 'suppliers'
    id      = db.Column(db.Integer, primary_key=True)
    name    = db.Column(db.String(120), nullable=False)
    contact = db.Column(db.Integer)
    email   = db.Column(db.String(120))
    products_supplied = db.relationship('Product', back_populates='supplier', cascade='all,delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'contact': self.contact,
            'email': self.email,
            'products_supplied': [p.to_dict() if hasattr(p, 'to_dict') else str(p)
                                  for p in self.products_supplied]
        }

# models.py  (bottom)
from flask.cli import with_appcontext
import click

@click.command("init-db")
@with_appcontext
def init_db_command():
    """Drop and recreate all tables + seed sample data."""
    db.drop_all()
    db.create_all()

    admin = User(id=1, username="admin", email="admin@example.com", role="Admin")
    admin.set_password("admin123")
    saler = User(id=2, username="saler", email="saler@test.com", role="Salesperson")
    saler.set_password("staff123")
    db.session.add_all([admin, saler])

    supplier = [
        Supplier(id=1, name="Default Supplier", contact=1234567890, email="supplier@example.com"),
        Supplier(id=2, name="mahesh", contact=9087654321, email="mahesh@example.com")
    ]
    db.session.add_all(supplier)
    db.session.commit()

    products = [
        Product(sku="A101", name="Amul butter", quantity=100, price=30.0, supplier_id=supplier[0].id),
        Product(sku="A102", name="Maggie", quantity=150, price=15.0, supplier_id=supplier[0].id),
        Product(sku="A103", name="Milk", quantity=75, price=35.0, supplier_id=supplier[0].id),
        Product(sku="A104", name="Detergent", quantity=75, price=112.0, supplier_id=supplier[0].id),
        Product(sku="A105", name="Biscuit", quantity=200, price=10.0, supplier_id=supplier[0].id),
    ]
    db.session.add_all(products)
    db.session.commit()

    defects = [
        Defective_Product(id=1, sku="A101", name="Amul butter", quantity=5, reason="damaged packet", date_reported=datetime.utcnow().date()),
        Defective_Product(id=2, sku="A102", name="Maggie", quantity=3, reason="expired", date_reported=datetime.utcnow().date()),
        Defective_Product(id=3, sku="A105", name="Biscuit", quantity=7, reason="crushed box", date_reported=datetime.utcnow().date()),
    ]
    db.session.add_all(defects)
    try:
        db.session.commit()
        print("✅ Defects committed successfully!")
    except Exception as e:
        db.session.rollback()
        print("❌ Commit failed:", e)
