
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.dummy import DummyRegressor


def evaluate_demand_model(file_path):
    # 1. Load and normalize the dataset
    df = pd.read_csv(file_path)

    df.columns = (
        df.columns.str.strip()
        .str.lower()
        .str.replace("/", "_", regex=False)
        .str.replace(" ", "_", regex=False)
    )

    df = df.rename(columns={
        "unitssold": "units_sold"
    })

    required = [
        "date", "store_id", "product_id",
        "category", "region", "units_sold"
    ]

    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing required columns: {missing}. "
            f"Found columns: {list(df.columns)}"
        )

    # 2. Clean data
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    numeric_columns = [
        "units_sold", "inventory_level", "price",
        "discount", "competitor_pricing"
    ]

    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["date", "units_sold"])
    df = df[df["units_sold"] >= 0]

    # Aggregate duplicate records for each store-product-day.
    # Keep the first value of descriptive features for each group.
    group_keys = ["date", "store_id", "product_id"]
    aggregation = {"units_sold": "sum"}

    for col in [
        "category", "region", "inventory_level", "price",
        "discount", "competitor_pricing", "weather_condition",
        "seasonality", "holiday_promotion"
    ]:
        if col in df.columns:
            aggregation[col] = "first"

    df = (
        df.groupby(group_keys, as_index=False)
        .agg(aggregation)
        .sort_values(["store_id", "product_id", "date"])
        .reset_index(drop=True)
    )

    # 3. Calendar features
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_year"] = df["date"].dt.dayofyear

    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    df["weekday_sin"] = np.sin(
        2 * np.pi * df["day_of_week"] / 7
    )
    df["weekday_cos"] = np.cos(
        2 * np.pi * df["day_of_week"] / 7
    )

    # 4. Historical sales features.
    # Shift by one row so today's target never enters its own features.
    groups = df.groupby(["store_id", "product_id"])["units_sold"]

    df["sales_lag_1"] = groups.shift(1)
    df["sales_lag_7"] = groups.shift(7)

    df["sales_mean_7"] = groups.transform(
        lambda s: s.shift(1).rolling(7, min_periods=3).mean()
    )

    df["sales_mean_14"] = groups.transform(
        lambda s: s.shift(1).rolling(14, min_periods=5).mean()
    )

    # 5. Choose features
    numeric_features = [
        "year", "month", "day_of_week", "day_of_year",
        "month_sin", "month_cos", "weekday_sin", "weekday_cos",
        "sales_lag_1", "sales_lag_7",
        "sales_mean_7", "sales_mean_14"
    ]

    categorical_features = [
        "store_id", "product_id", "category", "region"
    ]

    for col in [
        "inventory_level", "price", "discount",
        "competitor_pricing"
    ]:
        if col in df.columns:
            numeric_features.append(col)

    for col in [
        "weather_condition", "seasonality", "holiday_promotion"
    ]:
        if col in df.columns:
            categorical_features.append(col)

    # Do not use Units Ordered or Demand Forecast as predictors.
    # They may contain information unavailable at prediction time.

    df = df.dropna(
        subset=["sales_lag_1", "sales_lag_7", "sales_mean_7"]
    ).copy()

    if len(df) < 100:
        raise ValueError(
            "Not enough rows remain after creating historical "
            "features. Check whether each store-product has "
            "enough historical observations."
        )

    # 6. Chronological train/validation/test split
    dates = np.sort(df["date"].unique())

    if len(dates) < 3:
        raise ValueError("At least 3 distinct dates are required.")

    train_cut = max(1, int(len(dates) * 0.70))
    val_cut = max(train_cut + 1, int(len(dates) * 0.85))
    val_cut = min(val_cut, len(dates) - 1)

    train_dates = dates[:train_cut]
    val_dates = dates[train_cut:val_cut]
    test_dates = dates[val_cut:]

    if len(test_dates) == 0 or len(val_dates) == 0:
        raise ValueError(
            "Not enough distinct dates for chronological splitting."
        )

    train = df[df["date"].isin(train_dates)]
    val = df[df["date"].isin(val_dates)]
    test = df[df["date"].isin(test_dates)]

    feature_columns = numeric_features + categorical_features

    X_train = train[feature_columns]
    y_train = train["units_sold"]

    X_val = val[feature_columns]
    y_val = val["units_sold"]

    X_test = test[feature_columns]
    y_test = test["units_sold"]

    # 7. Preprocessing
    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median"))
    ])

    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(
            handle_unknown="ignore",
            sparse_output=True
        ))
    ])

    preprocess = ColumnTransformer([
        ("num", numeric_pipeline, numeric_features),
        ("cat", categorical_pipeline, categorical_features)
    ])

    # 8. Compare two tree-based models using validation MAE
    candidates = {
        "Extra Trees": ExtraTreesRegressor(
            n_estimators=150,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1
        ),
        "Random Forest": RandomForestRegressor(
            n_estimators=120,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1
        )
    }

    best_name = None
    best_pipeline = None
    best_val_mae = float("inf")

    for name, model in candidates.items():
        pipeline = Pipeline([
            ("preprocess", preprocess),
            ("model", model)
        ])

        pipeline.fit(X_train, y_train)
        val_predictions = np.maximum(pipeline.predict(X_val), 0)

        score = mean_absolute_error(y_val, val_predictions)

        if score < best_val_mae:
            best_val_mae = score
            best_name = name
            best_pipeline = pipeline

    # Refit the selected model on train + validation data.
    # The test period remains unseen until final evaluation.
    train_val = pd.concat([train, val], ignore_index=True)

    best_pipeline.fit(
        train_val[feature_columns],
        train_val["units_sold"]
    )

    predictions = np.maximum(
        best_pipeline.predict(X_test), 0
    )

    # 9. Baseline: predict the previous observed sales value
    baseline_predictions = test["sales_lag_1"].to_numpy()

    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)

    baseline_mae = mean_absolute_error(
        y_test, baseline_predictions
    )

    # MAPE calculated only for actual values safely away from zero.
    nonzero = y_test.to_numpy() > 1

    if nonzero.any():
        mape = np.mean(
            np.abs(
                (y_test.to_numpy()[nonzero] -
                 predictions[nonzero]) /
                y_test.to_numpy()[nonzero]
            )
        ) * 100
    else:
        mape = None

    # 10. Return metrics and sample predictions
    result_rows = pd.DataFrame({
        "date": test["date"].dt.strftime("%Y-%m-%d"),
        "category": test["category"].astype(str),
        "actual": y_test.to_numpy(),
        "predicted": predictions
    })

    return {
        "total_rows": int(len(df)),
        "training_rows": int(len(train)),
        "testing_rows": int(len(test)),
        "mae": round(float(mae), 3),
        "rmse": round(float(rmse), 3),
        "r2": round(float(r2), 4),
        "mape": round(float(mape), 2) if mape is not None else None,
        "baseline_mae": round(float(baseline_mae), 3),
        "best_model": best_name,
        "validation_mae": round(float(best_val_mae), 3),
        "predictions": result_rows.to_dict(orient="records")
    }
