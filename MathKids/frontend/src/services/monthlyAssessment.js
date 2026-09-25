import { getAuthToken } from "../authStorage";
import { apiFetch, apiUrl } from "../api";

async function request(path, options = {}) {
  const headers = {
    Authorization: `Bearer ${getAuthToken()}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  const response = options.method ? await fetch(apiUrl(path), { ...options, headers })
    : await apiFetch(path, { cache: "no-store", ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error([data.message, data.detail].filter(Boolean).join(" — ") || "Không thể kết nối máy chủ.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export function getMonthlyAssessment() {
  return request("students/me/monthly-assessment");
}

export function startMonthlyAssessment() {
  return request("students/me/monthly-assessment/start", { method: "POST", body: "{}" });
}

export function submitMonthlyAssessment(attemptId, answers) {
  return request(`students/me/monthly-assessment/${encodeURIComponent(attemptId)}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}
