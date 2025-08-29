// src/services/forecastService.js
export const downloadForecastCSV = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch(
    `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/forecast/export`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'forecast_report.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};