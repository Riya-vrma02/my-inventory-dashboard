from app import app, db
from models import Product, Sale, Forecast, User
from datetime import datetime

with app.app_context():
    db.drop_all()
    db.create_all()

    # ✅ Users
    admin2 = User(username="tutun", email="tuntun@dholakpur.com", role="user")
    admin2.set_password("tuntun123")
    staff2 = User(username="oggy", email="oggy@papa.com", role="user")
    staff2.set_password("olie123")
    db.session.add_all([admin2, staff2])
    db.session.commit()
    print("✅ Sample users added.")

    # ✅ Products
    product3 = Product(sku="SKU003", name="Amul butter", quantity=75, price=32.0, date=datetime.utcnow())
    product4 = Product(sku="SKU004", name="Milk", quantity=50, price=35.0, date=datetime.utcnow())
    db.session.add_all([product3, product4])
    db.session.commit()
    print("✅ Products added.")

    # ✅ Sales
    sale3 = Sale(product_id=product3.id, quantity_sold=35, date=datetime.utcnow())
    sale4 = Sale(product_id=product4.id, quantity_sold=38, date=datetime.utcnow())
    db.session.add_all([sale3, sale4])
    db.session.commit()
    print("✅ Sales added.")

    # ✅ Forecasts
    forecast3 = Forecast(product_id=product3.id, predicted_quantity=400, forecast_date=datetime.utcnow().date())
    forecast4 = Forecast(product_id=product4.id, predicted_quantity=180, forecast_date=datetime.utcnow().date())
    db.session.add_all([forecast3, forecast4])
    db.session.commit()
    print("✅ Forecasts added.")
