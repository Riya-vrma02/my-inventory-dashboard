"""
Lightweight forecasting utilities.

Uses a simple linear regression (scikit-learn) on daily aggregated sales
per SKU to project near-term demand, then turns that into a restock
recommendation. Falls back to a plain average when there isn't enough
history for a regression to be meaningful — this never raises for
sparse data, it just returns a lower-confidence estimate.
"""
from collections import defaultdict
from datetime import timedelta

import numpy as np
from sklearn.linear_model import LinearRegression

from models import Sale, Product

MIN_POINTS_FOR_REGRESSION = 3
DEFAULT_LEAD_TIME_DAYS = 7


def _daily_sales_for_sku(sku):
    """Returns a sorted list of (date, total_quantity_sold) for one SKU."""
    rows = Sale.query.filter_by(sku=sku).all()
    by_day = defaultdict(int)
    for row in rows:
        by_day[row.sale_date] += row.quantity_sold
    return sorted(by_day.items())


def forecast_sku(sku, days_ahead=7):
    """
    Returns a dict describing the sales history and a forecast for one SKU:
      {
        sku, history: [{date, quantity}], forecast: [{date, predicted_quantity}],
        method: "linear_regression" | "average" | "insufficient_data",
        avg_daily_sales
      }
    """
    daily = _daily_sales_for_sku(sku)

    if not daily:
        return {
            "sku": sku,
            "history": [],
            "forecast": [],
            "method": "insufficient_data",
            "avg_daily_sales": 0.0,
        }

    history = [{"date": d.isoformat(), "quantity": q} for d, q in daily]
    quantities = [q for _, q in daily]
    avg_daily_sales = sum(quantities) / len(quantities)

    last_date = daily[-1][0]

    if len(daily) < MIN_POINTS_FOR_REGRESSION:
        # Not enough distinct days to fit a trend line meaningfully —
        # project the flat average instead of pretending we know a trend.
        forecast = [
            {
                "date": (last_date + timedelta(days=i)).isoformat(),
                "predicted_quantity": round(avg_daily_sales, 1),
            }
            for i in range(1, days_ahead + 1)
        ]
        return {
            "sku": sku,
            "history": history,
            "forecast": forecast,
            "method": "average",
            "avg_daily_sales": round(avg_daily_sales, 2),
        }

    # X = day offset from the first recorded sale, y = quantity sold that day
    x = np.array([(d - daily[0][0]).days for d, _ in daily]).reshape(-1, 1)
    y = np.array(quantities)

    model = LinearRegression()
    model.fit(x, y)

    last_offset = (last_date - daily[0][0]).days
    future_offsets = np.array(
        [last_offset + i for i in range(1, days_ahead + 1)]
    ).reshape(-1, 1)
    predictions = model.predict(future_offsets)
    # Sales can't be negative — clip the regression line at zero.
    predictions = np.clip(predictions, 0, None)

    forecast = [
        {
            "date": (last_date + timedelta(days=i)).isoformat(),
            "predicted_quantity": round(float(predictions[i - 1]), 1),
        }
        for i in range(1, days_ahead + 1)
    ]

    return {
        "sku": sku,
        "history": history,
        "forecast": forecast,
        "method": "linear_regression",
        "avg_daily_sales": round(avg_daily_sales, 2),
    }


def restock_recommendations(lead_time_days=DEFAULT_LEAD_TIME_DAYS):
    """
    For every product, estimates demand over the supplier lead time and
    recommends how much to reorder so stock doesn't run out before the
    next delivery arrives.
    """
    products = Product.query.all()
    recommendations = []

    for product in products:
        daily = _daily_sales_for_sku(product.sku)
        if daily:
            avg_daily_sales = sum(q for _, q in daily) / len(daily)
        else:
            avg_daily_sales = 0.0

        expected_demand = avg_daily_sales * lead_time_days
        shortfall = expected_demand - product.quantity
        recommended_qty = max(0, round(shortfall + product.reorder_level))

        recommendations.append(
            {
                "sku": product.sku,
                "name": product.name,
                "category": product.category,
                "current_stock": product.quantity,
                "reorder_level": product.reorder_level,
                "avg_daily_sales": round(avg_daily_sales, 2),
                "expected_demand_next_period": round(expected_demand, 1),
                "recommended_reorder_qty": int(recommended_qty),
                "needs_restock": product.quantity <= product.reorder_level,
            }
        )

    # Most urgent first.
    recommendations.sort(key=lambda r: r["current_stock"] - r["reorder_level"])
    return recommendations
