import io

import pandas as pd
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from data_preprocessing import preprocess_sales_csv

preprocessing = Blueprint(
    "preprocessing",
    __name__,
    url_prefix="/api/preprocessing"
)


@preprocessing.post("/preview")
@jwt_required()
def preview_sales():
    if "file" not in request.files:
        return jsonify({"error": "Please upload a CSV file."}), 400

    file = request.files["file"]

    if not file.filename or not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported."}), 400

    try:
        cleaned_df, report = preprocess_sales_csv(file)

        # Return a small preview rather than the entire dataset.
        report["preview"] = cleaned_df.head(100).astype(
            object
        ).where(pd.notna(cleaned_df.head(100)), None).to_dict(
            orient="records"
        )

        return jsonify(report), 200

    except (ValueError, pd.errors.ParserError) as exc:
        return jsonify({"error": str(exc)}), 400


@preprocessing.post("/download-cleaned")
@jwt_required()
def download_cleaned_sales():
    if "file" not in request.files:
        return jsonify({"error": "Please upload a CSV file."}), 400

    file = request.files["file"]

    if not file.filename or not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported."}), 400

    try:
        cleaned_df, _ = preprocess_sales_csv(file)

        output = io.BytesIO()
        output.write(cleaned_df.to_csv(index=False).encode("utf-8"))
        output.seek(0)

        return send_file(
            output,
            mimetype="text/csv",
            as_attachment=True,
            download_name="cleaned_sales.csv"
        )

    except (ValueError, pd.errors.ParserError) as exc:
        return jsonify({"error": str(exc)}), 400
