import { apiFetch } from "../api";
import { getAuthToken } from "../authStorage";

function authHeaders() {
  return { Authorization: `Bearer ${getAuthToken()}` };
}

export async function getChildren() {
  const res = await apiFetch("parents/me/children", { cache: "no-store", headers: authHeaders() });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || "Không thể tải danh sách con.");
  return d;
}

export async function linkChild(inviteCode) {
  const res = await apiFetch("parents/me/children/link", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || "Không thể liên kết.");
  return d;
}

export async function createChildAccount({ name, email, password, grade }) {
  const res = await apiFetch("parents/me/children/create", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, grade }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || "Không thể tạo tài khoản học sinh.");
  return d;
}

export async function unlinkChild(studentId) {
  const res = await apiFetch(`parents/me/children/${studentId}`, { method: "DELETE", headers: authHeaders() });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || "Không thể hủy liên kết.");
  return d;
}

export async function getChildReport(studentId) {
  const res = await apiFetch(`parents/me/children/${studentId}/report`, { cache: "no-store", headers: authHeaders() });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || "Không thể tải báo cáo.");
  return d;
}

export async function getChildAlerts(studentId) {
  const res = await apiFetch(`parents/me/children/${studentId}/alerts`, { cache: "no-store", headers: authHeaders() });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || "Không thể tải cảnh báo.");
  return d;
}

export async function getChildRecommendations(studentId) {
  const res = await apiFetch(`parents/me/children/${studentId}/recommendations`, { cache: "no-store", headers: authHeaders() });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || "Không thể tải gợi ý.");
  return d;
}

export async function getMyInviteCode() {
  const res = await apiFetch("students/me/invite-code", { cache: "no-store", headers: authHeaders() });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || "Không thể lấy mã liên kết.");
  return d;
}
