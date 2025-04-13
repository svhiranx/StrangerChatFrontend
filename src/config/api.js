const API_URL = import.meta.env.VITE_API_URL;
import axios from "axios";

const apiConfig = {
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
};

export const api = axios.create({
  baseURL: apiConfig.baseURL,
  headers: apiConfig.headers
});

export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    ...apiConfig.headers,
    'Authorization': token ? `Bearer ${token}` : ''
  };
}; 

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('Request error:', error);
  return Promise.reject(error);
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Response error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      // Handle unauthorized error
      localStorage.removeItem('authToken');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);