"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Cookies from "js-cookie";
import {
  FiAlertTriangle,
  FiBookOpen,
  FiCamera,
  FiChevronRight,
  FiEdit3,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMessageSquare,
  FiPlus,
  FiSave,
  FiSearch,
  FiSend,
  FiTrash2,
  FiUser,
  FiX,
} from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
import Header from "../components/Header";
import {
  FormField,
  LoadingState,
  Notice,
  PageShell,
  SectionHeading,
  SuggestionList,
} from "../components/ui";
import ResourceBrowser from "../components/ResourceBrowser";

const emptyEditData = {
  name: "",
  sec: "",
  email: "",
  phone: "",
};

const emptyResourceForm = {
  course: "",
  links: "",
};

const emptySemesterResourceForm = {
  semester: "",
  links: "",
};

const emptySubmissionForm = {
  type: "CR",
  description: "",
};

const semesterOptions = Array.from({ length: 8 }, (_, index) => index + 1);

const profileSectionKeys = new Set(["details", "resources", "applications", "settings"]);
const submissionTypes = ["CR", "Feedback", "Suggestion", "Complaint", "Request"];
const SUBMISSION_PAGE_SIZE = 5;
const DEFAULT_SUBMISSION_PAGINATION = {
  page: 1,
  limit: SUBMISSION_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

const resourceEntryModes = [
  {
    key: "course",
    label: "Add to course",
    description: "Submit one resource link for a single course.",
  },
  {
    key: "semester",
    label: "Add to semester",
    description: "Submit one link to multiple semester courses.",
  },
];

/**
 * Profile settings page for details, avatar, and password updates.
 */
function EditDetails() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("tab");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [activeProfileSection, setActiveProfileSection] = useState(() =>
    profileSectionKeys.has(requestedSection) ? requestedSection : "details",
  );
  const [resourceEntryMode, setResourceEntryMode] = useState("course");
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
  const [sectionSuggestions, setSectionSuggestions] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [pendingProfileUpdate, setPendingProfileUpdate] = useState(null);
  const [sectionWarningAccepted, setSectionWarningAccepted] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoRemoving, setPhotoRemoving] = useState(false);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [semesterResourceForm, setSemesterResourceForm] = useState(emptySemesterResourceForm);
  const [resourceSuggestions, setResourceSuggestions] = useState([]);
  const [resourceCourseLoading, setResourceCourseLoading] = useState(false);
  const [resourceCountLoading, setResourceCountLoading] = useState(false);
  const [resourceCount, setResourceCount] = useState({
    total: 0,
    limit: 5,
    remaining: 5,
  });
  const [resourceSubmitting, setResourceSubmitting] = useState(false);
  const [semesterCourses, setSemesterCourses] = useState([]);
  const [selectedSemesterCourses, setSelectedSemesterCourses] = useState([]);
  const [semesterCoursesLoading, setSemesterCoursesLoading] = useState(false);
  const [semesterResourceSubmitting, setSemesterResourceSubmitting] = useState(false);
  const [semesterNotice, setSemesterNotice] = useState(null);
  const [resourceRefreshKey, setResourceRefreshKey] = useState(0);
  const [resourceCountRefreshKey, setResourceCountRefreshKey] = useState(0);
  const [submissionForm, setSubmissionForm] = useState(emptySubmissionForm);
  const [submissionSubmitting, setSubmissionSubmitting] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionPagination, setSubmissionPagination] = useState(DEFAULT_SUBMISSION_PAGINATION);
  const { setUser } = useAuth();

  const fetchMySubmissions = useCallback(async (page = 1) => {
    setSubmissionsLoading(true);

    try {
      const response = await api.get("/api/submissions/mine", {
        params: { page, limit: SUBMISSION_PAGE_SIZE },
      });
      const rows = response.data?.rows ?? [];
      const pagination = response.data?.pagination ?? {
        page,
        limit: SUBMISSION_PAGE_SIZE,
        total: rows.length,
        totalPages: Math.max(Math.ceil(rows.length / SUBMISSION_PAGE_SIZE), 1),
      };

      if (rows.length === 0 && pagination.total > 0 && page > 1) {
        await fetchMySubmissions(page - 1);
        return;
      }

      setSubmissions(rows);
      setSubmissionPagination(pagination);
    } catch (submissionError) {
      setSubmissions([]);
      setSubmissionPagination(DEFAULT_SUBMISSION_PAGINATION);
      setSubmissionNotice({
        type: "error",
        text: getSubmissionError(submissionError),
      });
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profileSectionKeys.has(requestedSection)) {
      setActiveProfileSection(requestedSection);
    }
  }, [requestedSection]);

  useEffect(() => {
    if (activeProfileSection === "applications") {
      fetchMySubmissions(1);
    }
  }, [activeProfileSection, fetchMySubmissions]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const courseCode = resourceForm.course.trim();

    if (!courseCode) {
      setResourceCount({ total: 0, limit: 5, remaining: 5 });
      return undefined;
    }

    let ignoreResult = false;
    const timer = window.setTimeout(async () => {
      setResourceCountLoading(true);

      try {
        const response = await api.get(
          `/api/resources/mine/course/${encodeURIComponent(courseCode)}/count`,
        );

        if (!ignoreResult) {
          setResourceCount({
            total: response.data?.total ?? 0,
            limit: response.data?.limit ?? 5,
            remaining: response.data?.remaining ?? 5,
          });
        }
      } catch {
        if (!ignoreResult) {
          setResourceCount({ total: 0, limit: 5, remaining: 5 });
        }
      } finally {
        if (!ignoreResult) {
          setResourceCountLoading(false);
        }
      }
    }, 300);

    return () => {
      ignoreResult = true;
      window.clearTimeout(timer);
    };
  }, [resourceForm.course, resourceCountRefreshKey]);

  useEffect(() => {
    const semester = semesterResourceForm.semester;

    if (!semester) {
      setSemesterCourses([]);
      setSelectedSemesterCourses([]);
      setSemesterNotice(null);
      return undefined;
    }

    let ignoreResult = false;
    const loadSemesterCourses = async () => {
      setSemesterCoursesLoading(true);
      setSemesterNotice(null);

      try {
        const response = await api.get(`/api/resources/semester/${semester}/courses`);

        if (!ignoreResult) {
          setSemesterCourses(response.data?.rows ?? []);
          setSelectedSemesterCourses([]);
        }
      } catch (semesterError) {
        if (!ignoreResult) {
          setSemesterCourses([]);
          setSelectedSemesterCourses([]);
          setSemesterNotice({ type: "error", text: getResourceSubmitError(semesterError) });
        }
      } finally {
        if (!ignoreResult) {
          setSemesterCoursesLoading(false);
        }
      }
    };

    loadSemesterCourses();

    return () => {
      ignoreResult = true;
    };
  }, [semesterResourceForm.semester]);

  const currentProfile = profile?.[0] || null;
  const avatarInitials = (currentProfile?.name || currentProfile?.id || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const profileNavigation = [
    {
      key: "details",
      title: "Profile details",
      description: "Update your student information and contact details.",
      icon: FiUser,
    },
    {
      key: "resources",
      title: "Resources",
      description: "Share course links and review your submissions.",
      icon: FiBookOpen,
    },
    {
      key: "applications",
      title: "Applications & Feedback",
      description: "Send requests, feedback, complaints, and CR applications.",
      icon: FiMessageSquare,
    },
    {
      key: "settings",
      title: "Settings",
      description: "Change your password from the secure form.",
      icon: FiLock,
    },
  ];

  const handleProfileSectionSelect = (sectionKey) => {
    setActiveProfileSection(sectionKey);
    setSearchParams({ tab: sectionKey }, { replace: true });
  };

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

  const handleSectionChange = async (event) => {
    const value = event.target.value.toUpperCase();
    setEditData((current) => ({ ...current, sec: value }));

    if (value.length < 1 || value.length > 4) {
      setSectionSuggestions([]);
      return;
    }

    setSectionLoading(true);
    try {
      const response = await api.get(
        `/api/lookLike/sectionLookLike/${encodeURIComponent(value)}`,
      );
      const suggestions = response.data?.rows?.map((row) => row.sec) ?? [];
      setSectionSuggestions(suggestions);
    } catch {
      setSectionSuggestions([]);
    } finally {
      setSectionLoading(false);
    }
  };

  const chooseSectionSuggestion = (sectionCode) => {
    setEditData((current) => ({ ...current, sec: sectionCode }));
    setSectionSuggestions([]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSectionSuggestions([]);
    setPendingProfileUpdate(null);
    setSectionWarningAccepted(false);
    if (currentProfile) {
      setEditData({
        name: currentProfile.name || "",
        sec: currentProfile.sec || "",
        email: currentProfile.email || "",
        phone: currentProfile.phone || "",
      });
    }
  };

  const submitProfileUpdate = async (submitData) => {
    setUpdating(true);
    setNotice(null);
    setSectionSuggestions([]);

    try {
      const response = await api.post("/api/change/data", submitData);
      const updatedRows = Array.isArray(response.data)
        ? response.data
        : response.data?.rows ?? [];

      if (response.data?.jwtToken) {
        Cookies.set("jwtToken", response.data.jwtToken);
      }

      setProfile(updatedRows);
      setNotice({ type: "success", text: "Profile updated successfully." });
      setIsEditing(false);
      setPendingProfileUpdate(null);
      setSectionWarningAccepted(false);

      if (updatedRows.length > 0) {
        setEditData({
          name: updatedRows[0].name || "",
          sec: updatedRows[0].sec || "",
          email: updatedRows[0].email || "",
          phone: updatedRows[0].phone || "",
        });
        setUser((current) => (current ? { ...current, ...updatedRows[0] } : updatedRows[0]));
      }
    } catch (updateError) {
      setNotice({ type: "error", text: getProfileError(updateError) });
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const submitData = {};
    Object.entries(editData).forEach(([key, value]) => {
      if (value && value.trim() !== "") {
        submitData[key] = key === "sec" ? value.trim().toUpperCase() : value.trim();
      }
    });

    const currentSection = String(currentProfile?.sec || "").trim().toUpperCase();
    const nextSection = String(submitData.sec || currentSection).trim().toUpperCase();
    const sectionChanged = Boolean(nextSection && currentSection && nextSection !== currentSection);

    if (sectionChanged) {
      setSectionSuggestions([]);
      setPendingProfileUpdate({
        ...submitData,
        sec: nextSection,
        confirmSectionChange: true,
      });
      setSectionWarningAccepted(false);
      return;
    }

    await submitProfileUpdate(submitData);
  };

  const confirmSectionUpdate = async () => {
    if (!sectionWarningAccepted || !pendingProfileUpdate) return;
    await submitProfileUpdate(pendingProfileUpdate);
  };

  const cancelSectionUpdate = () => {
    setPendingProfileUpdate(null);
    setSectionWarningAccepted(false);
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

  const handlePhotoRemove = async () => {
    if (!currentProfile?.profilePic) {
      setNotice({ type: "error", text: "There is no profile image to remove." });
      return;
    }

    setPhotoRemoving(true);
    setNotice(null);

    try {
      await api.delete("/api/profile/picture");
      setProfile((current) => {
        if (!current || current.length === 0) return current;
        const updated = [...current];
        updated[0] = { ...updated[0], profilePic: null };
        return updated;
      });
      setUser((current) => (current ? { ...current, profilePic: null } : current));
      setSelectedPhoto(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setNotice({ type: "success", text: "Profile image removed successfully." });
    } catch (photoError) {
      setNotice({
        type: "error",
        text:
          photoError.response?.data?.message ||
          photoError.message ||
          "Could not remove the profile image.",
      });
    } finally {
      setPhotoRemoving(false);
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

  const handleResourceCourseChange = async (event) => {
    const value = event.target.value.toUpperCase();
    setResourceForm((current) => ({ ...current, course: value }));

    if (value.length < 1 || value.length > 15) {
      setResourceSuggestions([]);
      return;
    }

    setResourceCourseLoading(true);
    try {
      const response = await api.get(`/api/lookLike/courseLookLike/${encodeURIComponent(value)}`);
      const suggestions = response.data?.rows?.map((row) => row.code) ?? [];
      setResourceSuggestions(suggestions);
    } catch {
      setResourceSuggestions([]);
    } finally {
      setResourceCourseLoading(false);
    }
  };

  const handleResourceInputChange = (event) => {
    const { name, value } = event.target;
    setResourceForm((current) => ({ ...current, [name]: value }));
  };

  const handleSemesterResourceInputChange = (event) => {
    const { name, value } = event.target;
    setSemesterResourceForm((current) => ({ ...current, [name]: value }));
  };

  const toggleSemesterCourse = (courseCode) => {
    setSelectedSemesterCourses((current) =>
      current.includes(courseCode)
        ? current.filter((selectedCode) => selectedCode !== courseCode)
        : [...current, courseCode],
    );
  };

  const selectAllSemesterCourses = () => {
    setSelectedSemesterCourses(semesterCourses.map((courseItem) => courseItem.code));
  };

  const clearSemesterCourses = () => {
    setSelectedSemesterCourses([]);
  };

  const handleResourceSubmit = async (event) => {
    event.preventDefault();

    if (resourceCount.total >= resourceCount.limit) {
      setNotice({
        type: "error",
        text: `You can submit at most ${resourceCount.limit} resources for the same course.`,
      });
      return;
    }

    setResourceSubmitting(true);
    setNotice(null);

    try {
      const response = await api.post("/api/resources", {
        course: resourceForm.course,
        links: resourceForm.links,
      });

      setResourceForm((current) => ({
        ...emptyResourceForm,
        course: current.course,
      }));
      setResourceCount((current) => ({
        ...current,
        total: current.total + 1,
        remaining: response.data?.remaining ?? Math.max(current.remaining - 1, 0),
      }));
      setResourceRefreshKey((current) => current + 1);
      setNotice({ type: "success", text: "Resource submitted successfully." });
    } catch (resourceError) {
      setNotice({ type: "error", text: getResourceSubmitError(resourceError) });
    } finally {
      setResourceSubmitting(false);
    }
  };

  const handleSemesterResourceSubmit = async (event) => {
    event.preventDefault();
    setSemesterNotice(null);

    if (!semesterResourceForm.semester) {
      setSemesterNotice({ type: "error", text: "Choose a semester first." });
      return;
    }

    if (selectedSemesterCourses.length === 0) {
      setSemesterNotice({ type: "error", text: "Select at least one course covered by the link." });
      return;
    }

    setSemesterResourceSubmitting(true);

    try {
      const response = await api.post("/api/resources/semester", {
        semester: semesterResourceForm.semester,
        links: semesterResourceForm.links,
        courses: selectedSemesterCourses,
      });
      const addedCount = response.data?.total ?? selectedSemesterCourses.length;

      setSemesterResourceForm((current) => ({ ...current, links: "" }));
      setSelectedSemesterCourses([]);
      setResourceRefreshKey((current) => current + 1);
      setResourceCountRefreshKey((current) => current + 1);
      setSemesterNotice({
        type: "success",
        text: `${addedCount} course resource${addedCount === 1 ? "" : "s"} added successfully.`,
      });
    } catch (semesterError) {
      setSemesterNotice({ type: "error", text: getSemesterResourceError(semesterError) });
    } finally {
      setSemesterResourceSubmitting(false);
    }
  };

  const handleManagedResourceChange = () => {
    setResourceRefreshKey((current) => current + 1);
    setResourceCountRefreshKey((current) => current + 1);
  };

  const handleResourceEntryModeChange = (mode) => {
    setResourceEntryMode(mode);
    setNotice(null);
    setSemesterNotice(null);
  };

  const handleSubmissionFormChange = (field, value) => {
    setSubmissionForm((current) => ({
      ...current,
      [field]: field === "description" ? value.slice(0, 200) : value,
    }));
    setSubmissionNotice(null);
  };

  const handleSubmissionSubmit = async (event) => {
    event.preventDefault();
    const description = submissionForm.description.trim();

    if (!description) {
      setSubmissionNotice({ type: "error", text: "Description is required." });
      return;
    }

    if (description.length > 200) {
      setSubmissionNotice({ type: "error", text: "Description must be 200 characters or fewer." });
      return;
    }

    setSubmissionSubmitting(true);
    setSubmissionNotice(null);

    try {
      await api.post("/api/submissions", {
        type: submissionForm.type,
        description,
      });
      setSubmissionForm((current) => ({ ...current, description: "" }));
      setSubmissionNotice({ type: "success", text: "Your submission was sent." });
      await fetchMySubmissions(1);
    } catch (submissionError) {
      setSubmissionNotice({ type: "error", text: getSubmissionError(submissionError) });
    } finally {
      setSubmissionSubmitting(false);
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

        <section
          className="mt-6 grid gap-4"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(max(180px, calc((100% - 5rem) / 6)), 1fr))",
          }}
        >
          {profileNavigation.map((item) => (
            <ProfileNavCard
              key={item.key}
              item={item}
              active={activeProfileSection === item.key}
              onSelect={() => handleProfileSectionSelect(item.key)}
            />
          ))}
        </section>

        {loading ? (
          <LoadingState label="Loading profile..." />
        ) : (
          <section className="mt-8">
            <div className="space-y-8">
              {activeProfileSection === "details" && (
                <section className="surface-card overflow-hidden">
                  <div className="grid gap-5 border-b border-slate-200 p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center dark:border-slate-800">
                    <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-3xl font-black text-white ring-1 ring-slate-200 dark:bg-white dark:text-slate-950 dark:ring-slate-800">
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
                      <p className="section-kicker">Student profile</p>
                      <h2 className="safe-text mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        {currentProfile?.name || "Student"}
                      </h2>
                      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <ProfileInfoPill label="ID" value={currentProfile?.id} />
                        <ProfileInfoPill label="Section" value={currentProfile?.sec} />
                        <ProfileInfoPill label="Email" value={currentProfile?.email} />
                        <ProfileInfoPill label="Phone" value={currentProfile?.phone} />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:w-56 lg:grid-cols-1">
                      <label className="btn-secondary cursor-pointer">
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
                        className="btn-primary"
                      >
                        {photoLoading ? "Uploading..." : "Upload image"}
                      </button>
                      <button
                        type="button"
                        onClick={handlePhotoRemove}
                        disabled={photoRemoving || !currentProfile?.profilePic}
                        className="btn-danger"
                      >
                        <FiTrash2 aria-hidden="true" />
                        {photoRemoving ? "Removing..." : "Remove image"}
                      </button>
                    </div>

                    {previewUrl && (
                      <div className="lg:col-start-2 lg:col-span-2">
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
                  <div className="p-5">
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
                          <FormField
                            id="sec"
                            label="Section"
                            helper={sectionLoading ? "Searching sections..." : "Start typing to see matching sections."}
                          >
                            <div className="relative">
                              <input
                                id="sec"
                                type="text"
                                name="sec"
                                value={editData.sec}
                                onChange={handleSectionChange}
                                className="form-field uppercase"
                                autoComplete="off"
                              />
                              <SuggestionList
                                suggestions={sectionSuggestions}
                                onSelect={chooseSectionSuggestion}
                              />
                            </div>
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
                  </div>
                </section>
              )}

              {activeProfileSection === "resources" && (
              <>
              <section className="surface-card p-5">
                <SectionHeading
                  kicker="Resources"
                  title="Add resources"
                  description="Choose whether this link belongs to one course or multiple courses in a semester."
                />

                <div
                  className="mt-6 grid rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2"
                  role="tablist"
                  aria-label="Resource entry mode"
                >
                  {resourceEntryModes.map((mode) => {
                    const active = resourceEntryMode === mode.key;
                    return (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => handleResourceEntryModeChange(mode.key)}
                        className={`rounded-md px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          active
                            ? "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-200"
                            : "text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        }`}
                        role="tab"
                        aria-selected={active}
                      >
                        <span className="block text-sm font-black">{mode.label}</span>
                        <span className="mt-1 block text-xs font-medium leading-5">
                          {mode.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {resourceEntryMode === "course" && (
              <section className="surface-card p-5">
                <SectionHeading
                  kicker="Course-wise"
                  title="Add resource to one course"
                  description="Search a course code, paste the link, and submit it for that course."
                />

                <form onSubmit={handleResourceSubmit} className="mt-6 grid gap-5">
                  <FormField
                    id="resource-course"
                    label="Course code"
                    helper={
                      resourceCourseLoading
                        ? "Loading course suggestions..."
                        : resourceCountLoading
                          ? "Checking your submissions..."
                          : resourceForm.course
                            ? `${resourceCount.remaining} submission${resourceCount.remaining === 1 ? "" : "s"} remaining for this course`
                            : "Example: CSE-1121"
                    }
                  >
                    <div className="relative">
                      <FiSearch
                        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        id="resource-course"
                        name="course"
                        value={resourceForm.course}
                        onChange={handleResourceCourseChange}
                        className="form-field pl-12 uppercase"
                        placeholder="Search course"
                        autoComplete="off"
                        required
                      />
                      <SuggestionList
                        suggestions={resourceSuggestions}
                        onSelect={(courseCode) => {
                          setResourceForm((current) => ({ ...current, course: courseCode }));
                          setResourceSuggestions([]);
                        }}
                      />
                    </div>
                  </FormField>

                  <FormField id="resource-link" label="Resource link">
                    <div className="relative">
                      <FiExternalLink
                        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        id="resource-link"
                        name="links"
                        value={resourceForm.links}
                        onChange={handleResourceInputChange}
                        className="form-field pl-12"
                        placeholder="https://drive.google.com/..."
                        type="url"
                        required
                      />
                    </div>
                  </FormField>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        resourceSubmitting ||
                        resourceCountLoading ||
                        resourceCount.total >= resourceCount.limit
                      }
                      className="btn-primary"
                    >
                      <FiPlus aria-hidden="true" />
                      {resourceSubmitting ? "Submitting..." : "Add resource"}
                    </button>
                  </div>
                </form>
              </section>
              )}

              {resourceEntryMode === "semester" && (
              <section className="surface-card p-5">
                <SectionHeading
                  kicker="Semester-wise"
                  title="Add one link to multiple courses"
                  description="Choose a semester, confirm the covered courses, and submit the same resource link for each selected course."
                />

                {semesterNotice && (
                  <div className="mt-5">
                    <Notice type={semesterNotice.type} onDismiss={() => setSemesterNotice(null)}>
                      {semesterNotice.text}
                    </Notice>
                  </div>
                )}

                <form onSubmit={handleSemesterResourceSubmit} className="mt-6 grid gap-5">
                  <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                    <FormField id="semester-resource-semester" label="Semester">
                      <select
                        id="semester-resource-semester"
                        name="semester"
                        value={semesterResourceForm.semester}
                        onChange={handleSemesterResourceInputChange}
                        className="form-field"
                        required
                      >
                        <option value="">Select semester</option>
                        {semesterOptions.map((semester) => (
                          <option key={semester} value={semester}>
                            Semester {semester}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField id="semester-resource-link" label="Resource link">
                      <div className="relative">
                        <FiExternalLink
                          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id="semester-resource-link"
                          name="links"
                          value={semesterResourceForm.links}
                          onChange={handleSemesterResourceInputChange}
                          className="form-field pl-12"
                          placeholder="https://drive.google.com/..."
                          type="url"
                          required
                        />
                      </div>
                    </FormField>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-950 dark:text-white">
                          Covered courses
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {semesterCoursesLoading
                            ? "Loading courses..."
                            : semesterResourceForm.semester
                              ? `${selectedSemesterCourses.length} of ${semesterCourses.length} selected`
                              : "Select a semester to load courses"}
                        </p>
                      </div>
                      {semesterCourses.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={selectAllSemesterCourses} className="btn-secondary">
                            Select all
                          </button>
                          <button type="button" onClick={clearSemesterCourses} className="btn-secondary">
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      {semesterCoursesLoading ? (
                        <div className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          Loading semester courses...
                        </div>
                      ) : semesterCourses.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {semesterCourses.map((courseItem) => {
                            const checked = selectedSemesterCourses.includes(courseItem.code);
                            return (
                              <label
                                key={courseItem.code}
                                className={`flex min-h-24 cursor-pointer gap-3 rounded-lg border p-4 transition ${
                                  checked
                                    ? "border-blue-400 bg-blue-50 text-blue-950 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-100"
                                    : "border-slate-200 bg-white text-slate-900 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSemesterCourse(courseItem.code)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="min-w-0">
                                  <span className="safe-text block text-base font-black">
                                    {courseItem.code}
                                  </span>
                                  <span className="safe-text mt-1 block text-sm text-slate-600 dark:text-slate-300">
                                    {courseItem.title || courseItem.short_name || "Course"}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          No courses loaded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        semesterResourceSubmitting ||
                        semesterCoursesLoading ||
                        selectedSemesterCourses.length === 0
                      }
                      className="btn-primary"
                    >
                      <FiPlus aria-hidden="true" />
                      {semesterResourceSubmitting ? "Adding..." : "Add semester resource"}
                    </button>
                  </div>
                </form>
              </section>
              )}

              <section className="surface-card p-5">
                <ResourceBrowser
                  title="My submitted resources"
                  description="Review the course links you have shared."
                  mine
                  framed={false}
                  limit={6}
                  refreshKey={resourceRefreshKey}
                  manageable
                  onManagedChange={handleManagedResourceChange}
                />
              </section>
              </>
              )}

              {activeProfileSection === "applications" && (
                <ApplicationsFeedbackSection
                  form={submissionForm}
                  submissions={submissions}
                  loading={submissionsLoading}
                  submitting={submissionSubmitting}
                  notice={submissionNotice}
                  pagination={submissionPagination}
                  onFormChange={handleSubmissionFormChange}
                  onSubmit={handleSubmissionSubmit}
                  onRefresh={() => fetchMySubmissions(submissionPagination.page)}
                  onNoticeDismiss={() => setSubmissionNotice(null)}
                  onPageChange={fetchMySubmissions}
                />
              )}

              {activeProfileSection === "settings" && (
              <section className="surface-card p-5">
                <SectionHeading
                  kicker="Settings"
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
              )}
            </div>
          </section>
        )}
      </PageShell>

      {pendingProfileUpdate && (
        <SectionChangeWarningModal
          currentSection={currentProfile?.sec}
          nextSection={pendingProfileUpdate.sec}
          currentRole={currentProfile?.type}
          accepted={sectionWarningAccepted}
          submitting={updating}
          onAcceptedChange={setSectionWarningAccepted}
          onConfirm={confirmSectionUpdate}
          onCancel={cancelSectionUpdate}
        />
      )}
    </div>
  );
}

function SectionChangeWarningModal({
  currentSection,
  nextSection,
  currentRole,
  accepted,
  submitting,
  onAcceptedChange,
  onConfirm,
  onCancel,
}) {
  const isCurrentCr = String(currentRole || "").toLowerCase() === "cr";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <section className="surface-card w-full max-w-xl overflow-hidden">
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                <FiAlertTriangle className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black uppercase">Section change warning</p>
                <h2 className="mt-1 text-2xl font-black">Confirm before updating</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-2 text-amber-700 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-amber-200 dark:hover:bg-amber-500/15"
              aria-label="Cancel section change"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid gap-5 px-6 py-6">
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
            You are changing your section from{" "}
            <strong>{currentSection || "current section"}</strong> to{" "}
            <strong>{nextSection || "new section"}</strong>.
          </p>
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            {isCurrentCr
              ? "You currently have the CR role. Changing section will automatically change your role to student."
              : "If your account currently has the CR role, changing section will automatically change your role to student."}
            <span className="mt-2 block">
              After that, you must apply for CR again if you want the role back.
            </span>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => onAcceptedChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
            />
            <span>
              I understand that changing my section will set my account type to student, and I will need to apply again for CR access.
            </span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!accepted || submitting}
              className="btn-danger"
            >
              {submitting ? "Updating..." : "Confirm section change"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileNavCard({ item, active, onSelect }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`interactive-card group p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        active ? "border-blue-400 bg-blue-50/80 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-500/10" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <FiChevronRight
          className="h-5 w-5 text-slate-400 transition group-hover:text-blue-600 dark:group-hover:text-blue-300"
          aria-hidden="true"
        />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">{item.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {item.description}
      </p>
    </button>
  );
}

function ProfileInfoPill({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="safe-text mt-1 text-sm font-bold text-slate-950 dark:text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function ApplicationsFeedbackSection({
  form,
  submissions,
  loading,
  submitting,
  notice,
  pagination,
  onFormChange,
  onSubmit,
  onRefresh,
  onNoticeDismiss,
  onPageChange,
}) {
  return (
    <>
      <section className="surface-card p-5">
        <SectionHeading
          kicker="Applications & Feedback"
          title="Send a Submission"
          description="Apply for CR or send feedback, suggestions, complaints, and requests to the admin team."
        />

        {notice && (
          <div className="mt-5">
            <Notice type={notice.type} onDismiss={onNoticeDismiss}>
              {notice.text}
            </Notice>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 grid gap-5">
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <FormField id="submission-type" label="Submission type">
              <select
                id="submission-type"
                value={form.type}
                onChange={(event) => onFormChange("type", event.target.value)}
                className="form-field"
              >
                {submissionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "CR" ? "CR application" : type}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="submission-description"
              label="Description"
              helper={`${form.description.length}/200 characters`}
            >
              <textarea
                id="submission-description"
                value={form.description}
                onChange={(event) => onFormChange("description", event.target.value)}
                maxLength={200}
                className="form-field min-h-28 resize-y"
                placeholder="Write your message..."
                required
              />
            </FormField>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary">
              <FiSend aria-hidden="true" />
              {submitting ? "Sending..." : "Submit"}
            </button>
          </div>
        </form>
      </section>

      <section className="table-shell">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="section-kicker">Tracking</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              My submissions
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {pagination.total} submission{pagination.total === 1 ? "" : "s"} found
            </p>
          </div>
          <button type="button" onClick={onRefresh} className="btn-secondary" disabled={loading}>
            <FiSearch aria-hidden="true" />
            Refresh
          </button>
        </div>

        {loading ? (
          <LoadingState label="Loading submissions..." />
        ) : submissions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            No submissions yet.
          </div>
        ) : (
          <div className="grid gap-4 p-5">
            {submissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-pill border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                        {submission.type}
                      </span>
                      <SubmissionStatus resolved={submission.resolved} />
                    </div>
                    <p className="mt-3 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {submission.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {formatSubmissionDate(submission.createdAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        <SubmissionPagination
          pagination={pagination}
          disabled={loading}
          onPageChange={onPageChange}
        />
      </section>
    </>
  );
}

function SubmissionStatus({ resolved }) {
  return (
    <span
      className={
        resolved
          ? "status-pill border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
          : "status-pill border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
      }
    >
      {resolved ? "Resolved" : "Pending"}
    </span>
  );
}

function SubmissionPagination({ pagination, disabled, onPageChange }) {
  const page = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <p className="font-semibold text-slate-600 dark:text-slate-300">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className="btn-secondary"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className="btn-secondary"
        >
          Next
        </button>
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
  if (status === 409) return error.response?.data?.message || "Confirm the section change first.";
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

function getResourceSubmitError(error) {
  const status = error.response?.status;
  if (status === 400) return error.response?.data?.message || "Please check the resource details.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 404) return "Course not found.";
  if (status === 409) return error.response?.data?.message || "You reached the resource limit for this course.";
  if (status === 500) return "Internal server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not submit resource.";
}

function getSemesterResourceError(error) {
  const status = error.response?.status;
  if (status === 409) {
    const blockedCourses = error.response?.data?.blockedCourses ?? [];
    const courseList = blockedCourses.map((courseItem) => courseItem.course).join(", ");
    return `${error.response?.data?.message || "Some courses reached the resource limit."}${
      courseList ? ` Limit reached for: ${courseList}.` : ""
    }`;
  }

  return getResourceSubmitError(error);
}

function formatSubmissionDate(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSubmissionError(error) {
  const status = error.response?.status;
  if (status === 400) return error.response?.data?.message || "Please check your submission.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Internal server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not process submission.";
}

export default EditDetails;
