import apiClient from "./client";

// Upload a file to Cloudinary via the backend.
// Returns { url, publicId, resourceType, contentType, filename, bytes }.
// The frontend stores `url` directly into the relevant portfolio field
// (e.g. meta.profilePhoto, projects.items[].thumbnail) — that's the canonical
// reference. The published portfolio and preview load images from Cloudinary.
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000, // 5MB over a slow connection can exceed the default 10s
  });
  return response.data;
}

// Explicit Cloudinary delete. USUALLY NOT NEEDED — on portfolio save the
// backend diffs `before` vs `after` URLs and auto-removes any that disappeared.
// Call this only to clean up an upload the user discards before the next save.
export async function deleteFile({ publicId, resourceType = "image" } = {}) {
  if (!publicId) return;
  await apiClient.delete("/files", { params: { publicId, resourceType } });
}
