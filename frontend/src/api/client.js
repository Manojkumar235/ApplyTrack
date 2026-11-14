import axios from "axios";
import { toApplicationPayload } from "./applicationPayload";

export const AUTH_TOKEN_KEY = "applytrack_access_token";
export const AUTH_USER_KEY = "applytrack_user";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      window.localStorage.getItem(AUTH_TOKEN_KEY)
    ) {
      window.dispatchEvent(new Event("applytrack:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error, fallback = "Something went wrong.") {
  return error.response?.data?.message || fallback;
}

export const authApi = {
  login: (credentials) => apiClient.post("/auth/login", credentials),
  register: (credentials) => apiClient.post("/auth/register", credentials),
};

export const applicationsApi = {
  list: () => apiClient.get("/applications"),
  create: (application) =>
    apiClient.post("/applications", toApplicationPayload(application)),
  get: (applicationId) => apiClient.get(`/applications/${applicationId}`),
  update: (applicationId, application) =>
    apiClient.patch(
      `/applications/${applicationId}`,
      toApplicationPayload(application),
    ),
  delete: (applicationId) => apiClient.delete(`/applications/${applicationId}`),
};

export default apiClient;
