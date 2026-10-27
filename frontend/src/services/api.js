import axios from "axios";

// CRA's "proxy" field in package.json forwards relative /api requests to
// the Flask backend during `npm start`, so we don't hardcode a port here.
// That means this frontend works no matter which port CRA itself lands on.
const client = axios.create({
  baseURL: "/api",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalizes every failure into a plain Error with a readable message,
// so components never have to reach into err.response.data themselves.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response) {
      const data = err.response.data;
      const message =
        (data && (data.error || data.message)) ||
        `Request failed (${err.response.status})`;
      const wrapped = new Error(message);
      wrapped.status = err.response.status;
      return Promise.reject(wrapped);
    }
    if (err.request) {
      return Promise.reject(
        new Error("Could not reach the server. Is the backend running on port 5001?")
      );
    }
    return Promise.reject(err);
  }
);

export async function signup(payload) {
  const res = await client.post("/signup", payload);
  return res.data;
}

export async function login(payload) {
  const res = await client.post("/login", payload);
  return res.data;
}

export async function getMe() {
  const res = await client.get("/me");
  return res.data;
}

export async function getProducts() {
  const res = await client.get("/products");
  return res.data;
}

export async function addProduct(payload) {
  const res = await client.post("/products", payload);
  return res.data;
}

export async function updateProduct(sku, payload) {
  const res = await client.put(`/products/${encodeURIComponent(sku)}`, payload);
  return res.data;
}

export async function deleteProduct(sku) {
  const res = await client.delete(`/products/${encodeURIComponent(sku)}`);
  return res.data;
}

export async function getSuppliers() {
  const res = await client.get("/suppliers");
  return res.data;
}

export async function addSupplier(payload) {
  const res = await client.post("/suppliers", payload);
  return res.data;
}

export async function deleteSupplier(id) {
  const res = await client.delete(`/suppliers/${id}`);
  return res.data;
}

export async function getSales() {
  const res = await client.get("/sales");
  return res.data;
}

export async function addSale(payload) {
  const res = await client.post("/sales", payload);
  return res.data;
}

export async function deleteSale(id) {
  const res = await client.delete(`/sales/${id}`);
  return res.data;
}

export async function getSummary() {
  const res = await client.get("/summary");
  return res.data;
}

export async function getCategories() {
  const res = await client.get("/categories");
  return res.data;
}

export async function uploadSalesCsv(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await client.post("/sales/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getSalesAnalytics(groupBy) {
  const res = await client.get("/sales/analytics", { params: { group_by: groupBy } });
  return res.data;
}

export async function getSalesTrend() {
  const res = await client.get("/sales/trend");
  return res.data;
}

export async function getForecast(sku, days = 7) {
  const res = await client.get(`/forecast/${encodeURIComponent(sku)}`, {
    params: { days },
  });
  return res.data;
}

export async function getRestockRecommendations(leadTimeDays = 7) {
  const res = await client.get("/restock-recommendations", {
    params: { lead_time_days: leadTimeDays },
  });
  return res.data;
}

export async function getPurchaseOrders() {
  const res = await client.get("/purchase-orders");
  return res.data;
}

export async function addPurchaseOrder(payload) {
  const res = await client.post("/purchase-orders", payload);
  return res.data;
}

export async function updatePurchaseOrder(id, payload) {
  const res = await client.put(`/purchase-orders/${id}`, payload);
  return res.data;
}

export async function deletePurchaseOrder(id) {
  const res = await client.delete(`/purchase-orders/${id}`);
  return res.data;
}

export async function previewSalesCsv(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await client.post("/preprocessing/preview", formData);
  return res.data;
}

export async function downloadCleanedSalesCsv(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await client.post(
    "/preprocessing/download-cleaned",
    formData,
    { responseType: "blob" }
  );

  const url = window.URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cleaned_sales.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function evaluateDemandModel(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await client.post("/ml/evaluate", formData);
  return res.data;
}

export default client;
