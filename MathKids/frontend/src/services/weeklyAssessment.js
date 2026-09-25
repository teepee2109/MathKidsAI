import { getAuthToken } from "../authStorage";
import { apiFetch, apiUrl } from "../api";

async function request(path, options = {}) {
  const headers = { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json", ...options.headers };
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

export const getWeeklyAssessment = () => request("students/me/weekly-assessment");
export const startWeeklyAssessment = () => request("students/me/weekly-assessment/start", { method: "POST", body: "{}" });
export const submitWeeklyAssessment = (attemptId, answers) => request(`students/me/weekly-assessment/${encodeURIComponent(attemptId)}/submit`, {
  method: "POST", body: JSON.stringify({ answers }),
});
