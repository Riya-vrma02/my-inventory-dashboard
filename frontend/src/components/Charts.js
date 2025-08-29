import React, { useEffect, useState, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  BarChart, Bar, ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getSales, getForecasts } from "../services/api";
import "./Charts.css";

export default function Charts() {
  const [salesData, setSalesData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const chartRef = useRef();

  const groupByDate = (rows, key) =>
    rows.reduce((acc, r) => {
      const date = new Date(r.date).toISOString().slice(0, 10);
      const val = Number(r[key] ?? 0);
      acc[date] = (acc[date] || 0) + val;
      return acc;
    }, {});

  const mergeForLine = () => {
    const salesMap = groupByDate(salesData, "quantity_sold");
    const forecastMap = groupByDate(forecastData, "predicted_quantity");
    const allDates = [...new Set([...Object.keys(salesMap), ...Object.keys(forecastMap)])].sort();
    return allDates.map(d => ({
      date: d,
      sales: salesMap[d] || 0,
      forecast: forecastMap[d] || 0,
    }));
  };

  useEffect(() => {
    Promise.all([getSales(), getForecasts()])
      .then(([s, f]) => {
        console.log("Sales:", s);
        console.log("Forecast:", f);
        setSalesData(s || []);
        setForecastData(f || []);
      })
      .catch(console.error);
  }, []);

  const lineData = mergeForLine();
  console.log('Line Chart Data:', lineData);

  const exportPDF = () => {
    const input = chartRef.current;
    html2canvas(input).then(canvas => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "pt", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 20, 20, pdfWidth - 40, pdfHeight - 40);
      pdf.save("charts.pdf");
    });
  };

  return (
    <div className="charts-container">
      <h2>📊 Sales vs Forecast</h2>
      <button onClick={exportPDF}>📤 Export to PDF</button>
      <div className="chart-wrapper" ref={chartRef}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke="#42a5f5" name="Actual Sales" />
            <Line type="monotone" dataKey="forecast" stroke="#ab47bc" name="Forecast" />
          </LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="predicted_quantity" fill="#ab47bc" name="Forecast" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
