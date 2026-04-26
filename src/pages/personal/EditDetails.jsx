"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
  FiCamera,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiLock,
  FiSave,
  FiUser,
} from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
import Header from "../components/Header";
import {
  FormField,
  LoadingState,
  MetricCard,
  Notice,
  PageShell,
  SectionHeading,
} from "../components/ui";

const emptyEditData = {
  name: "",
  sec: "",
  email: "",
  phone: "",
};

/**
 * Profile settings page for details, avatar, and password updates.
 */
function EditDetails() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [passwordData, setPasswordData] = useState({
    password: "",
    newPassword: "",
  });
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editData, setEditData] = useState(emptyEditData);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const { setUser } = useAuth();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const currentProfile = profile?.[0] || null;
  const avatarInitials = (currentProfile?.name || currentProfile?.id || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const fetchProfile = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const response = await api.get("/api/user/profile");
      const profileData = response.data || [];
      setProfile(profileData);
      if (profileData.length > 0) {
        setEditData({
          name: profileData[0].name || "",
          sec: profileData[0].sec || "",
          email: profileData[0].email || "",
          phone: profileData[0].phone || "",
        });
      }
    } catch (profileError) {
      setNotice({ type: "error", text: profileError.message || "Could not load profile." });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEditData((current) => ({ ...current, [name]: value }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (currentProfile) {
      setEditData({
        name: currentProfile.name || "",
        sec: currentProfile.sec || "",
        email: currentProfile.email || "",
        phone: currentProfile.phone || "",
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setUpdating(true);
    setNotice(null);

    try {
      const submitData = {};
      Object.entries(editData).forEach(([key, value]) => {
        if (value && value.trim() !== "") submitData[key] = value.trim();
      });

      const response = await api.post("/api/change/data", submitData);
      setProfile(response.data);
      setNotice({ type: "success", text: "Profile updated successfully." });
      setIsEditing(false);

      if (response.data?.length > 0) {
        setEditData({
          name: response.data[0].name || "",
          sec: response.data[0].sec || "",
          email: response.data[0].email || "",
          phone: response.data[0].phone || "",
        });
      }
    } catch (updateError) {
      setNotice({ type: "error", text: getProfileError(updateError) });
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordData((current) => ({ ...current, [name]: value }));
  };

  const handlePhotoSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedPhoto(null);
      setPreviewUrl("");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
    setNotice(null);
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhoto) {
      setNotice({ type: "error", text: "Choose an image before uploading." });
      return;
    }

    setPhotoLoading(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("profilePic", selectedPhoto);

      const response = await api.post("/api/profile/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const imageUrl =
        response.data?.data?.profilePicUrl ||
        response.data?.data?.student?.profilePic ||
        response.data?.profilePic;

      if (!imageUrl) {
        setNotice({ type: "error", text: "Upload succeeded but no image URL was returned." });
        return;
      }

      setProfile((current) => {
        if (!current || current.length === 0) return current;
        const updated = [...current];
        updated[0] = { ...updated[0], profilePic: imageUrl };
        return updated;
      });
      setUser((current) => (current ? { ...current, profilePic: imageUrl } : current));
      setNotice({ type: "success", text: "Profile image uploaded successfully." });
      setSelectedPhoto(null);
      setPreviewUrl("");
    } catch (photoError) {
      setNotice({
        type: "error",
        text:
          photoError.response?.data?.message ||
          photoError.message ||
          "Upload failed. Please try again.",
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordChanging(true);
    setNotice(null);

    if (!passwordData.password || !passwordData.newPassword) {
      setNotice({ type: "error", text: "Both current and new password are required." });
      setPasswordChanging(false);
      return;
    }

    try {
      const response = await api.post("/api/change/password", {
        password: passwordData.password,
        newPassword: passwordData.newPassword,
      });

      if (response.data?.jwtToken) {
        Cookies.set("jwtToken", response.data.jwtToken);
        setPasswordData({ password: "", newPassword: "" });
        setNotice({ type: "success", text: "Password changed successfully." });
      }
    } catch (passwordError) {
      setNotice({ type: "error", text: getPasswordError(passwordError) });
    } finally {
      setPasswordChanging(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Account"
            title="Profile Details"
            description="Update your contact details, profile picture, and password from one secure settings page."
          />
        </section>

        {notice && (
          <div className="mt-6">
            <Notice type={notice.type} onDismiss={() => setNotice(null)}>
              {notice.text}
            </Notice>
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiUser className="h-5 w-5" aria-hidden="true" />}
            label="Student ID"
            value={currentProfile?.id || "Loading"}
            tone="blue"
          />
          <MetricCard
            icon={<FiUser className="h-5 w-5" aria-hidden="true" />}
            label="Section"
            value={currentProfile?.sec || "N/A"}
            tone="teal"
          />
          <MetricCard
            icon={<FiLock className="h-5 w-5" aria-hidden="true" />}
            label="Security"
            value="Password"
            tone="amber"
          />
        </section>

        {loading ? (
          <LoadingState label="Loading profile..." />
        ) : (
          <section className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
            <aside className="space-y-5">
              <div className="surface-card p-5">
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-lg font-black text-white dark:bg-white dark:text-slate-950">
                    {currentProfile?.profilePic ? (
                      <img
                        src={currentProfile.profilePic}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      avatarInitials
                    )}
                  </span>
                  <div className="min-w-0">
                    <h2 className="safe-text text-xl font-bold text-slate-950 dark:text-white">
                      {currentProfile?.name || "Student"}
                    </h2>
                    <p className="safe-text mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {currentProfile?.email || currentProfile?.id || "Profile"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <label className="btn-secondary w-full cursor-pointer">
                    <FiCamera aria-hidden="true" />
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelection}
                      className="sr-only"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handlePhotoUpload}
                    disabled={photoLoading || !selectedPhoto}
                    className="btn-primary w-full"
                  >
                    {photoLoading ? "Uploading..." : "Upload image"}
                  </button>
                </div>

                {previewUrl && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Preview
                    </p>
                    <img
                      src={previewUrl}
                      alt="Selected profile preview"
                      className="aspect-square w-32 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                    />
                  </div>
                )}
              </div>

              <ProfileSummary profile={currentProfile} />
            </aside>

            <div className="space-y-8">
              <section className="surface-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <SectionHeading kicker="Details" title="Personal information" />
                  {!isEditing && (
                    <button type="button" onClick={() => setIsEditing(true)} className="btn-primary">
                      <FiEdit3 aria-hidden="true" />
                      Edit profile
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <ReadOnlyField label="ID" value={currentProfile?.id} />
                    <ReadOnlyField label="Name" value={currentProfile?.name} />
                    <ReadOnlyField label="Section" value={currentProfile?.sec} />
                    <ReadOnlyField label="Phone" value={currentProfile?.phone} />
                    <ReadOnlyField label="Email" value={currentProfile?.email} className="md:col-span-2" />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <FormField id="profile-id" label="ID" helper="ID cannot be changed.">
                        <input id="profile-id" type="text" value={currentProfile?.id || ""} disabled className="form-field opacity-70" />
                      </FormField>
                      <FormField id="name" label="Name">
                        <input id="name" type="text" name="name" value={editData.name} onChange={handleInputChange} className="form-field" />
                      </FormField>
                      <FormField id="sec" label="Section">
                        <input id="sec" type="text" name="sec" value={editData.sec} onChange={handleInputChange} className="form-field uppercase" />
                      </FormField>
                      <FormField id="phone" label="Phone">
                        <input id="phone" type="text" name="phone" value={editData.phone} onChange={handleInputChange} className="form-field" />
                      </FormField>
                      <FormField id="email" label="Email" className="md:col-span-2">
                        <input id="email" type="email" name="email" value={editData.email} onChange={handleInputChange} className="form-field" />
                      </FormField>
                    </div>
                    <div className="flex flex-wrap justify-end gap-3">
                      <button type="button" onClick={handleCancel} className="btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" disabled={updating} className="btn-primary">
                        <FiSave aria-hidden="true" />
                        {updating ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  </form>
                )}
              </section>

              <section className="surface-card p-5">
                <SectionHeading
                  kicker="Security"
                  title="Change password"
                  description="Use your current password and choose a new one."
                />

                <form onSubmit={handlePasswordSubmit} className="mt-6 grid gap-5">
                  <PasswordField
                    id="current-password"
                    label="Current password"
                    name="password"
                    value={passwordData.password}
                    show={showCurrentPassword}
                    onToggle={() => setShowCurrentPassword((current) => !current)}
                    onChange={handlePasswordChange}
                  />
                  <PasswordField
                    id="new-password"
                    label="New password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    show={showNewPassword}
                    onToggle={() => setShowNewPassword((current) => !current)}
                    onChange={handlePasswordChange}
                  />
                  <div className="flex justify-end">
                    <button type="submit" disabled={passwordChanging} className="btn-primary">
                      <FiLock aria-hidden="true" />
                      {passwordChanging ? "Changing..." : "Change password"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </section>
        )}
      </PageShell>
    </div>
  );
}

function ProfileSummary({ profile }) {
  return (
    <div className="surface-card p-5">
      <SectionHeading kicker="Summary" title="Profile" />
      <div className="mt-5 space-y-3 text-sm">
        <InfoRow label="ID" value={profile?.id} />
        <InfoRow label="Name" value={profile?.name} />
        <InfoRow label="Section" value={profile?.sec} />
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value, className = "" }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="safe-text mt-2 font-semibold text-slate-950 dark:text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="safe-text text-right font-semibold text-slate-950 dark:text-white">
        {value || "N/A"}
      </span>
    </div>
  );
}

function PasswordField({ id, label, name, value, show, onToggle, onChange }) {
  return (
    <FormField id={id} label={label}>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          className="form-field pr-12"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 rounded-md p-2 -translate-y-1/2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        </button>
      </div>
    </FormField>
  );
}

function getProfileError(error) {
  const status = error.response?.status;
  if (status === 404) return "The requested endpoint was not found.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Internal server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not update profile.";
}

function getPasswordError(error) {
  const status = error.response?.status;
  if (status === 404) return "The requested endpoint was not found.";
  if (status === 401) return "Current password is incorrect.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Internal server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not change password.";
}

export default EditDetails;
