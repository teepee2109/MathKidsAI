import { getAuthToken } from "../authStorage";
import { apiUrl } from "../api";

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Không thể kết nối máy chủ.");
  return data;
}

export function getQuestionTopics(grade) {
  return request(`questions/topics?${new URLSearchParams({ grade: String(grade) })}`);
}

export function getQuestions({ grade, topic, difficulty, count = 10 }) {
  const query = new URLSearchParams({ grade: String(grade), count: String(count) });
  if (topic) query.set("topic", topic);
  if (difficulty) query.set("difficulty", String(difficulty));
  return request(`questions?${query}`);
}

export function getQuestion(questionId) {
  return request(`questions/${encodeURIComponent(questionId)}`);
}

export function submitQuestionAnswer(questionId, answer, timeSpent = 0, activityType = "Lesson") {
  return request(`questions/${encodeURIComponent(questionId)}/answer`, {
    method: "POST",
    body: JSON.stringify({ answer, timeSpent, activityType }),
  });
}

export function claimGameRewards(resultIds) {
  return request("games/rewards", {
    method: "POST",
    body: JSON.stringify({ resultIds }),
  });
}
