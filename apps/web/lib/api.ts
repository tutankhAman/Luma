import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { error?: string } | undefined;
      const message = data?.error ?? error.message ?? "Request failed";
      return Promise.reject(new Error(message));
    }
    return Promise.reject(
      error instanceof Error ? error : new Error(String(error))
    );
  }
);
