// src/components/SalesChart.js
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getSales } from "../services/api";

// Helper: group by date and sum quantity
const groupSalesByDate = (sales) => {
  const map = new Map();
  sales.forEach((d) => {
    const date = new Date(d.date).toISOString().slice(0, 10);
    const qty = Number(d.quantity ?? 0);
    if (!map.has(date)) {
      map.set(date, { date, sales: qty, revenue: qty * 10 }); // Adjust revenue logic as needed
    } else {
      const existing = map.get(date);
      existing.sales += qty;
      existing.revenue += qty * 10;
    }
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

const SalesChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    getSales()
      .then((sales) => {
        setData(groupSalesByDate(sales || []));
      })
      .catch(() => setData([]));
  }, []);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="sales" stroke="#3f51b5" name="Sales" />
        <Line type="monotone" dataKey="revenue" stroke="#0d9488" name="Revenue" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SalesChart;
