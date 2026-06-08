import api from "../api";

export const fetchAiFeatureSetting = async () => {
  const response = await api.get("/api/settings/ai");
  return normalizeAiFeatureSetting(response.data);
};

export const updateAiFeatureSetting = async (enabled) => {
  const response = await api.patch("/api/admin/settings/ai", { enabled });
  return normalizeAiFeatureSetting(response.data);
};

function normalizeAiFeatureSetting(data) {
  return {
    aiFeatureEnabled: data?.aiFeatureEnabled === true,
  };
}
