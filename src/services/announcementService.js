import api from "../api";

export const fetchFeaturedAnnouncement = async () => {
  const response = await api.get("/api/announcements/featured");
  return response.data?.row || null;
};

export const fetchAdminAnnouncement = async () => {
  const response = await api.get("/api/admin/announcement");
  return response.data?.row || null;
};

export const saveAdminAnnouncement = async ({
  title,
  description,
  link,
  imageFile,
}) => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", description);
  formData.append("link", link);

  if (imageFile) {
    formData.append("image", imageFile);
  }

  const response = await api.put("/api/admin/announcement", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data?.row || null;
};

export const updateAdminAnnouncementVisibility = async (isActive) => {
  const response = await api.patch("/api/admin/announcement/visibility", {
    isActive,
  });

  return response.data?.row || null;
};
