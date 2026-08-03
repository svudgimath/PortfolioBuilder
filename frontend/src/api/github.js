import apiClient from "./client";
import { API_BASE_URL } from "../utils/constants";

export async function getGithubStatus() {
  const response = await apiClient.get("/github/status");
  return response.data;
}

// Full-page redirect URL — the browser navigates here, it is NOT an XHR call.
export function getGithubConnectUrl(token) {
  return `${API_BASE_URL}/github/connect?token=${token}`;
}
