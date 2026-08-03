import apiClient from "./client";

export const getPortfolio = () => apiClient.get("/portfolio").then(r => r.data);
export const updateSection = (section, data) => apiClient.put(`/portfolio/${section}`, data).then(r => r.data);

// Apply the user's selected resume sections in one atomic call. `selection` is a
// ResumeParseResult-shaped object with ONLY the accepted sections set (others
// omitted/null) — the backend overlays them onto existing data without touching
// untouched sections, so there are no per-section write races.
export const applyResume = (selection) => apiClient.post("/portfolio/apply-resume", selection).then(r => r.data);

// Upload a resume (PDF) and get back a prefill payload — nothing is saved server-side.
// Sections absent from the resume come back null; item IDs are pre-populated.
export const parseResume = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post("/portfolio/parse-resume", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000, // LLM extraction can take a while
  }).then(r => r.data);
};
