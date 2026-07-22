import api from "../api";

/**
 * Fetches the dashboard's fixed latest-record AI monitoring snapshot.
 * The endpoint owns the limit and ordering so future list controls can be
 * added without changing current callers.
 */
export const fetchLatestAiQueryLogs = async () => {
  const response = await api.get("/api/admin/ai-query-logs");
  return response.data?.rows || [];
};
