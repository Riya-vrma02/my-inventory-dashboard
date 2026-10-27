"""
Resets the database and loads sample data — enough sales history across
several days, regions and salespeople for the charts and forecast to be
meaningful.

Run with the venv active:  python seed.py
"""
import random
from datetime import date, timedelta

from app import app
from models import db, User, Supplier, Product, Sale, PurchaseOrder

random.seed(42)

REGIONS = ["North", "South", "East", "West"]
SALESPEOPLE = ["Anita", "Rahul", "Priya", "Zoya"]

with app.app_context():
    db.drop_all()
    db.create_all()

    # --- users ---------------------------------------------------------
    admin = User(username="admin", email="admin@example.com", role="admin")
    admin.set_password("admin123")

    staff = User(username="staff", email="staff@example.com", role="staff")
    staff.set_password("staff123")

    db.session.add_all([admin, staff])
    db.session.commit()
    print("Users added (admin@example.com / admin123, staff@example.com / staff123)")

    # --- suppliers -------------------------------------------------------
    supplier1 = Supplier(name="Default Supplier", contact="9876543210", email="supplier@example.com")
    supplier2 = Supplier(name="Mahesh Distributors", contact="9087654321", email="mahesh@example.com")
    db.session.add_all([supplier1, supplier2])
    db.session.commit()
    print("Suppliers added")

    # --- products --------------------------------------------------------
    products = [
        Product(sku="A101", name="Amul Butter", category="Dairy", quantity=100, price=30.0,
                reorder_level=25, supplier_id=supplier1.id),
        Product(sku="A102", name="Maggie Noodles", category="Packaged Food", quantity=150, price=15.0,
                reorder_level=40, supplier_id=supplier1.id),
        Product(sku="A103", name="Milk (1L)", category="Dairy", quantity=75, price=35.0,
                reorder_level=30, supplier_id=supplier1.id),
        Product(sku="A104", name="Detergent", category="Household", quantity=75, price=112.0,
                reorder_level=15, supplier_id=supplier2.id),
        Product(sku="A105", name="Biscuit Pack", category="Packaged Food", quantity=200, price=10.0,
                reorder_level=50, supplier_id=supplier2.id),
        Product(sku="A106", name="Tea Powder", category="Beverages", quantity=40, price=85.0,
                reorder_level=20, supplier_id=supplier2.id),
    ]
    db.session.add_all(products)
    db.session.commit()
    print("Products added")

    # --- sales: 21 days of history across products/regions/salespeople ---
    today = date.today()
    sales = []
    # Rough daily demand per SKU, so the linear-regression forecast has a
    # believable trend rather than pure noise.
    base_demand = {"A101": 6, "A102": 10, "A103": 5, "A104": 3, "A105": 12, "A106": 4}

    for day_offset in range(21, 0, -1):
        day = today - timedelta(days=day_offset)
        for product in products:
            base = base_demand[product.sku]
            # A slight upward trend plus noise, occasionally skip a day.
            trend = (21 - day_offset) * 0.05
            qty = max(0, round(random.gauss(base + trend, base * 0.3)))
            if qty == 0:
                continue
            sales.append(
                Sale(
                    sku=product.sku,
                    quantity_sold=qty,
                    sale_date=day,
                    region=random.choice(REGIONS),
                    salesperson=random.choice(SALESPEOPLE),
                )
            )

    db.session.add_all(sales)
    db.session.commit()
    print(f"{len(sales)} sales added across the last 21 days")

    # Reduce stock roughly in line with what was "sold" so numbers stay sane.
    sold_by_sku = {}
    for s in sales:
        sold_by_sku[s.sku] = sold_by_sku.get(s.sku, 0) + s.quantity_sold
    for product in products:
        product.quantity = max(0, product.quantity - sold_by_sku.get(product.sku, 0))
    db.session.commit()
    print("Stock levels adjusted for seeded sales")

    # --- a couple of sample purchase orders ------------------------------
    orders = [
        PurchaseOrder(supplier_id=supplier1.id, sku="A103", quantity=100, unit_cost=28.0, status="pending"),
        PurchaseOrder(supplier_id=supplier2.id, sku="A104", quantity=50, unit_cost=90.0, status="received"),
    ]
    db.session.add_all(orders)
    db.session.commit()
    print("Sample purchase orders added")

    print("\nSeed complete.")
