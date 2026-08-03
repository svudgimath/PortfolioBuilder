import apiClient from "./client";

export async function getStyles() {
  const res = await apiClient.get("/styles");
  return res.data;
}

export async function getActiveStyle() {
  const res = await apiClient.get("/styles/active");
  return res.data;
}

// Current remaining generation quota — { remainingToday, remainingThisMinute, resetsAt }.
export async function getStyleQuota() {
  const res = await apiClient.get("/styles/quota");
  return res.data;
}

// POST /styles — manual save / edit of a style payload.
export async function saveStyle(stylePayload) {
  const res = await apiClient.post("/styles", stylePayload);
  return res.data;
}

// Generation usually takes 5-15s, but a slow Gemini response plus the backend's
// two @Retryable backoff retries can push the worst case past a minute — so allow
// 120s before the client aborts (otherwise we get net::ERR_ABORTED with no body).
export async function generateStyle({ prompt, model } = {}) {
  const body = {};
  if (prompt && prompt.trim()) body.prompt = prompt.trim();
  if (model) body.model = model;
  const res = await apiClient.post("/styles/generate", body, { timeout: 120000 });
  return res.data; // { style, quota }
}

export async function activateStyle(styleId) {
  const res = await apiClient.patch(`/styles/${styleId}/activate`);
  return res.data;
}

export async function deleteStyle(styleId) {
  await apiClient.delete(`/styles/${styleId}`);
}
