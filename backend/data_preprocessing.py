
import pandas as pd


FORECAST_COLUMNS = {
    "date",
    "product_category",
    "sales_volume",
    "price",
    "promotion",
    "store_location",
    "weekday",
    "supplier_cost",
    "replenishment_lead_time",
    "stock_level",
}

SALES_ALIASES = {
    "sku": ["sku", "product_sku", "product_id", "item_id"],
    "quantity_sold": [
        "quantity_sold",
        "sales_quantity",
        "units_sold",
        "quantity",
    ],
    "date": ["date", "sale_date", "sales_date", "transaction_date"],
}

FORECAST_ALIASES = {
    "date": ["date", "sales_date", "transaction_date"],
    "product_category": ["product_category", "category"],
    "sales_volume": ["sales_volume", "units_sold", "quantity_sold"],
    "price": ["price", "selling_price"],
    "promotion": ["promotion", "promotional_flag"],
    "store_location": ["store_location", "location"],
    "weekday": ["weekday", "day_of_week"],
    "supplier_cost": ["supplier_cost", "cost"],
    "replenishment_lead_time": [
        "replenishment_lead_time",
        "lead_time",
    ],
    "stock_level": ["stock_level", "inventory_level"],
}

FORECAST_NUMERIC_COLUMNS = [
    "sales_volume",
    "price",
    "promotion",
    "weekday",
    "supplier_cost",
    "replenishment_lead_time",
    "stock_level",
]


def normalize_column_name(name):
    """Convert column names to lowercase snake_case."""
    return (
        str(name)
        .strip()
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
    )


def preprocess_sales_csv(file):
    """
    Preprocess either:
    1. Standard sales CSV: sku, quantity_sold, date
    2. FMCG forecasting CSV: Date, Product_Category, Sales_Volume, etc.

    Returns:
        cleaned_df, report
    """
    try:
        df = pd.read_csv(file)
    except pd.errors.EmptyDataError as exc:
        raise ValueError("The uploaded CSV is empty.") from exc

    if df.empty:
        raise ValueError("The uploaded CSV has no data rows.")

    if len(df.columns) == 0:
        raise ValueError("The uploaded CSV has no columns.")

    # Normalize column names.
    df.columns = [normalize_column_name(c) for c in df.columns]

    if len(set(df.columns)) != len(df.columns):
        raise ValueError(
            "Multiple columns have the same name after normalization."
        )

    # Identify the dataset type from its column names.
    forecast_present = (
        "product_category" in df.columns
        and "sales_volume" in df.columns
    )

    if forecast_present:
        aliases = FORECAST_ALIASES
        dataset_type = "forecasting"
    else:
        aliases = SALES_ALIASES
        dataset_type = "sales"

    # Apply supported aliases without overwriting existing columns.
    rename_map = {}

    for canonical, alternatives in aliases.items():
        if canonical in df.columns:
            continue

        for alternative in alternatives:
            if alternative in df.columns:
                rename_map[alternative] = canonical
                break

    df = df.rename(columns=rename_map)

    if dataset_type == "forecasting":
        required = ["date", "product_category", "sales_volume"]
    else:
        required = ["sku", "quantity_sold", "date"]

    missing = [col for col in required if col not in df.columns]

    if missing:
        raise ValueError(
            "Could not identify dataset format. Missing required columns: "
            + ", ".join(missing)
        )

    input_rows = len(df)
    original_columns = list(df.columns)
    rejection_details = []
    rejected_indices = set()

    # Store original CSV row numbers: header is row 1.
    original_row_numbers = {
        idx: position + 2
        for position, idx in enumerate(df.index)
    }

    # Normalize common text fields.
    for col in ["sku", "product_category", "store_location"]:
        if col in df.columns:
            df[col] = df[col].astype("string").str.strip()

    # Normalize the date column.
    parsed_dates = pd.to_datetime(
        df["date"],
        errors="coerce",
        utc=True,
    )

    df["date"] = parsed_dates.dt.strftime("%Y-%m-%d")

    for idx in df.index:
        reasons = []

        if pd.isna(parsed_dates.loc[idx]):
            reasons.append("Missing or invalid date")

        if dataset_type == "sales":
            sku = df.at[idx, "sku"]
            quantity = pd.to_numeric(
                pd.Series([df.at[idx, "quantity_sold"]]),
                errors="coerce",
            ).iloc[0]

            if pd.isna(sku) or not str(sku).strip():
                reasons.append("Missing SKU")

            if pd.isna(quantity):
                reasons.append("Quantity is missing or non-numeric")
            elif quantity <= 0:
                reasons.append("Quantity must be greater than zero")
            elif quantity % 1 != 0:
                reasons.append("Quantity must be a whole number")

        else:
            category = df.at[idx, "product_category"]
            volume = pd.to_numeric(
                pd.Series([df.at[idx, "sales_volume"]]),
                errors="coerce",
            ).iloc[0]

            if pd.isna(category) or not str(category).strip():
                reasons.append("Missing product category")

            if pd.isna(volume):
                reasons.append("Sales volume is missing or non-numeric")
            elif volume < 0:
                reasons.append("Sales volume cannot be negative")
            elif volume % 1 != 0:
                reasons.append("Sales volume must be a whole number")

            # Validate the other numeric forecasting fields when present.
            for col in FORECAST_NUMERIC_COLUMNS:
                if col not in df.columns or col == "sales_volume":
                    continue

                value = pd.to_numeric(
                    pd.Series([df.at[idx, col]]),
                    errors="coerce",
                ).iloc[0]

                if pd.isna(value):
                    reasons.append(f"{col} is missing or non-numeric")
                    continue

                if col in [
                    "price",
                    "supplier_cost",
                    "replenishment_lead_time",
                    "stock_level",
                ] and value < 0:
                    reasons.append(f"{col} cannot be negative")

                if col in [
                    "promotion",
                    "weekday",
                    "replenishment_lead_time",
                    "stock_level",
                ] and value % 1 != 0:
                    reasons.append(f"{col} must be a whole number")

                if col == "promotion" and value not in [0, 1]:
                    reasons.append("promotion must be 0 or 1")

                if col == "weekday" and value not in range(7):
                    reasons.append("weekday must be between 0 and 6")

        if reasons:
            rejected_indices.add(idx)
            rejection_details.append({
                "row": original_row_numbers[idx],
                "sku": (
                    str(df.at[idx, "sku"])
                    if "sku" in df.columns
                    and pd.notna(df.at[idx, "sku"])
                    else (
                        str(df.at[idx, "product_category"])
                        if "product_category" in df.columns
                        and pd.notna(df.at[idx, "product_category"])
                        else None
                    )
                ),
                "reason": "; ".join(reasons),
            })

    # Remove invalid rows first.
    cleaned_df = df.drop(index=list(rejected_indices)).copy()

    # Convert numeric columns to numeric types.
    if dataset_type == "sales":
        cleaned_df["quantity_sold"] = pd.to_numeric(
            cleaned_df["quantity_sold"]
        ).astype("int64")
    else:
        for col in FORECAST_NUMERIC_COLUMNS:
            if col in cleaned_df.columns:
                cleaned_df[col] = pd.to_numeric(cleaned_df[col])

        cleaned_df["sales_volume"] = cleaned_df["sales_volume"].astype(
            "int64"
        )

    # Remove duplicates.
    before_deduplication = len(cleaned_df)

    if dataset_type == "sales":
        duplicate_columns = ["sku", "quantity_sold", "date"]
        cleaned_df = cleaned_df.drop_duplicates(
            subset=duplicate_columns,
            keep="first",
        )
    else:
        # A forecasting record is a full observation across its fields.
        cleaned_df = cleaned_df.drop_duplicates(keep="first")

    duplicates_removed = before_deduplication - len(cleaned_df)

    report = {
        "dataset_type": dataset_type,
        "input_rows": input_rows,
        "valid_rows": len(cleaned_df),
        "rejected_rows": len(rejected_indices),
        "duplicates_removed": duplicates_removed,
        "rejection_details": rejection_details,
    }

    return cleaned_df.reset_index(drop=True), report
