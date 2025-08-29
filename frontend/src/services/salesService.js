// src/services/salesService.js
import API from "./api";

export const getSales = async () => {
  const res = await API.get("/sales");
  return res.data;
};

export const addSale = async (sale) => {
  const res = await API.post("/sales", sale);
  return res.data;
};
