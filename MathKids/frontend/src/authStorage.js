const AUTH_KEYS = ["token", "user"];

export function getAuthStorage() {
  return localStorage.getItem("token") ? localStorage : sessionStorage;
}

export function getAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

export function getCachedUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function saveAuthSession(data, remember) {
  for (const key of AUTH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem("token", data.token);
  storage.setItem("user", JSON.stringify(data.user));
}

export function clearAuthSession() {
  for (const key of AUTH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export function saveCachedUser(user) {
  getAuthStorage().setItem("user", JSON.stringify(user));
}

export function resolveAvatarUrl(avatarUrl) {
  if (!avatarUrl?.startsWith("/uploads/")) return avatarUrl || "";
  const apiBase = import.meta.env.VITE_API_URL || "";
  return `${apiBase.replace(/\/api\/?$/, "")}${avatarUrl}`;
}
