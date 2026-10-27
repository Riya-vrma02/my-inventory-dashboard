from datetime import datetime, date
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(300), nullable=False)
    role = db.Column(db.String(20), default="staff", nullable=False)  # "admin" or "staff"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
        }


class Supplier(db.Model):
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    # Stored as a string on purpose: phone numbers are not arithmetic values.
    # This avoids leading-zero loss and integer-overflow errors on long numbers.
    contact = db.Column(db.String(30))
    email = db.Column(db.String(120))

    products = db.relationship(
        "Product", back_populates="supplier", cascade="all, delete-orphan"
    )
    purchase_orders = db.relationship(
        "PurchaseOrder", back_populates="supplier", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "contact": self.contact,
            "email": self.email,
        }


class Product(db.Model):
    __tablename__ = "products"

    sku = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(60), default="General", nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    price = db.Column(db.Float, nullable=False, default=0.0)
    # Stock level at/below which this product is flagged as needing restock.
    reorder_level = db.Column(db.Integer, nullable=False, default=20)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    supplier = db.relationship("Supplier", back_populates="products")
    sales = db.relationship("Sale", back_populates="product", cascade="all, delete-orphan")
    purchase_orders = db.relationship(
        "PurchaseOrder", back_populates="product", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "sku": self.sku,
            "name": self.name,
            "category": self.category,
            "quantity": self.quantity,
            "price": self.price,
            "reorder_level": self.reorder_level,
            "low_stock": self.quantity <= self.reorder_level,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.name if self.supplier else None,
        }


class Sale(db.Model):
    __tablename__ = "sales"

    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), db.ForeignKey("products.sku"), nullable=False)
    quantity_sold = db.Column(db.Integer, nullable=False)
    sale_date = db.Column(db.Date, default=date.today, nullable=False)
    region = db.Column(db.String(60), default="Unspecified", nullable=False)
    salesperson = db.Column(db.String(80), default="Unspecified", nullable=False)

    product = db.relationship("Product", back_populates="sales")

    def to_dict(self):
        return {
            "id": self.id,
            "sku": self.sku,
            "product_name": self.product.name if self.product else "Unknown",
            "category": self.product.category if self.product else None,
            "quantity_sold": self.quantity_sold,
            "sale_date": self.sale_date.isoformat() if self.sale_date else None,
            "region": self.region,
            "salesperson": self.salesperson,
        }


class PurchaseOrder(db.Model):
    """A restock order placed with a supplier for a given product."""

    __tablename__ = "purchase_orders"

    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=False)
    sku = db.Column(db.String(50), db.ForeignKey("products.sku"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(20), default="pending", nullable=False)  # pending/received/cancelled
    order_date = db.Column(db.Date, default=date.today, nullable=False)

    supplier = db.relationship("Supplier", back_populates="purchase_orders")
    product = db.relationship("Product", back_populates="purchase_orders")

    def to_dict(self):
        return {
            "id": self.id,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.name if self.supplier else None,
            "sku": self.sku,
            "product_name": self.product.name if self.product else None,
            "quantity": self.quantity,
            "unit_cost": self.unit_cost,
            "status": self.status,
            "order_date": self.order_date.isoformat() if self.order_date else None,
        }
