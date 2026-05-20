import axios from "axios";
import Cookies from "js-cookie";

const apiBaseURL = import.meta.env.DEV
  ? import.meta.env.VITE_URL || "http://localhost:3000"
  : "";

const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("jwtToken");
    if (token) {
      config.headers = {
        ...config.headers,
        jwtToken: token,
      };
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && [401, 403].includes(error.response.status)) {
      Cookies.remove("jwtToken");
    }
    return Promise.reject(error);
  },
);

export default api;
