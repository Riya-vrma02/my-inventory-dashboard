// src/services/handleError.js
const token = localStorage.getItem('token');
axios.get('http://localhost:5001/api/protected', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

export const handleError = (error) => {
  if (error.response) {
    return error.response.data?.msg || "An error occurred";
  }
  return "Server unreachable";
};
