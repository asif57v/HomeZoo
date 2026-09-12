export const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  console.error("⚠️ VITE_API_URL is not defined in .env! Requests may fail.");
}

export const getApiUrl = (endpoint) => {
    return `${API_BASE_URL}${endpoint}`;
};
