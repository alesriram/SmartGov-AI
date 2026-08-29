import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE });

export const api = {
  stats: () => client.get("/dashboard/stats").then((r) => r.data),
  complaints: (params = {}) => client.get("/complaints", { params }).then((r) => r.data),
  complaint: (id) => client.get(`/complaints/${id}`).then((r) => r.data),
  departments: () => client.get("/departments").then((r) => r.data),
  forecast: (days_ahead = 7) =>
    client.get("/analytics/forecast", { params: { days_ahead } }).then((r) => r.data),
  hotspots: () => client.get("/analytics/hotspots").then((r) => r.data),
  trends: () => client.get("/analytics/trends").then((r) => r.data),
  assistantPrompt: (question, provider = null) =>
    client.post("/assistant/chat", { question, provider }).then((r) => r.data),
  assistantConfig: () => client.get("/assistant/config").then((r) => r.data),
  saveAssistantConfig: (payload) => client.post("/assistant/config", payload).then((r) => r.data),
  submitComplaint: (formData) =>
    client
      .post("/complaints", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data),
  deleteComplaint: (id) => client.delete(`/complaints/${id}`).then((r) => r.data),
};
