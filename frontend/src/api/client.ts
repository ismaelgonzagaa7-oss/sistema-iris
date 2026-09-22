import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333/api";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("iris_token");
  if (token) {
    (config.headers as any) = { ...(config.headers as any), Authorization: `Bearer ${token}` };
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("iris_token");
      localStorage.removeItem("iris_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
