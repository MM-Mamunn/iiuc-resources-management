import api from "../api";

export const emptySponsorSocialLinks = {
  facebook: "",
  linkedin: "",
  github: "",
  instagram: "",
  x: "",
  youtube: "",
};

export const fetchFeaturedSponsor = async () => {
  const response = await api.get("/api/sponsors/featured");

  return {
    sponsorFeatureEnabled: response.data?.sponsorFeatureEnabled === true,
    sponsor: normalizeSponsor(response.data?.row),
  };
};

export const fetchAdminSponsor = async () => {
  const response = await api.get("/api/admin/sponsor");

  return {
    sponsorFeatureEnabled: response.data?.sponsorFeatureEnabled === true,
    sponsor: normalizeSponsor(response.data?.row),
  };
};

export const saveAdminSponsor = async ({
  name,
  logoFile,
  description,
  websiteUrl,
  socialLinks,
  contactInfo,
}) => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("description", description);
  formData.append("websiteUrl", websiteUrl || "");
  formData.append("socialLinks", JSON.stringify(normalizeSocialLinks(socialLinks)));
  formData.append("contactInfo", contactInfo || "");

  if (logoFile) {
    formData.append("logo", logoFile);
  }

  const response = await api.put("/api/admin/sponsor", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return normalizeSponsor(response.data?.row);
};

export const fetchSponsorFeatureSetting = async () => {
  const response = await api.get("/api/settings/sponsor");

  return {
    sponsorFeatureEnabled: response.data?.sponsorFeatureEnabled === true,
  };
};

export const updateSponsorFeatureSetting = async (enabled) => {
  const response = await api.patch("/api/admin/settings/sponsor", { enabled });

  return {
    sponsorFeatureEnabled: response.data?.sponsorFeatureEnabled === true,
  };
};

export function normalizeSponsor(row) {
  if (!row) return null;

  return {
    ...row,
    name: String(row.name || "").trim(),
    logo: String(row.logo || "").trim(),
    description: String(row.description || "").trim(),
    websiteUrl: String(row.websiteUrl || "").trim(),
    contactInfo: String(row.contactInfo || "").trim(),
    socialLinks: normalizeSocialLinks(row.socialLinks),
  };
}

export function normalizeSocialLinks(value) {
  const source = parseSocialLinks(value);

  return Object.keys(emptySponsorSocialLinks).reduce((links, key) => {
    links[key] = String(source[key] || "").trim();
    return links;
  }, {});
}

function parseSocialLinks(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}
