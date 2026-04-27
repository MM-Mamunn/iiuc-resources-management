import api from "../api";

export const fetchActiveSession = async () => {
  const response = await api.get("/api/session/active");
  return response.data;
};

export const listSessions = async () => {
  const response = await api.get("/api/session");
  return Array.isArray(response.data) ? response.data : [];
};

export const createSession = async (payload) => {
  const response = await api.post("/api/session", payload);
  return response.data;
};

export const updateSession = async (sessionName, payload) => {
  const response = await api.put(
    `/api/session/${encodeURIComponent(sessionName)}`,
    payload,
  );
  return response.data;
};
