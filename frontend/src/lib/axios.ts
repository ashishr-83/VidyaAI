import axios from 'axios';

const JWT_KEY = 'vidyaai_jwt';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(JWT_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 — clear token and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(JWT_KEY);
      window.location.replace('/auth/login');
    }
    return Promise.reject(error);
  }
);

export { JWT_KEY };
