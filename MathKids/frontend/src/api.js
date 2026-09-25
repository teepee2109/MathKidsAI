const configuredApiBase = String(import.meta.env.VITE_API_URL || "/api").trim().replace(/\/+$/, "");

export const API_BASE_URL = configuredApiBase.endsWith("/api")
  ? configuredApiBase
  : `${configuredApiBase}/api`;

export function apiUrl(path = "") {
  const normalizedPath = String(path).replace(/^\/+/, "");
  return normalizedPath ? `${API_BASE_URL}/${normalizedPath}` : API_BASE_URL;
}

const transientDatabaseError = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ESOCKET|connection lost|connection is closing|\baborted\b/i;

// Read requests are safe to retry when SQL Server or its local TCP connection
// briefly drops. Never retry writes: a response can be lost after a write has
// already committed.
export async function apiFetch(path, options = {}) {
  const canRetry = !options.method || options.method.toUpperCase() === "GET";

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(apiUrl(path), options);
      if (!canRetry || response.status < 500 || attempt >= 2) return response;

      const body = await response.clone().json().catch(() => ({}));
      const failure = `${body.message || ""} ${body.detail || ""}`;
      if (!transientDatabaseError.test(failure)) return response;
    } catch (error) {
      if (!canRetry || error.name === "AbortError" || attempt >= 2) throw error;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 300 * (2 ** attempt)));
  }
}
