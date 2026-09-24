const configuredApiBase = String(import.meta.env.VITE_API_URL || "/api").trim().replace(/\/+$/, "");

export const API_BASE_URL = configuredApiBase.endsWith("/api")
  ? configuredApiBase
  : `${configuredApiBase}/api`;

export function apiUrl(path = "") {
  const normalizedPath = String(path).replace(/^\/+/, "");
  return normalizedPath ? `${API_BASE_URL}/${normalizedPath}` : API_BASE_URL;
}
