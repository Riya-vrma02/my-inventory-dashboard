
import os
import tempfile

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from ml_model import evaluate_demand_model

ml_evaluation_bp = Blueprint(
    "ml_evaluation",
    __name__,
    url_prefix="/api/ml"
)


@ml_evaluation_bp.route("/evaluate", methods=["POST"])
@jwt_required()
def evaluate_model():
    uploaded_file = request.files.get("file")

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({"error": "Please upload a CSV file."}), 400

    if not uploaded_file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Please upload a CSV file."}), 400

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=".csv",
            delete=False
        ) as temp_file:
            uploaded_file.save(temp_file)
            temp_path = temp_file.name

        results = evaluate_demand_model(temp_path)
        return jsonify(results), 200

    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    except Exception:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": "Model evaluation failed. Check the backend terminal."
        }), 500

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
