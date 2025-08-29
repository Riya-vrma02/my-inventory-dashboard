import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { predict } from '../services/api';

export default function ForecastChart() {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const futureDates = ["2025-07-12", "2025-07-13", "2025-07-14", "2025-07-15"];
    predict(futureDates)
      .then(res =>
        setChartData(
          res.dates.map((date, i) => ({ date, predicted: res.predictions[i] }))
        )
      )
      .catch(console.error);
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