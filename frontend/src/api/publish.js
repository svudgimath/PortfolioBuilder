import apiClient from "./client";

export async function getPublishStatus() {
  const response = await apiClient.get("/publish/status");
  return response.data;
}

export async function suggestRepoName() {
  const response = await apiClient.get("/publish/repo-suggest");
  return response.data;
}

export async function validateRepo(repoName) {
  const response = await apiClient.post("/publish/validate-repo", { repoName });
  return response.data;
}

// Publishing pushes template + data + media — it can take 10-30s, well past
// the client's default 5s timeout, so this one call gets a generous override.
export async function publish(repoName, mode) {
  const response = await apiClient.post(
    "/publish",
    { repoName, mode },
    { timeout: 120000 }
  );
  return response.data;
}
