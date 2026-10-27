import io
from datetime import date
from functools import wraps

import pandas as pd
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required,
    create_access_token,
    get_jwt_identity,
)
from sqlalchemy.exc import IntegrityError

from models import db, User, Supplier, Product, Sale, PurchaseOrder
from forecast import forecast_sku, restock_recommendations

api = Blueprint("api", __name__, url_prefix="/api")


# ---------------------------------------------------------------- helpers --
def error(msg, status=400, **extra):
    body = {"error": msg}
    body.update(extra)
    return jsonify(body), status


def current_user():
    user_id = get_jwt_identity()
    if user_id is None:
        return None
    return User.query.get(int(user_id))


def admin_required(fn):
    """Restricts a route to users with role == 'admin'."""

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user or user.role != "admin":
            return error("Admin access required", 403)
        return fn(*args, **kwargs)

    return wrapper


# -------------------------------------------------------------------- auth --
@api.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role", "staff")
    if role not in ("admin", "staff"):
        role = "staff"

    if not username or not email or not password:
        return error("username, email and password are required", 400)

    if len(password) < 6:
        return error("password must be at least 6 characters", 400)

    if User.query.filter_by(email=email).first():
        return error("An account with this email already exists", 409)

    if User.query.filter_by(username=username).first():
        return error("This username is already taken", 409)

    user = User(username=username, email=email, role=role)
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("Could not create account, please try again", 500)

    return jsonify({"message": "Account created", "user": user.to_dict()}), 201


@api.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("email") or data.get("username") or "").strip().lower()
    password = data.get("password") or ""

    if not identifier or not password:
        return error("email/username and password are required", 400)

    user = User.query.filter(
        (User.email == identifier) | (User.username == identifier)
    ).first()

    if not user or not user.check_password(password):
        return error("Invalid email/username or password", 401)

    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": user.to_dict()}), 200


@api.get("/me")
@jwt_required()
def me():
    user = current_user()
    if not user:
        return error("User not found", 404)
    return jsonify(user.to_dict()), 200


# --------------------------------------------------------------- products --
@api.get("/products")
def get_products():
    products = Product.query.order_by(Product.sku).all()
    return jsonify([p.to_dict() for p in products]), 200


@api.post("/products")
@jwt_required()
def add_product():
    data = request.get_json(silent=True) or {}
    sku = (data.get("sku") or "").strip()
    name = (data.get("name") or "").strip()
    category = (data.get("category") or "General").strip()
    quantity = data.get("quantity")
    price = data.get("price")
    reorder_level = data.get("reorder_level", 20)
    supplier_id = data.get("supplier_id") or None

    if not sku or not name or quantity is None or price is None:
        return error("sku, name, quantity and price are required", 400)

    try:
        quantity = int(quantity)
        price = float(price)
        reorder_level = int(reorder_level)
    except (TypeError, ValueError):
        return error(
            "quantity and reorder_level must be integers, price must be a number", 400
        )

    if Product.query.get(sku):
        return error(f"A product with SKU '{sku}' already exists", 409)

    if supplier_id is not None and not Supplier.query.get(supplier_id):
        return error(f"Supplier {supplier_id} does not exist", 400)

    product = Product(
        sku=sku,
        name=name,
        category=category,
        quantity=quantity,
        price=price,
        reorder_level=reorder_level,
        supplier_id=supplier_id,
    )

    try:
        db.session.add(product)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("Could not save product, please try again", 500)

    return jsonify({"message": "Product added", "product": product.to_dict()}), 201


@api.put("/products/<sku>")
@jwt_required()
def update_product(sku):
    product = Product.query.get(sku)
    if not product:
        return error("Product not found", 404)

    data = request.get_json(silent=True) or {}

    if "name" in data:
        product.name = (data["name"] or "").strip() or product.name
    if "category" in data:
        product.category = (data["category"] or "").strip() or product.category
    if "quantity" in data:
        try:
            product.quantity = int(data["quantity"])
        except (TypeError, ValueError):
            return error("quantity must be an integer", 400)
    if "price" in data:
        try:
            product.price = float(data["price"])
        except (TypeError, ValueError):
            return error("price must be a number", 400)
    if "reorder_level" in data:
        try:
            product.reorder_level = int(data["reorder_level"])
        except (TypeError, ValueError):
            return error("reorder_level must be an integer", 400)
    if "supplier_id" in data:
        supplier_id = data["supplier_id"] or None
        if supplier_id is not None and not Supplier.query.get(supplier_id):
            return error(f"Supplier {supplier_id} does not exist", 400)
        product.supplier_id = supplier_id

    db.session.commit()
    return jsonify(product.to_dict()), 200


@api.delete("/products/<sku>")
@admin_required
def delete_product(sku):
    product = Product.query.get(sku)
    if not product:
        return error("Product not found", 404)

    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted"}), 200


@api.get("/categories")
def get_categories():
    rows = db.session.query(Product.category).distinct().all()
    return jsonify(sorted({r[0] for r in rows if r[0]})), 200


# -------------------------------------------------------------- suppliers --
@api.get("/suppliers")
def get_suppliers():
    suppliers = Supplier.query.order_by(Supplier.name).all()
    return jsonify([s.to_dict() for s in suppliers]), 200


@api.post("/suppliers")
@jwt_required()
def add_supplier():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return error("name is required", 400)

    supplier = Supplier(
        name=name,
        contact=(data.get("contact") or "").strip() or None,
        email=(data.get("email") or "").strip() or None,
    )

    db.session.add(supplier)
    db.session.commit()
    return jsonify({"message": "Supplier added", "supplier": supplier.to_dict()}), 201


@api.put("/suppliers/<int:supplier_id>")
@jwt_required()
def update_supplier(supplier_id):
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        return error("Supplier not found", 404)

    data = request.get_json(silent=True) or {}
    if "name" in data:
        supplier.name = (data["name"] or "").strip() or supplier.name
    if "contact" in data:
        supplier.contact = (data["contact"] or "").strip() or None
    if "email" in data:
        supplier.email = (data["email"] or "").strip() or None

    db.session.commit()
    return jsonify(supplier.to_dict()), 200


@api.delete("/suppliers/<int:supplier_id>")
@admin_required
def delete_supplier(supplier_id):
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        return error("Supplier not found", 404)

    db.session.delete(supplier)
    db.session.commit()
    return jsonify({"message": "Supplier deleted"}), 200


# ------------------------------------------------------- purchase orders --
@api.get("/purchase-orders")
@jwt_required()
def get_purchase_orders():
    orders = PurchaseOrder.query.order_by(PurchaseOrder.order_date.desc()).all()
    return jsonify([o.to_dict() for o in orders]), 200


@api.post("/purchase-orders")
@jwt_required()
def add_purchase_order():
    data = request.get_json(silent=True) or {}
    supplier_id = data.get("supplier_id")
    sku = (data.get("sku") or "").strip()
    quantity = data.get("quantity")
    unit_cost = data.get("unit_cost")

    if not supplier_id or not sku or quantity is None:
        return error("supplier_id, sku and quantity are required", 400)

    if not Supplier.query.get(supplier_id):
        return error(f"Supplier {supplier_id} does not exist", 400)
    if not Product.query.get(sku):
        return error(f"No product with SKU '{sku}'", 400)

    try:
        quantity = int(quantity)
        unit_cost = float(unit_cost) if unit_cost not in (None, "") else None
    except (TypeError, ValueError):
        return error("quantity must be an integer and unit_cost a number", 400)

    order = PurchaseOrder(
        supplier_id=supplier_id, sku=sku, quantity=quantity, unit_cost=unit_cost
    )
    db.session.add(order)
    db.session.commit()
    return jsonify({"message": "Purchase order created", "order": order.to_dict()}), 201


@api.put("/purchase-orders/<int:order_id>")
@jwt_required()
def update_purchase_order(order_id):
    order = PurchaseOrder.query.get(order_id)
    if not order:
        return error("Purchase order not found", 404)

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ("pending", "received", "cancelled"):
        return error("status must be pending, received, or cancelled", 400)

    # Receiving stock tops up the product automatically.
    if status == "received" and order.status != "received":
        product = Product.query.get(order.sku)
        if product:
            product.quantity += order.quantity

    order.status = status
    db.session.commit()
    return jsonify(order.to_dict()), 200


@api.delete("/purchase-orders/<int:order_id>")
@admin_required
def delete_purchase_order(order_id):
    order = PurchaseOrder.query.get(order_id)
    if not order:
        return error("Purchase order not found", 404)
    db.session.delete(order)
    db.session.commit()
    return jsonify({"message": "Purchase order deleted"}), 200


# ------------------------------------------------------------------ sales --
@api.get("/sales")
def get_sales():
    query = Sale.query

    sku = request.args.get("sku")
    region = request.args.get("region")
    salesperson = request.args.get("salesperson")
    start = request.args.get("start")
    end = request.args.get("end")

    if sku:
        query = query.filter(Sale.sku == sku)
    if region:
        query = query.filter(Sale.region == region)
    if salesperson:
        query = query.filter(Sale.salesperson == salesperson)
    if start:
        try:
            query = query.filter(Sale.sale_date >= date.fromisoformat(start))
        except ValueError:
            return error("start must be YYYY-MM-DD", 400)
    if end:
        try:
            query = query.filter(Sale.sale_date <= date.fromisoformat(end))
        except ValueError:
            return error("end must be YYYY-MM-DD", 400)

    sales = query.order_by(Sale.sale_date.desc(), Sale.id.desc()).all()
    return jsonify([s.to_dict() for s in sales]), 200


def _parse_sale_row(sku, quantity_sold, sale_date_str, region, salesperson):
    sku = (sku or "").strip()
    if not sku:
        return None, "missing sku"

    product = Product.query.get(sku)
    if not product:
        return None, f"no product with SKU '{sku}'"

    try:
        quantity_sold = int(quantity_sold)
        if quantity_sold <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return None, "quantity_sold must be a positive integer"

    if sale_date_str:
        try:
            sale_date = date.fromisoformat(str(sale_date_str)[:10])
        except ValueError:
            return None, "sale_date must be YYYY-MM-DD"
    else:
        sale_date = date.today()

    sale = Sale(
        sku=sku,
        quantity_sold=quantity_sold,
        sale_date=sale_date,
        region=(region or "Unspecified").strip() or "Unspecified",
        salesperson=(salesperson or "Unspecified").strip() or "Unspecified",
    )
    product.quantity = max(0, product.quantity - quantity_sold)
    return sale, None


@api.post("/sales")
@jwt_required()
def add_sale():
    data = request.get_json(silent=True) or {}

    sale, err = _parse_sale_row(
        data.get("sku"),
        data.get("quantity_sold"),
        data.get("sale_date"),
        data.get("region"),
        data.get("salesperson"),
    )
    if err:
        return error(err, 400)

    try:
        db.session.add(sale)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("Could not save sale, please try again", 500)

    return jsonify({"message": "Sale recorded", "sale": sale.to_dict()}), 201


@api.post("/sales/upload")
@jwt_required()
def upload_sales_csv():
    """
    Bulk-imports sales from a CSV file.
    Expected columns: sku, quantity_sold, sale_date (YYYY-MM-DD), region, salesperson.
    region and salesperson are optional; missing values default to "Unspecified".
    """
    if "file" not in request.files:
        return error("No file uploaded (expected form field 'file')", 400)

    file = request.files["file"]
    if not file.filename:
        return error("No file selected", 400)

    try:
        df = pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))
    except Exception:
        return error("Could not parse CSV file", 400)

    df.columns = [c.strip().lower() for c in df.columns]
    if "sku" not in df.columns or "quantity_sold" not in df.columns:
        return error("CSV must include at least 'sku' and 'quantity_sold' columns", 400)

    added, failed = [], []
    for i, row in df.iterrows():
        sale, err = _parse_sale_row(
            row.get("sku"),
            row.get("quantity_sold"),
            row.get("sale_date"),
            row.get("region"),
            row.get("salesperson"),
        )
        if err:
            failed.append({"row": int(i) + 2, "error": err})  # +2: header + 0-index
            continue
        db.session.add(sale)
        added.append(sale)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("Could not save the uploaded sales, please try again", 500)

    return jsonify(
        {
            "message": f"Imported {len(added)} sale(s), {len(failed)} row(s) skipped",
            "imported": len(added),
            "skipped": failed,
        }
    ), 201


@api.delete("/sales/<int:sale_id>")
@jwt_required()
def delete_sale(sale_id):
    sale = Sale.query.get(sale_id)
    if not sale:
        return error("Sale not found", 404)

    db.session.delete(sale)
    db.session.commit()
    return jsonify({"message": "Sale deleted"}), 200


@api.get("/sales/analytics")
def sales_analytics():
    """
    Aggregates sales for charting.
    ?group_by=category|region|salesperson|product  (default: category)
    """
    group_by = request.args.get("group_by", "category")
    field_map = {
        "region": Sale.region,
        "salesperson": Sale.salesperson,
        "product": Sale.sku,
    }

    if group_by == "category":
        rows = (
            db.session.query(Product.category, db.func.sum(Sale.quantity_sold))
            .join(Sale, Sale.sku == Product.sku)
            .group_by(Product.category)
            .all()
        )
    else:
        column = field_map.get(group_by)
        if column is None:
            return error("group_by must be category, region, salesperson, or product", 400)
        rows = (
            db.session.query(column, db.func.sum(Sale.quantity_sold))
            .group_by(column)
            .all()
        )

    return jsonify([{"label": label, "total_quantity": int(total)} for label, total in rows]), 200


@api.get("/sales/trend")
def sales_trend():
    """Daily total units sold across all products, for the trend line chart."""
    rows = (
        db.session.query(Sale.sale_date, db.func.sum(Sale.quantity_sold))
        .group_by(Sale.sale_date)
        .order_by(Sale.sale_date)
        .all()
    )
    return jsonify(
        [{"date": d.isoformat(), "total_quantity": int(total)} for d, total in rows]
    ), 200


# ------------------------------------------------------------- forecasting --
@api.get("/forecast/<sku>")
@jwt_required()
def get_forecast(sku):
    if not Product.query.get(sku):
        return error("Product not found", 404)
    days_ahead = request.args.get("days", default=7, type=int)
    return jsonify(forecast_sku(sku, days_ahead=days_ahead)), 200


@api.get("/restock-recommendations")
@jwt_required()
def get_restock_recommendations():
    lead_time = request.args.get("lead_time_days", default=7, type=int)
    return jsonify(restock_recommendations(lead_time_days=lead_time)), 200


# ---------------------------------------------------------------- summary --
@api.get("/summary")
def summary():
    total_products = Product.query.count()
    total_stock = db.session.query(db.func.coalesce(db.func.sum(Product.quantity), 0)).scalar()
    total_sales = Sale.query.count()
    low_stock = Product.query.filter(Product.quantity <= Product.reorder_level).count()

    return jsonify(
        {
            "total_products": total_products,
            "total_stock": int(total_stock),
            "total_sales": total_sales,
            "low_stock_count": low_stock,
        }
    ), 200
