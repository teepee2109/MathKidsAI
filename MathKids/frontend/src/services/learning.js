import { getAuthToken } from "../authStorage";
import { apiFetch } from "../api";

async function request(path, options = {}) {
  const response = await apiFetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error([data.message, data.detail].filter(Boolean).join(" — ") || "Không thể kết nối máy chủ.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export function getLearningPath() {
  return request("learning/path");
}

export function completeLesson(lessonId) {
  return request(`learning/lessons/${encodeURIComponent(lessonId)}/complete`, { method: "POST" });
}
