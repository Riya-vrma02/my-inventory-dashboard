# routes/api.py
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, create_access_token
from datetime import datetime, date
from models import db, Product, Defective_Product, Sale, User, RestockOrder, Forecast, Supplier
from ml_model import train_per_sku
api = Blueprint('api', __name__, url_prefix='/api')

# --------------------  AUTH  --------------------
@api.post('/signup')
@cross_origin()
def signup():
    data = request.get_json()
    if not data.get('email') or not data.get('password'):
        return jsonify({'msg': 'Email and password required'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'msg': 'User already exists'}), 400

    user = User(username=data.get('username'), email=data['email'], role=data.get('role', 'user'))
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'msg': 'User created'}), 201

@api.post('/login')
@cross_origin()
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    if not user or not user.check_password(data.get('password')):
        return jsonify({'msg': 'Invalid credentials'}), 401
    token = create_access_token(identity={'email': user.email, 'role': user.role})
    return jsonify({'access_token': token}), 200

# --------------------  PRODUCTS  --------------------
@api.get('/products')
@cross_origin()
def get_products():
    return jsonify([p.to_dict() for p in Product.query.all()]), 200


@api.route('/products', methods=['POST'])
def add_product():
    data = request.get_json()
    sku = data.get('sku')
    name = data.get('name')
    quantity = data.get('quantity')
    price = data.get('price')
    supplier_id = data.get('supplier_id')  # or default supplier
    
    if not sku or not name or quantity is None or price is None:
        return jsonify({'msg': 'Missing required fields'}), 400

    # Check for existing SKU to avoid duplicates
    if Product.query.filter_by(sku=sku).first():
        return jsonify({'msg': 'Product with this SKU already exists'}), 409

    new_product = Product(
        sku=sku,
        name=name,
        quantity=quantity,
        price=price,
        supplier_id=supplier_id
    )
    try:
        db.session.add(new_product)
        db.session.commit()
        return jsonify({'msg': 'Product added successfully', 'product': new_product.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Failed to add product', 'error': str(e)}), 500

@api.put('/products/<sku>')
@jwt_required()
@cross_origin()
def update_product(sku):
    product = Product.query.get_or_404(sku)
    data = request.get_json()

    if 'name' in data:
        product.name = data['name']
    if 'quantity' in data:
        try:
            product.quantity = int(data['quantity'])
        except ValueError:
            return jsonify({'error': 'Invalid quantity'}), 400
    if 'price' in data:
        try:
            product.price = float(data['price'])
        except ValueError:
            return jsonify({'error': 'Invalid price'}), 400

    db.session.commit()
    return jsonify(product.to_dict()), 200

@api.delete('/products/<sku>')
@jwt_required()
@cross_origin()
def delete_product(sku):
    Product.query.filter_by(sku=sku).delete()
    db.session.commit()
    return jsonify({'msg': 'Product deleted'}), 200

# --------------------  SALES  --------------------
from flask import request, jsonify

@api.route('/sales', methods=['GET', 'POST'])
@jwt_required()
def sales():
    if request.method == 'GET':
        subject = request.args.get('subject')
        if not subject or not isinstance(subject, str):
            return jsonify({'msg': 'Subject must be a string'}), 422

        sales_query = Sale.query.all()
        sales_data = []
        for sale in sales_query:
            product = Product.query.filter_by(sku=sale.sku).first()
            sales_data.append({
                'id': sale.id,
                'sku': sale.sku,
                'product_name': product.name if product else 'Unknown',
                'quantity_sold': sale.quantity_sold,
                'date': sale.date.isoformat() if sale.date else None
            })
        return jsonify(sales_data), 200

    elif request.method == 'POST':
        data = request.get_json()
        subject = data.get('subject')
        if not subject or not isinstance(subject, str):
            return jsonify({'msg': 'Subject must be a string'}), 422

        sku = data.get('sku')
        quantity_sold = data.get('quantity_sold')
        date_str = data.get('date')

        if not sku or not quantity_sold or not date_str:
            return jsonify({'msg': 'Missing required fields'}), 400

        product = Product.query.filter_by(sku=sku).first()
        if not product:
            return jsonify({'msg': 'Invalid product SKU'}), 400

        try:
            date = datetime.fromisoformat(date_str)
        except ValueError:
            return jsonify({'msg': 'Invalid date format; expected ISO8601 string'}), 400

        sale = Sale(sku=sku, quantity_sold=quantity_sold, date=date)
        db.session.add(sale)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({'msg': 'Database error', 'error': str(e)}), 500

        return jsonify({
            'msg': 'Sale added successfully',
            'sale': {
                'id': sale.id,
                'sku': sale.sku,
                'quantity_sold': sale.quantity_sold,
                'date': sale.date.isoformat() if sale.date else None
            }
        }), 201

@api.route('/sales/<int:sale_id>', methods=['DELETE'])
@jwt_required()
def delete_sale(sale_id):
    sale = Sale.query.get(sale_id)
    if not sale:
        return jsonify({'msg': 'Sale not found'}), 404

    db.session.delete(sale)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Database error', 'error': str(e)}), 500

    return jsonify({'msg': 'Sale deleted successfully'}), 200

# --------------------  DEFECTIVE PRODUCTS  --------------------
@api.get('/defects')
@cross_origin()
def get_defective_products():
    return jsonify([d.to_dict() for d in Defective_Product.query.all()]), 200

@api.post('/defects')
@jwt_required()
def report_defective():
    data = request.get_json()
    print("Incoming defect report data:", data)  # Debug print
    required_fields = ['sku', 'name', 'quantity', 'date_reported', 'reason']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'All fields are required'}), 400

    try:
        defect = Defective_Product(
            sku=data['sku'],
            name=data['name'],
            quantity=int(data['quantity']),
            date_reported=date.fromisoformat(data['date_reported']),
            reason=data['reason']
        )
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid input format'}), 400

    db.session.add(defect)
    db.session.commit()
    return jsonify({'message': 'Defective product reported'}), 201


# --------------------  FORECASTS  --------------------
@api.get('/forecasts')            # <-- inside the blueprint
@jwt_required()
@cross_origin()
def get_forecasts():
    from ml_model import train_per_sku
    forecasts = train_per_sku()
    return jsonify([
        {"product_id": int(k), "predicted_quantity": v}
        for k, v in forecasts.items()
    ]), 200
@api.post('/forecasts')
@jwt_required()
@cross_origin()
def add_forecast():
    data = request.get_json()
    required_fields = ['sku', 'predicted_quantity', 'forecast_date']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        forecast = Forecast(
            sku=data['sku'],
            predicted_quantity=int(data['predicted_quantity']),
            forecast_date=date.fromisoformat(data['forecast_date'])
        )
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid data types'}), 400

    db.session.add(forecast)
    db.session.commit()
    return jsonify(forecast.to_dict()), 201

# --------------------  RESTOCK ORDERS  --------------------
@api.post('/restock-orders')
@jwt_required()
@cross_origin()
def create_restock_order():
    data = request.get_json()
    if not data.get('product_id') or not data.get('quantity'):
        return jsonify({'error': 'Missing product_id or quantity'}), 400

    try:
        product_id = int(data['product_id'])
        quantity = int(data['quantity'])
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid data types'}), 400

    product = Product.query.get_or_404(product_id)
    order = RestockOrder(product_id=product.id, quantity=quantity)
    db.session.add(order)
    db.session.commit()
    return jsonify({'msg': 'Restock order created'}), 201

# --------------------  SUPPLIERS  --------------------
@api.get('/suppliers')
@cross_origin()
def get_suppliers():
    return jsonify([s.to_dict() for s in Supplier.query.all()]), 200

@api.post('/suppliers')
@jwt_required()
@cross_origin()
def create_supplier():
    data = request.get_json()
    print("Received supplier data:", data)
    subject = data.get('subject')
    print("Subject:", subject, type(subject))
    if not subject or not isinstance(subject, str):
        return jsonify({'msg': 'Subject must be a string'}), 422

    try:
        supplier = Supplier(
            name=data['name'],
            contact=int(data['contact']) if data.get('contact') else None,
            email=data.get('email')
        )
    except ValueError:
        return jsonify({'error': 'Invalid contact number'}), 400

    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier.to_dict()), 201

@api.put('/suppliers/<int:sid>')
@jwt_required()
@cross_origin()
def update_supplier(sid):
    data = request.get_json()
    supplier = Supplier.query.get_or_404(sid)

    if 'name' in data:
        supplier.name = data['name']
    if 'contact' in data:
        try:
            supplier.contact = int(data['contact'])
        except ValueError:
            return jsonify({'error': 'Invalid contact number'}), 400
    if 'email' in data:
        supplier.email = data['email']

    db.session.commit()
    return jsonify(supplier.to_dict()), 200

@api.delete('/suppliers/<int:sid>')
@jwt_required()
@cross_origin()
def delete_supplier(sid):
    Supplier.query.filter_by(id=sid).delete()
    db.session.commit()
    return jsonify({'msg': 'Supplier deleted'}), 200
