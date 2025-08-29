// src/services/productService.js
import API from "./api";

export const getProducts = async () => {
  const res = await API.get("/products");
  return res.data;
};

export const addProduct = async (product) => {
  const res = await API.post("/products", product);
  return res.data;
};

export const updateProduct = async (id, updated) => {
  const res = await API.put(`/products/${id}`, updated);
  return res.data;
};

export const deleteProduct = async (id) => {
  const res = await API.delete(`/products/${id}`);
  return res.data;
};
