import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function ForecastChart() {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const futureDates = ["2025-07-12", "2025-07-13", "2025-07-14", "2025-07-15"];

    axios.post("http://localhost:5001/api/forecast", { dates: futureDates }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      const { dates, predictions } = res.data;
      const data = dates.map((date, i) => ({ date, predicted: predictions[i] }));
      setChartData(data);
    });
  }, []);

  return (
    <div>
      <h2>Predicted Sales</h2>
      <LineChart width={500} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="predicted" stroke="#ff69b4" />
      </LineChart>
    </div>
  );
}
