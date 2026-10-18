import { apiFetch } from "../api";
import { getAuthToken } from "../authStorage";

function authHeaders() {
  return { Authorization: `Bearer ${getAuthToken()}` };
}

async function readJson(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || fallbackMessage);
  return data;
}

export async function getNotifications(limit = 20) {
  const response = await apiFetch(`/notifications?limit=${limit}`, { cache: "no-store", headers: authHeaders() });
  return readJson(response, "Không thể tải thông báo.");
}

export async function markNotificationRead(id) {
  const response = await apiFetch(`/notifications/${id}/read`, { method: "PATCH", headers: authHeaders() });
  return readJson(response, "Không thể cập nhật thông báo.");
}

export async function markAllNotificationsRead() {
  const response = await apiFetch("/notifications/read-all", { method: "POST", headers: authHeaders() });
  return readJson(response, "Không thể cập nhật thông báo.");
}
