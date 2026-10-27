# Stockbook — Smart Inventory & Sales Dashboard

A web-based inventory and sales dashboard for FMCG distributors/retailers:
Flask + PostgreSQL backend, React frontend, with sales analytics and
Linear-Regression-based restock forecasting.

```
inventory-dashboard/
  backend/     Flask API — products, suppliers, sales, purchase orders,
               auth (JWT + roles), analytics, forecasting
  frontend/    React app (Create React App) — dashboard, charts (Recharts),
               CSV bulk import, role-based UI
```

## Features

- **Products** — SKU, category, price, quantity, reorder level, supplier link
- **Suppliers** — contact info, linked purchase orders
- **Purchase orders** — place/track restock orders, mark received (auto-adds
  stock back), admin can cancel/delete
- **Sales** — log sales one at a time or bulk-import via CSV
  (`sku, quantity_sold, sale_date, region, salesperson`); stock is deducted
  automatically
- **Analytics** — units sold by category / region / salesperson / product
  (bar chart), daily sales trend (line chart)
- **Forecasting** — per-SKU demand forecast (`GET /api/forecast/<sku>`) and a
  restock-recommendation list (`GET /api/restock-recommendations`), using
  linear regression on daily sales history (falls back to a plain average
  when there isn't enough history to fit a trend)
- **Roles** — `admin` can delete products/suppliers/purchase orders; `staff`
  can view everything and record sales/purchase orders but not delete
  catalog data

## 1. Prerequisites

- **Python 3.11 or 3.12.** This project uses numpy/pandas/scikit-learn for
  forecasting and CSV import — avoid Python 3.13+/3.14 for now, since many
  packages don't ship pre-built Windows wheels for the newest Python yet,
  which forces pip to compile from source and fails without Visual Studio
  Build Tools.
- **Node.js 18+** and npm
- **PostgreSQL** running locally, with `psql` on your PATH

## 2. Backend setup

```powershell
cd backend
py -3.11 -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Create the database:

```powershell
psql -U postgres -c "CREATE DATABASE inventory_dashboard;"
```

Configure environment variables:

```powershell
copy .env.example .env
notepad .env
```

Fill in `DATABASE_URL` with your real Postgres password. **If your password
contains `@`, `:`, `/`, `#`, or `%`, URL-encode it** — e.g. a password of
`Login@001` must be written as `Login%40001` in the connection string.
Getting this wrong produces a confusing `could not translate host name`
error rather than an obvious "wrong password" error.

Seed the database with 21 days of realistic sample data (enough history
for the charts and forecast to be meaningful):

```powershell
python seed.py
```

This creates two logins:
- `admin@example.com` / `admin123` (full access)
- `staff@example.com` / `staff123` (can't delete catalog data)

Start the API:

```powershell
python app.py
```

You should see `Database tables ensured.` and `Running on http://127.0.0.1:5001`.
**Leave this terminal open** — closing it stops the backend.

## 3. Frontend setup

Open a **second** terminal:

```powershell
cd frontend
npm install
npm start
```

This opens `http://localhost:3000` (or the next free port, e.g. 3001, if
3000 is taken — the backend already allows both). Log in with
`admin@example.com` / `admin123`.

## 4. Common gotchas this project avoids

- **Every wheel-dependent package in `requirements.txt` is pinned to a
  version confirmed to have a prebuilt Windows wheel for Python 3.11/3.12** —
  no matplotlib/contourpy-style source-compile failures.
- **CORS allows multiple localhost ports** (3000, 3001, 3002) since Create
  React App silently picks a different port whenever the default is busy.
- **Every model field the frontend sends matches an actual database
  column.** No stray fields, no renamed columns between the seed script and
  the models.
- **Supplier phone numbers are stored as text**, not integers — so long
  numbers can't overflow a database column type.
- **Every error response is JSON with a real `error` message** describing
  what went wrong, not a bare 500 with no explanation.
- **App startup fails loudly** with a clear message if `.env` is missing
  `DATABASE_URL` or `JWT_SECRET_KEY`, instead of silently using an insecure
  default that causes confusing auth errors later.

## 5. Bonus features not included yet

Barcode scanning and PDF/Excel report export weren't built — say the word
and I'll add either one. Everything else in the original spec (stock
tracking, sales analytics by product/region/salesperson, low-stock alerts,
ML-based restock forecasting, charts, role-based auth) is implemented.

## 6. Next steps

- Deploy the backend to Render or Railway (Postgres add-on included on both).
- Deploy the frontend to Vercel or Netlify, pointing it at your deployed
  backend URL.
- Ask me when you're ready — I can walk through either step by step.
