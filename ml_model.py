import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np
from datetime import datetime
from models import Sale, db

DAYS_FORECAST = 30

# FORECAST
def train_per_sku():
    cutoff = datetime.utcnow().date() - timedelta(days=DAYS_FORECAST)
    sales = Sale.query.filter(Sale.date >= cutoff).all()
    if not sales:
        return {}
    df = pd.DataFrame([
        {"product_id": s.product_id,
         "date": s.date,
         "qty": s.quantity_sold}
        for s in sales
    ])

    forecasts = {}
    for pid, group in df.groupby("product_id"):
        group = group.sort_values("date")
        group["ordinal"] = group["date"].map(lambda d: d.toordinal())

        if len(group) < 2: 
            forecasts[pid] = 0
            continue

        X = group[["ordinal"]]
        y = group["qty"]
        model = LinearRegression().fit(X, y)

        today_ord = datetime.utcnow().date().toordinal()
        future_ords = [today_ord + i + 1 for i in range(DAYS_FORECAST)]
        preds = model.predict(pd.DataFrame({"ordinal": future_ords}))
        forecasts[pid] = max(0, int(preds.sum()))

    return forecasts

# 2. RESTOCK ADVICE
def restock_advice():
    forecast = train_forecast_per_30d()      # {product_id: demand}
    products = {p.id: p for p in products.query.all()}
    advice = []
    for pid, demand in forecast.items():
        prod = products.get(pid)
        if not prod:
            continue
        current = prod.quantity
        needed = max(0, demand - current)
        if needed:
            advice.append({
                "product_id": pid,
                "sku": prod.sku,
                "name": prod.name,
                "current": current,
                "demand_30d": demand,
                "needed": needed
            })
    return advice

# CLI quick test
if __name__ == "__main__":
    from app import app   # adjust to your Flask app factory
    with app.app_context():
        print("30-day forecast:", train_forecast_per_30d())
        print("Restock advice:", restock_advice())