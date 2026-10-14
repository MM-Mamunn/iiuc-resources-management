import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiAward,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCpu,
  FiEdit3,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiGlobe,
  FiImage,
  FiLink,
  FiMessageSquare,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiShield,
  FiUploadCloud,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import api from "../../api";
import campusImage from "../../assets/iiuc.webp";
import { useActiveSession, useAuth, useFeatureSettings } from "../../App";
import {
  fetchAdminAnnouncement,
  saveAdminAnnouncement,
  updateAdminAnnouncementVisibility,
} from "../../services/announcementService";
import {
  createSession,
  listSessions,
  updateSession,
} from "../../services/sessionService";
import {
  fetchAiFeatureSetting,
  updateAiFeatureSetting,
} from "../../services/settingsService";
import {
  emptySponsorSocialLinks,
  fetchAdminSponsor,
  saveAdminSponsor,
  updateSponsorFeatureSetting,
} from "../../services/sponsorService";
import {
  isValidPeriodRange,
  listPeriods,
  updatePeriod,
} from "../../services/periodService";
import { fetchLatestAiQueryLogs } from "../../services/adminService";
import Header from "../components/Header";
import {
  SPONSOR_SOCIAL_CONFIG,
  SponsorLogoPlate,
  SponsorSocialLinks,
} from "../components/SponsorDisplay";
import {
  EmptyState,
  FormField,
  LoadingState,
  MetricCard,
  Notice,
  PageShell,
  SectionHeading,
  cx,
} from "../components/ui";

const VALID_ROLES = ["ADMIN", "cr", "student"];
const CR_PAGE_SIZE = 8;
const DEFAULT_CR_PAGINATION = {
  page: 1,
  limit: CR_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};
const SUBMISSION_PAGE_SIZE = 8;
const DEFAULT_SUBMISSION_PAGINATION = {
  page: 1,
  limit: SUBMISSION_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};
const PASSWORD_CHANGE_TYPE = "password change";
const SUBMISSION_TYPES = ["CR", "Feedback", "Suggestion", "Complaint", "Request", PASSWORD_CHANGE_TYPE];
const emptySessionForm = {
  session: "",
  start: "",
  stop: "",
  isActive: true,
};
const emptyAnnouncementForm = {
  title: "",
  description: "",
  link: "",
};
const emptySponsorForm = {
  name: "",
  description: "",
  websiteUrl: "",
  contactInfo: "",
  socialLinks: emptySponsorSocialLinks,
};

/**
 * Admin-only role and session management workspace.
 */
const AdminRoles = () => {
  const { user, isLoggedIn } = useAuth();
  const { refreshActiveSession } = useActiveSession();
  const { setAiFeatureEnabled, refreshFeatureSettings } = useFeatureSettings();
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState("loginLogs");
  const [crUsers, setCrUsers] = useState([]);
  const [crPagination, setCrPagination] = useState(DEFAULT_CR_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [customId, setCustomId] = useState("");
  const [customType, setCustomType] = useState("student");
  const [roleSuggestions, setRoleSuggestions] = useState([]);
  const [roleSearchLoading, setRoleSearchLoading] = useState(false);
  const [selectedRoleStudent, setSelectedRoleStudent] = useState(null);
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [roleUpdateMessage, setRoleUpdateMessage] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogsLoading, setLoginLogsLoading] = useState(false);
  const [aiQueryLogs, setAiQueryLogs] = useState([]);
  const [aiQueryLogsLoading, setAiQueryLogsLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionPagination, setSubmissionPagination] = useState(DEFAULT_SUBMISSION_PAGINATION);
  const [submissionFilters, setSubmissionFilters] = useState({
    type: "",
    viewed: "",
    resolved: "",
  });
  const [unviewedSubmissionCount, setUnviewedSubmissionCount] = useState(0);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState(null);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [periods, setPeriods] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodSavingKey, setPeriodSavingKey] = useState("");
  const [announcement, setAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm);
  const [announcementImageFile, setAnnouncementImageFile] = useState(null);
  const [announcementPreview, setAnnouncementPreview] = useState("");
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementVisibilitySaving, setAnnouncementVisibilitySaving] = useState(false);
  const [sponsor, setSponsor] = useState(null);
  const [sponsorForm, setSponsorForm] = useState(emptySponsorForm);
  const [sponsorLogoFile, setSponsorLogoFile] = useState(null);
  const [sponsorLogoPreview, setSponsorLogoPreview] = useState("");
  const [sponsorLogoBackground, setSponsorLogoBackground] = useState("black");
  const [sponsorFeatureEnabledDraft, setSponsorFeatureEnabledDraft] = useState(false);
  const [sponsorLoading, setSponsorLoading] = useState(false);
  const [sponsorSaving, setSponsorSaving] = useState(false);
  const [sponsorVisibilitySaving, setSponsorVisibilitySaving] = useState(false);
  const [aiFeatureEnabledDraft, setAiFeatureEnabledDraft] = useState(false);
  const [aiFeatureLoading, setAiFeatureLoading] = useState(false);
  const [aiFeatureSaving, setAiFeatureSaving] = useState(false);

  const fetchCrUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.get("/api/admin/cr-users", {
        params: { page, limit: CR_PAGE_SIZE },
      });
      const rows = response.data?.rows || [];
      const pagination = response.data?.pagination || {
        page,
        limit: CR_PAGE_SIZE,
        total: rows.length,
        totalPages: Math.max(Math.ceil(rows.length / CR_PAGE_SIZE), 1),
      };

      if (rows.length === 0 && pagination.total > 0 && page > 1) {
        await fetchCrUsers(page - 1);
        return;
      }

      setCrUsers(rows);
      setCrPagination(pagination);
    } catch (roleError) {
      setCrUsers([]);
      setCrPagination(DEFAULT_CR_PAGINATION);
      setMessage({
        type: "error",
        text: roleError.response?.data?.msg || "Failed to load CR users.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      setSessions(await listSessions());
    } catch (sessionError) {
      setMessage({
        type: "error",
        text: sessionError.response?.data?.msg || "Failed to load sessions.",
      });
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchLoginLogs = useCallback(async () => {
    setLoginLogsLoading(true);
    try {
      const response = await api.get("/api/admin/login-logs");
      setLoginLogs(response.data?.rows || []);
    } catch (loginLogError) {
      setLoginLogs([]);
      setMessage({
        type: "error",
        text: loginLogError.response?.data?.msg || "Failed to load login history.",
      });
    } finally {
      setLoginLogsLoading(false);
    }
  }, []);

  const fetchPeriods = useCallback(async () => {
    setPeriodsLoading(true);
    try {
      setPeriods(await listPeriods());
    } catch (periodError) {
      setPeriods([]);
      setMessage({
        type: "error",
        text: periodError.response?.data?.message || periodError.response?.data?.msg || "Failed to load periods.",
      });
    } finally {
      setPeriodsLoading(false);
    }
  }, []);

  const fetchAnnouncement = useCallback(async () => {
    setAnnouncementLoading(true);
    try {
      const row = await fetchAdminAnnouncement();
      setAnnouncement(row);
      setAnnouncementForm({
        title: row?.title || "",
        description: row?.description || "",
        link: row?.link || "",
      });
      setAnnouncementImageFile(null);
      setAnnouncementPreview(row?.image || "");
    } catch (announcementError) {
      setAnnouncement(null);
      setAnnouncementForm(emptyAnnouncementForm);
      setAnnouncementImageFile(null);
      setAnnouncementPreview("");
      setMessage({
        type: "error",
        text:
          announcementError.response?.data?.message ||
          announcementError.response?.data?.msg ||
          "Failed to load announcement.",
      });
    } finally {
      setAnnouncementLoading(false);
    }
  }, []);

  const fetchAiQueryLogs = useCallback(async () => {
    setAiQueryLogsLoading(true);
    try {
      setAiQueryLogs(await fetchLatestAiQueryLogs());
    } catch (aiQueryLogError) {
      setAiQueryLogs([]);
      setMessage({
        type: "error",
        text: aiQueryLogError.response?.data?.msg || "Failed to load AI query logs.",
      });
    } finally {
      setAiQueryLogsLoading(false);
    }
  }, []);

  const fetchSponsor = useCallback(async () => {
    setSponsorLoading(true);
    try {
      const data = await fetchAdminSponsor();
      setSponsor(data.sponsor);
      setSponsorFeatureEnabledDraft(Boolean(data.sponsorFeatureEnabled));
      setSponsorForm(getSponsorFormFromRow(data.sponsor));
      setSponsorLogoFile(null);
      setSponsorLogoPreview(data.sponsor?.logo || "");
    } catch (sponsorError) {
      setSponsor(null);
      setSponsorForm(getSponsorFormFromRow(null));
      setSponsorLogoFile(null);
      setSponsorLogoPreview("");
      setMessage({
        type: "error",
        text:
          sponsorError.response?.data?.message ||
          sponsorError.response?.data?.msg ||
          "Failed to load sponsor.",
      });
    } finally {
      setSponsorLoading(false);
    }
  }, []);

  const fetchAiFeature = useCallback(async () => {
    setAiFeatureLoading(true);
    try {
      const setting = await fetchAiFeatureSetting();
      setAiFeatureEnabledDraft(Boolean(setting.aiFeatureEnabled));
      setAiFeatureEnabled(Boolean(setting.aiFeatureEnabled));
    } catch (aiFeatureError) {
      setMessage({
        type: "error",
        text:
          aiFeatureError.response?.data?.message ||
          aiFeatureError.response?.data?.msg ||
          "Failed to load AI feature setting.",
      });
    } finally {
      setAiFeatureLoading(false);
    }
  }, [setAiFeatureEnabled]);

  const fetchSubmissionNotifications = useCallback(async () => {
    try {
      const response = await api.get("/api/admin/submissions/unviewed-count");
      setUnviewedSubmissionCount(response.data?.total ?? 0);
    } catch {
      setUnviewedSubmissionCount(0);
    }
  }, []);

  const fetchAdminSubmissions = useCallback(async (page = 1, filters = submissionFilters) => {
    setSubmissionsLoading(true);

    try {
      const response = await api.get("/api/admin/submissions", {
        params: {
          page,
          limit: SUBMISSION_PAGE_SIZE,
          type: filters.type,
          viewed: filters.viewed,
          resolved: filters.resolved,
        },
      });
      const rows = response.data?.rows || [];
      const pagination = response.data?.pagination || {
        page,
        limit: SUBMISSION_PAGE_SIZE,
        total: rows.length,
        totalPages: Math.max(Math.ceil(rows.length / SUBMISSION_PAGE_SIZE), 1),
      };

      if (rows.length === 0 && pagination.total > 0 && page > 1) {
        await fetchAdminSubmissions(page - 1, filters);
        return;
      }

      setSubmissions(rows);
      setSubmissionPagination(pagination);
    } catch (submissionError) {
      setSubmissions([]);
      setSubmissionPagination(DEFAULT_SUBMISSION_PAGINATION);
      setMessage({
        type: "error",
        text: submissionError.response?.data?.msg || "Failed to load submissions.",
      });
    } finally {
      setSubmissionsLoading(false);
    }
  }, [submissionFilters]);

  const refreshAdminData = useCallback(async () => {
    await Promise.all([
      fetchCrUsers(1),
      fetchSessions(),
      fetchLoginLogs(),
      fetchAiQueryLogs(),
      fetchPeriods(),
      fetchAnnouncement(),
      fetchSponsor(),
      fetchAiFeature(),
      fetchSubmissionNotifications(),
    ]);
  }, [fetchAiFeature, fetchAiQueryLogs, fetchAnnouncement, fetchCrUsers, fetchLoginLogs, fetchPeriods, fetchSessions, fetchSponsor, fetchSubmissionNotifications]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/auth/login", { replace: true });
      return;
    }

    if (!user) return;

    if (String(user.type || "").toUpperCase() !== "ADMIN") {
      setMessage({
        type: "error",
        text: "You are not authorized to access this page.",
      });
      return;
    }

    refreshAdminData();
  }, [isLoggedIn, navigate, refreshAdminData, user]);

  useEffect(() => {
    if (activeFeature === "submissions") {
      fetchAdminSubmissions(1);
    }
  }, [activeFeature, fetchAdminSubmissions]);

  useEffect(() => () => {
    if (announcementPreview.startsWith("blob:")) {
      URL.revokeObjectURL(announcementPreview);
    }
  }, [announcementPreview]);

  useEffect(() => () => {
    if (sponsorLogoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(sponsorLogoPreview);
    }
  }, [sponsorLogoPreview]);

  useEffect(() => {
    const query = customId.trim();

    if (activeFeature !== "roleUpdate" || query.length < 2) {
      setRoleSuggestions([]);
      setRoleSearchLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setRoleSearchLoading(true);
      try {
        const response = await api.get("/api/admin/users/search", {
          params: { search: query, limit: 8 },
        });

        if (!cancelled) {
          setRoleSuggestions(response.data?.rows || []);
        }
      } catch {
        if (!cancelled) {
          setRoleSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setRoleSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeFeature, customId]);

  const openCommunityProfile = useCallback((studentId) => {
    const profileId = String(studentId || "").trim();

    if (!profileId) {
      navigate("/info/community");
      return;
    }

    navigate(`/info/community?student=${encodeURIComponent(profileId)}`);
  }, [navigate]);

  const handleRoleSearchChange = (value) => {
    setCustomId(value);
    setSelectedRoleStudent(null);
    setRoleUpdateMessage(null);
  };

  const handleRoleSuggestionSelect = (studentRecord) => {
    setSelectedRoleStudent(studentRecord);
    setCustomId(studentRecord.id || "");
    setRoleSuggestions([]);
    setMessage(null);
    setRoleUpdateMessage(null);
  };

  const createRoleFeedback = (type, text) => ({
    id: `${Date.now()}-${Math.random()}`,
    type,
    text,
  });

  const showRoleFeedback = (feedback, { scoped = false } = {}) => {
    if (scoped) {
      setRoleUpdateMessage(feedback);
      return;
    }

    setMessage(feedback);
  };

  const updateRole = async (studentId, role, { scopedFeedback = false } = {}) => {
    const normalizedId = String(studentId || "").trim().toUpperCase();

    if (!normalizedId) {
      showRoleFeedback(
        createRoleFeedback("error", "Please choose a student before updating the role."),
        { scoped: scopedFeedback },
      );
      return null;
    }

    if (scopedFeedback) {
      setRoleUpdateMessage(null);
    } else {
      setMessage(null);
    }
    setRoleUpdating(true);
    try {
      const response = await api.put(`/api/admin/users/${normalizedId}/type`, {
        type: role,
      });
      showRoleFeedback(
        createRoleFeedback(
          "success",
          `Role updated: ${response.data.name || normalizedId} (${response.data.id || normalizedId}) is now ${response.data.type || role}.`,
        ),
        { scoped: scopedFeedback },
      );
      await fetchCrUsers(crPagination.page);
      return response.data;
    } catch (roleError) {
      showRoleFeedback(
        createRoleFeedback("error", getRoleUpdateError(roleError, normalizedId)),
        { scoped: scopedFeedback },
      );
      return null;
    } finally {
      setRoleUpdating(false);
    }
  };

  const handleCustomUpdate = async (event) => {
    event.preventDefault();
    if (!customId.trim()) {
      setRoleUpdateMessage(
        createRoleFeedback("error", "Search by student name or ID before updating the role."),
      );
      return;
    }

    const exactSuggestion = roleSuggestions.find((studentRecord) =>
      [studentRecord.id, studentRecord.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase() === customId.trim().toLowerCase()),
    );
    const targetStudent = selectedRoleStudent || exactSuggestion;
    const targetId = targetStudent?.id || customId.trim();

    if (!targetStudent && roleSuggestions.length > 0) {
      setRoleUpdateMessage(
        createRoleFeedback(
          "error",
          "Choose one of the matching student suggestions before updating this role.",
        ),
      );
      return;
    }

    const updatedStudent = await updateRole(targetId, customType, { scopedFeedback: true });

    if (updatedStudent) {
      setSelectedRoleStudent(updatedStudent);
      setCustomId(updatedStudent.id || targetId);
      setRoleSuggestions([]);
    }
  };

  const handleSubmissionFilterChange = async (field, value) => {
    const nextFilters = { ...submissionFilters, [field]: value };
    setSubmissionFilters(nextFilters);
    await fetchAdminSubmissions(1, nextFilters);
  };

  const clearSubmissionFilters = async () => {
    const nextFilters = { type: "", viewed: "", resolved: "" };
    setSubmissionFilters(nextFilters);
    await fetchAdminSubmissions(1, nextFilters);
  };

  const updateSubmissionStatus = async (submissionId, updates, { quiet = false } = {}) => {
    try {
      const response = await api.patch(`/api/admin/submissions/${submissionId}`, updates);
      await Promise.all([
        fetchAdminSubmissions(submissionPagination.page),
        fetchSubmissionNotifications(),
      ]);

      if (!quiet) {
        setMessage({
          type: "success",
          text: response.data?.passwordApplied
            ? "Password change approved and applied."
            : "Submission updated.",
        });
      }
    } catch (submissionError) {
      setMessage({
        type: "error",
        text: submissionError.response?.data?.msg || "Failed to update submission.",
      });
    }
  };

  const openSubmission = async (submission) => {
    setExpandedSubmissionId((current) => (current === submission.id ? null : submission.id));

    if (!submission.view) {
      await updateSubmissionStatus(submission.id, { view: true }, { quiet: true });
    }
  };

  const updateSessionForm = (field, value) => {
    setSessionForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "isActive" && value ? { stop: "" } : {}),
    }));
  };

  const resetSessionForm = () => {
    setEditingSession(null);
    setSessionForm(emptySessionForm);
  };

  const beginEditSession = (sessionItem) => {
    setEditingSession(sessionItem.session);
    setSessionForm({
      session: sessionItem.session,
      start: sessionItem.start || "",
      stop: sessionItem.stop || "",
      isActive: sessionItem.stop === null,
    });
    setActiveFeature("sessions");
  };

  const handleSessionSubmit = async (event) => {
    event.preventDefault();

    if (!sessionForm.session.trim()) {
      setMessage({ type: "error", text: "Session name is required." });
      return;
    }

    if (!sessionForm.start) {
      setMessage({ type: "error", text: "Start date is required." });
      return;
    }

    if (!sessionForm.isActive && !sessionForm.stop) {
      setMessage({ type: "error", text: "Stop date is required for a closed session." });
      return;
    }

    setSessionSaving(true);
    setMessage(null);

    const payload = {
      session: sessionForm.session.trim(),
      start: sessionForm.start,
      stop: sessionForm.isActive ? null : sessionForm.stop,
    };

    try {
      const savedSession = editingSession
        ? await updateSession(editingSession, payload)
        : await createSession(payload);

      setMessage({
        type: "success",
        text: `${savedSession.session} was ${editingSession ? "updated" : "created"}.`,
      });
      resetSessionForm();
      await fetchSessions();
      await refreshActiveSession();
    } catch (sessionError) {
      setMessage({
        type: "error",
        text: getSessionError(sessionError),
      });
    } finally {
      setSessionSaving(false);
    }
  };

  const updatePeriodDraft = (targetPeriod, field, value) => {
    setPeriods((current) =>
      current.map((periodItem) =>
        getPeriodKey(periodItem) === getPeriodKey(targetPeriod)
          ? { ...periodItem, [field]: value }
          : periodItem,
      ),
    );
  };

  const handlePeriodSave = async (periodItem) => {
    if (!isValidPeriodRange(periodItem.startTime, periodItem.stopTime)) {
      setMessage({ type: "error", text: "Start time must not be after stop time." });
      return;
    }

    const periodKey = getPeriodKey(periodItem);
    setPeriodSavingKey(periodKey);
    setMessage(null);

    try {
      const savedPeriod = await updatePeriod(periodItem);
      setPeriods((current) =>
        current.map((entry) =>
          getPeriodKey(entry) === periodKey ? savedPeriod : entry,
        ),
      );
      setMessage({
        type: "success",
        text: `${capitalize(savedPeriod.gender)} period ${savedPeriod.no} updated.`,
      });
    } catch (periodError) {
      setMessage({
        type: "error",
        text: periodError.response?.data?.message || periodError.response?.data?.msg || "Failed to update period.",
      });
    } finally {
      setPeriodSavingKey("");
    }
  };

  const updateAnnouncementForm = (field, value) => {
    setAnnouncementForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAnnouncementImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    setAnnouncementImageFile(file);
    setAnnouncementPreview(file ? URL.createObjectURL(file) : announcement?.image || "");
  };

  const handleAnnouncementSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      title: announcementForm.title.trim(),
      description: announcementForm.description.trim(),
      link: announcementForm.link.trim(),
      imageFile: announcementImageFile,
    };

    if (!payload.title || !payload.description || !payload.link) {
      setMessage({
        type: "error",
        text: "Title, description, and action link are required.",
      });
      return;
    }

    if (!announcementPreview && !payload.imageFile) {
      setMessage({ type: "error", text: "Cover image is required." });
      return;
    }

    setAnnouncementSaving(true);
    setMessage(null);

    try {
      const row = await saveAdminAnnouncement(payload);
      setAnnouncement(row);
      setAnnouncementForm({
        title: row?.title || "",
        description: row?.description || "",
        link: row?.link || "",
      });
      setAnnouncementImageFile(null);
      setAnnouncementPreview(row?.image || "");
      setMessage({
        type: "success",
        text: "Announcement updated successfully.",
      });
    } catch (announcementError) {
      setMessage({
        type: "error",
        text:
          announcementError.response?.data?.message ||
          announcementError.response?.data?.msg ||
          "Failed to update announcement.",
      });
    } finally {
      setAnnouncementSaving(false);
    }
  };

  const handleAnnouncementVisibilityToggle = async () => {
    if (!announcement) {
      setMessage({
        type: "error",
        text: "Save announcement content before changing visibility.",
      });
      return;
    }

    const nextVisibility = !announcement.isActive;
    setAnnouncementVisibilitySaving(true);
    setMessage(null);

    try {
      const row = await updateAdminAnnouncementVisibility(nextVisibility);
      setAnnouncement(row);
      setAnnouncementForm({
        title: row?.title || "",
        description: row?.description || "",
        link: row?.link || "",
      });
      setAnnouncementPreview(row?.image || "");
      setAnnouncementImageFile(null);
      setMessage({
        type: "success",
        text: row?.isActive
          ? "Announcement is visible on the dashboard."
          : "Announcement is hidden from the dashboard.",
      });
    } catch (announcementError) {
      setMessage({
        type: "error",
        text:
          announcementError.response?.data?.message ||
          announcementError.response?.data?.msg ||
          "Failed to update announcement visibility.",
      });
    } finally {
      setAnnouncementVisibilitySaving(false);
    }
  };

  const updateSponsorForm = (field, value) => {
    setSponsorForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateSponsorSocialLink = (field, value) => {
    setSponsorForm((current) => ({
      ...current,
      socialLinks: {
        ...current.socialLinks,
        [field]: value,
      },
    }));
  };

  const handleSponsorLogoChange = (event) => {
    const file = event.target.files?.[0] || null;

    setSponsorLogoFile(file);
    setSponsorLogoPreview(file ? URL.createObjectURL(file) : sponsor?.logo || "");
  };

  const handleSponsorSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: sponsorForm.name.trim(),
      description: sponsorForm.description.trim(),
      websiteUrl: sponsorForm.websiteUrl.trim(),
      socialLinks: sponsorForm.socialLinks,
      contactInfo: sponsorForm.contactInfo.trim(),
      logoFile: sponsorLogoFile,
    };

    if (!payload.name || !payload.description) {
      setMessage({
        type: "error",
        text: "Sponsor name and description are required.",
      });
      return;
    }

    if (!sponsorLogoPreview && !payload.logoFile) {
      setMessage({ type: "error", text: "Sponsor logo is required." });
      return;
    }

    setSponsorSaving(true);
    setMessage(null);

    try {
      const row = await saveAdminSponsor(payload);
      setSponsor(row);
      setSponsorForm(getSponsorFormFromRow(row));
      setSponsorLogoFile(null);
      setSponsorLogoPreview(row?.logo || "");
      setMessage({
        type: "success",
        text: "Sponsor updated successfully.",
      });
    } catch (sponsorError) {
      setMessage({
        type: "error",
        text:
          sponsorError.response?.data?.message ||
          sponsorError.response?.data?.msg ||
          "Failed to update sponsor.",
      });
    } finally {
      setSponsorSaving(false);
    }
  };

  const handleSponsorVisibilityToggle = async () => {
    const nextEnabled = !sponsorFeatureEnabledDraft;

    if (nextEnabled && !sponsor) {
      setMessage({
        type: "error",
        text: "Save sponsor content before enabling sponsor display.",
      });
      return;
    }

    setSponsorVisibilitySaving(true);
    setMessage(null);

    try {
      const setting = await updateSponsorFeatureSetting(nextEnabled);
      setSponsorFeatureEnabledDraft(Boolean(setting.sponsorFeatureEnabled));
      setMessage({
        type: "success",
        text: setting.sponsorFeatureEnabled
          ? "Sponsor is now visible across the website."
          : "Sponsor is hidden across the website.",
      });
    } catch (sponsorError) {
      setMessage({
        type: "error",
        text:
          sponsorError.response?.data?.message ||
          sponsorError.response?.data?.msg ||
          "Failed to update sponsor visibility.",
      });
    } finally {
      setSponsorVisibilitySaving(false);
    }
  };

  const handleAiFeatureToggle = async () => {
    const nextEnabled = !aiFeatureEnabledDraft;

    setAiFeatureSaving(true);
    setMessage(null);

    try {
      const setting = await updateAiFeatureSetting(nextEnabled);
      setAiFeatureEnabledDraft(Boolean(setting.aiFeatureEnabled));
      setAiFeatureEnabled(Boolean(setting.aiFeatureEnabled));
      await refreshFeatureSettings();
      setMessage({
        type: "success",
        text: setting.aiFeatureEnabled
          ? "AI feature is now enabled."
          : "AI feature is now disabled.",
      });
    } catch (aiFeatureError) {
      setMessage({
        type: "error",
        text:
          aiFeatureError.response?.data?.message ||
          aiFeatureError.response?.data?.msg ||
          "Failed to update AI feature setting.",
      });
    } finally {
      setAiFeatureSaving(false);
    }
  };

  const features = [
    {
      id: "loginLogs",
      icon: FiClock,
      title: "Latest Logins",
      value: loginLogsLoading ? "..." : loginLogs.length,
      description: "See the latest 10 successful student login records.",
    },
    {
      id: "aiQueryLogs",
      icon: FiMessageSquare,
      title: "AI Query Logs",
      value: aiQueryLogsLoading ? "..." : aiQueryLogs.length,
      description: "Monitor the ten newest AI requests by record ID.",
    },
    {
      id: "submissions",
      icon: FiBell,
      title: `Notifications (${unviewedSubmissionCount})`,
      value: submissionsLoading ? "..." : unviewedSubmissionCount,
      description: "Review applications, feedback, requests, and complaints.",
    },
    {
      id: "sessions",
      icon: FiCalendar,
      title: "Sessions",
      value: sessionsLoading ? "..." : sessions.length,
      description: "Create, close, and activate academic sessions.",
    },
    {
      id: "crUsers",
      icon: FiUsers,
      title: "CR Users",
      value: loading ? "..." : crPagination.total,
      description: "Review CR accounts with paginated controls.",
    },
    {
      id: "periods",
      icon: FiCalendar,
      title: "Periods",
      value: periodsLoading ? "..." : periods.length || 12,
      description: "Edit male and female routine period times.",
    },
    {
      id: "announcement",
      icon: FiImage,
      title: "Announcement",
      value: announcementLoading ? "..." : announcement?.isActive ? "Live" : announcement ? "Hidden" : "Empty",
      description: "Manage the dashboard featured update card.",
    },
    {
      id: "sponsor",
      icon: FiAward,
      title: "Sponsor",
      value: sponsorLoading ? "..." : sponsorFeatureEnabledDraft ? "Enabled" : sponsor ? "Hidden" : "Empty",
      description: "Manage the Supported By content and visibility.",
    },
    {
      id: "aiFeature",
      icon: FiCpu,
      title: "AI Feature",
      value: aiFeatureLoading ? "..." : aiFeatureEnabledDraft ? "Enabled" : "Disabled",
      description: "Control global AI assistant availability.",
    },
    {
      id: "roleUpdate",
      icon: FiShield,
      title: "Role Update",
      value: VALID_ROLES.length,
      description: "Change a user role directly by student ID.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="relative isolate overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 p-6 text-white shadow-2xl sm:p-10 lg:p-12">
          <img
            src={campusImage}
            alt="IIUC Campus"
            className="absolute inset-0 -z-30 h-full w-full object-cover opacity-25 filter blur-[0.5px]"
          />
          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-slate-950/80 via-slate-950/95 to-slate-950" />
          <div
            className="pointer-events-none absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-emerald-600/15 blur-3xl sm:h-96 sm:w-96"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -right-20 -z-10 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl sm:h-96 sm:w-96"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300 shadow-sm backdrop-blur-md">
                <FiShield className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span>IIUC CSE System Governance</span>
              </div>
              <h1 className="display-heading hero-heading-glow mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Administrative Command Center
              </h1>
              <div className="heading-accent-line mt-3 h-0.5 w-20" aria-hidden="true" />
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Manage academic sessions, class representatives, student submissions, AI query audits,
                featured announcements, and system roles from one consolidated operations dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshAdminData}
              className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20 dark:border-white/20 dark:bg-white/10 dark:text-white px-5 py-2.5 text-sm font-semibold shrink-0"
              disabled={loading || sessionsLoading || loginLogsLoading || aiQueryLogsLoading || periodsLoading || announcementLoading || sponsorLoading || aiFeatureLoading || submissionsLoading}
            >
              <FiRefreshCw
                className={loading || sessionsLoading || loginLogsLoading || aiQueryLogsLoading || periodsLoading || announcementLoading || sponsorLoading || aiFeatureLoading || submissionsLoading ? "animate-spin" : ""}
                aria-hidden="true"
              />
              Refresh System Data
            </button>
          </div>
        </section>

        {message && (
          <div className="mt-6">
            <Notice type={message.type} onDismiss={() => setMessage(null)}>
              {message.text}
            </Notice>
          </div>
        )}

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={<FiUsers className="h-5 w-5" aria-hidden="true" />}
            label="CR users"
            value={crPagination.total}
            tone="violet"
          />
          <MetricCard
            icon={<FiBell className="h-5 w-5" aria-hidden="true" />}
            label="Pending Submissions"
            value={unviewedSubmissionCount}
            tone={unviewedSubmissionCount > 0 ? "rose" : "amber"}
          />
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Total Sessions"
            value={sessions.length}
            tone="violet"
          />
          <MetricCard
            icon={<FiUserCheck className="h-5 w-5" aria-hidden="true" />}
            label="Signed in as"
            value={user?.id || "Admin"}
            tone="green"
          />
        </section>

        <FeatureNavigation
          features={features}
          activeFeature={activeFeature}
          onSelect={setActiveFeature}
        />

        <section className="mt-8">
          {activeFeature === "sessions" && (
            <SessionFeature
              sessions={sessions}
              loading={sessionsLoading}
              editingSession={editingSession}
              sessionForm={sessionForm}
              sessionSaving={sessionSaving}
              onRefresh={fetchSessions}
              onEdit={beginEditSession}
              onFormChange={updateSessionForm}
              onReset={resetSessionForm}
              onSubmit={handleSessionSubmit}
            />
          )}

          {activeFeature === "crUsers" && (
            <CrUsersFeature
              crUsers={crUsers}
              loading={loading}
              pagination={crPagination}
              onRefresh={() => fetchCrUsers(crPagination.page)}
              onPageChange={fetchCrUsers}
              onRoleChange={updateRole}
              onOpenProfile={openCommunityProfile}
            />
          )}

          {activeFeature === "loginLogs" && (
            <LoginLogsFeature
              loginLogs={loginLogs}
              loading={loginLogsLoading}
              onRefresh={fetchLoginLogs}
              onOpenProfile={openCommunityProfile}
            />
          )}

          {activeFeature === "aiQueryLogs" && (
            <AiQueryLogsFeature
              logs={aiQueryLogs}
              loading={aiQueryLogsLoading}
              onRefresh={fetchAiQueryLogs}
              onOpenProfile={openCommunityProfile}
            />
          )}

          {activeFeature === "periods" && (
            <PeriodManagementFeature
              periods={periods}
              loading={periodsLoading}
              savingKey={periodSavingKey}
              onRefresh={fetchPeriods}
              onChange={updatePeriodDraft}
              onSave={handlePeriodSave}
            />
          )}

          {activeFeature === "announcement" && (
            <AnnouncementManagementFeature
              announcement={announcement}
              form={announcementForm}
              imageFile={announcementImageFile}
              imagePreview={announcementPreview}
              loading={announcementLoading}
              saving={announcementSaving}
              visibilitySaving={announcementVisibilitySaving}
              onRefresh={fetchAnnouncement}
              onFormChange={updateAnnouncementForm}
              onImageChange={handleAnnouncementImageChange}
              onVisibilityToggle={handleAnnouncementVisibilityToggle}
              onSubmit={handleAnnouncementSubmit}
            />
          )}

          {activeFeature === "sponsor" && (
            <SponsorManagementFeature
              sponsor={sponsor}
              form={sponsorForm}
              logoFile={sponsorLogoFile}
              logoPreview={sponsorLogoPreview}
              enabled={sponsorFeatureEnabledDraft}
              loading={sponsorLoading}
              saving={sponsorSaving}
              visibilitySaving={sponsorVisibilitySaving}
              logoBackground={sponsorLogoBackground}
              onRefresh={fetchSponsor}
              onFormChange={updateSponsorForm}
              onSocialLinkChange={updateSponsorSocialLink}
              onLogoChange={handleSponsorLogoChange}
              onLogoBackgroundChange={setSponsorLogoBackground}
              onVisibilityToggle={handleSponsorVisibilityToggle}
              onSubmit={handleSponsorSubmit}
            />
          )}

          {activeFeature === "aiFeature" && (
            <AiFeatureManagementFeature
              enabled={aiFeatureEnabledDraft}
              loading={aiFeatureLoading}
              saving={aiFeatureSaving}
              onRefresh={fetchAiFeature}
              onToggle={handleAiFeatureToggle}
            />
          )}

          {activeFeature === "submissions" && (
            <SubmissionManagementFeature
              submissions={submissions}
              loading={submissionsLoading}
              pagination={submissionPagination}
              filters={submissionFilters}
              expandedSubmissionId={expandedSubmissionId}
              unviewedCount={unviewedSubmissionCount}
              onRefresh={() => fetchAdminSubmissions(submissionPagination.page)}
              onPageChange={fetchAdminSubmissions}
              onFilterChange={handleSubmissionFilterChange}
              onClearFilters={clearSubmissionFilters}
              onOpenSubmission={openSubmission}
              onStatusChange={updateSubmissionStatus}
              onOpenProfile={openCommunityProfile}
            />
          )}

          {activeFeature === "roleUpdate" && (
            <DirectRoleFeature
              customId={customId}
              customType={customType}
              roleSuggestions={roleSuggestions}
              roleSearchLoading={roleSearchLoading}
              selectedStudent={selectedRoleStudent}
              updating={roleUpdating}
              roleMessage={roleUpdateMessage}
              onIdChange={handleRoleSearchChange}
              onTypeChange={setCustomType}
              onSuggestionSelect={handleRoleSuggestionSelect}
              onOpenProfile={openCommunityProfile}
              onRoleMessageDismiss={() => setRoleUpdateMessage(null)}
              onSubmit={handleCustomUpdate}
            />
          )}
        </section>
      </PageShell>
    </div>
  );
};

/**
 * Feature cards used as the admin page navigation.
 */
function FeatureNavigation({ features, activeFeature, onSelect }) {
  return (
    <section
      className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      aria-label="Admin features"
    >
      {features.map((feature) => {
        const Icon = feature.icon;
        const isActive = activeFeature === feature.id;

        return (
          <button
            key={feature.id}
            type="button"
            onClick={() => onSelect(feature.id)}
            className={cx(
              "group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              isActive
                ? "border-violet-500 bg-violet-50/90 shadow-md ring-2 ring-violet-500/20 dark:border-violet-400 dark:bg-violet-950/40"
                : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700",
            )}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cx(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    isActive
                      ? "bg-violet-600 text-white shadow-sm dark:bg-violet-500"
                      : "bg-slate-100 text-slate-700 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span
                  className={cx(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold tracking-tight",
                    isActive
                      ? "bg-violet-200/60 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                  )}
                >
                  {feature.value}
                </span>
              </div>
              <span className="safe-text mt-3.5 block text-sm font-bold text-slate-950 dark:text-white">
                {feature.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                {feature.description}
              </span>
            </div>

            {isActive && (
              <span
                className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-600 to-indigo-600"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </section>
  );
}

/**
 * Admin toggle for the globally available AI assistant.
 */
function AiFeatureManagementFeature({
  enabled,
  loading,
  saving,
  onRefresh,
  onToggle,
}) {
  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="surface-card p-6 sm:p-8">
        <SectionHeading
          kicker="GLOBAL FEATURE TOGGLE"
          title="AI Assistant System Control"
          description="Manage platform-wide availability of the RMS AI Assistant and Neural Co-Pilot. When deactivated, navigation is concealed and API query dispatch is restricted."
          actions={
            <button
              type="button"
              onClick={onRefresh}
              className="btn-secondary"
              disabled={loading || saving}
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
              Refresh
            </button>
          }
        />

        {loading ? (
          <div className="mt-8">
            <LoadingState label="Loading AI feature setting..." />
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 sm:p-7 dark:border-slate-800/80 dark:bg-slate-900/60">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4 sm:items-center">
                  <span
                    className={cx(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-xl transition-transform duration-300",
                      enabled
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-violet-600/25"
                        : "bg-slate-200 text-slate-500 shadow-slate-300/30 dark:bg-slate-800 dark:text-slate-400 dark:shadow-black/40",
                    )}
                  >
                    <FiCpu className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                        RMS Neural Co-Pilot Engine
                      </h3>
                      <span
                        className={cx(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                          enabled
                            ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
                        )}
                      >
                        <span
                          className={cx(
                            "h-2 w-2 rounded-full",
                            enabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500",
                          )}
                          aria-hidden="true"
                        />
                        {enabled ? "Active & Serving" : "Standby / Deactivated"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Controls student query processing, contextual timetable reasoning, and the AI link in the primary navigation header.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggle}
                  disabled={saving}
                  className={cx(
                    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 active:scale-[0.98]",
                    enabled
                      ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                      : "bg-violet-600 text-white shadow-lg shadow-violet-600/25 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600",
                  )}
                >
                  {saving ? (
                    <FiRefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : enabled ? (
                    <FiEyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <FiEye className="h-4 w-4" aria-hidden="true" />
                  )}
                  {saving ? "Updating State..." : enabled ? "Disable AI Service" : "Enable AI Service"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Public Navigation
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cx(
                      "h-2 w-2 rounded-full",
                      enabled ? "bg-emerald-500" : "bg-slate-400",
                    )}
                  />
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {enabled ? "Visible in Header" : "Concealed from Students"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Agent Endpoint
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cx(
                      "h-2 w-2 rounded-full",
                      enabled ? "bg-emerald-500" : "bg-slate-400",
                    )}
                  />
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {enabled ? "/api/agentcall Active" : "Blocked (403 Hold)"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Query Audit Log
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    History Preserved
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="surface-card flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
              System Telemetry
            </span>
            <span
              className={cx(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                enabled
                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              )}
            >
              {enabled ? "Online" : "Standby"}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={cx(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  enabled
                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
                )}
              >
                <FiActivity className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {enabled ? "Fully Operational" : "Deactivated"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Governance Policy:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Students navigating directly to <code>/ai</code> will receive an offline status banner.</li>
                <li>Admin roles can continue testing query prompts without restrictions.</li>
                <li>Audit logging of past inquiries remains fully accessible.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-400">
            Last updated via RMS Governance Config. Changes take effect across user sessions instantly.
          </p>
        </div>
      </aside>
    </section>
  );
}

/**
 * Admin editor for the dashboard announcement card.
 */
function AnnouncementManagementFeature({
  announcement,
  form,
  imageFile,
  imagePreview,
  loading,
  saving,
  visibilitySaving,
  onRefresh,
  onFormChange,
  onImageChange,
  onVisibilityToggle,
  onSubmit,
}) {
  const isVisible = Boolean(announcement?.isActive);
  const visibilityButtonLabel = isVisible ? "Hide from Dashboard" : "Publish to Dashboard";
  const VisibilityIcon = isVisible ? FiEyeOff : FiEye;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <form onSubmit={onSubmit} className="surface-card p-6 sm:p-8">
        <SectionHeading
          kicker="CAMPUS BROADCAST"
          title="Announcement / Featured Card"
          description="Design and manage high-impact announcement banners presented to students on the main dashboard."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onVisibilityToggle}
                className={isVisible ? "btn-secondary" : "btn-primary"}
                disabled={!announcement || loading || saving || visibilitySaving}
              >
                <VisibilityIcon className={visibilitySaving ? "animate-pulse" : ""} aria-hidden="true" />
                {visibilitySaving ? "Updating..." : visibilityButtonLabel}
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="btn-secondary"
                disabled={loading || saving}
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </button>
            </div>
          }
        />

        <div className="mt-8 space-y-6">
          <FormField
            id="announcement-image"
            label="Banner Cover Graphic"
            helper={
              imageFile
                ? `Selected: ${imageFile.name}`
                : imagePreview
                  ? "Current cloud cover graphic loaded."
                  : "Upload a high-resolution 16:9 banner image (PNG, WebP, or JPG)."
            }
          >
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-5 transition hover:border-violet-400 dark:border-slate-800 dark:hover:border-violet-500 sm:flex-row sm:items-center">
              <label
                htmlFor="announcement-image"
                className="btn-secondary cursor-pointer shrink-0"
              >
                <FiUploadCloud className="h-4 w-4" aria-hidden="true" />
                {imagePreview ? "Replace Cover" : "Choose Image"}
              </label>
              <input
                id="announcement-image"
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className="sr-only"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {imageFile ? imageFile.name : imagePreview ? "Graphic active in draft" : "No image selected"}
                </p>
                <p className="text-xs text-slate-400">
                  Max file size: 5MB • Formats: PNG, JPG, WebP
                </p>
              </div>
            </div>
          </FormField>

          <FormField
            id="announcement-title"
            label="Banner Headline"
            helper={`${(form.title || "").length}/120 characters`}
          >
            <input
              id="announcement-title"
              type="text"
              value={form.title}
              onChange={(event) => onFormChange("title", event.target.value)}
              className="form-field"
              maxLength={120}
              placeholder="e.g., Mid-Term Examination Routine Published"
              required
            />
          </FormField>

          <FormField
            id="announcement-description"
            label="Notice Details & Body"
            helper={`${(form.description || "").length}/1200 characters`}
          >
            <textarea
              id="announcement-description"
              value={form.description}
              onChange={(event) => onFormChange("description", event.target.value)}
              className="form-field min-h-36 resize-y"
              maxLength={1200}
              placeholder="Provide context, instructions, and relevant schedule details for the student community..."
              required
            />
          </FormField>

          <FormField
            id="announcement-link"
            label="Destination Action Link"
            helper="Optional URL triggered when students click 'Learn More'."
          >
            <div className="relative">
              <FiLink
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="announcement-link"
                type="url"
                value={form.link}
                onChange={(event) => onFormChange("link", event.target.value)}
                className="form-field pl-12"
                maxLength={2048}
                placeholder="https://iiuc.ac.bd/notices/midterm-routine"
              />
            </div>
          </FormField>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto"
              disabled={saving || loading}
            >
              <FiSave className={saving ? "animate-pulse" : ""} aria-hidden="true" />
              {saving ? "Saving Changes..." : "Save Announcement Card"}
            </button>
          </div>
        </div>
      </form>

      <aside className="surface-card overflow-hidden shadow-2xl shadow-slate-950/15 ring-1 ring-white/60 dark:shadow-black/40 dark:ring-white/10">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <SectionHeading
            kicker={announcement ? (announcement.isActive ? "LIVE BROADCAST" : "DRAFT MODE") : "PREVIEW"}
            title={announcement ? (announcement.isActive ? "Live Dashboard Card" : "Saved Draft Card") : "Card Preview"}
            description={
              announcement
                ? announcement.isActive
                  ? "Currently visible on student dashboards."
                  : "Saved in database, but concealed from public dashboards."
                : "Fill out the form to generate the campus announcement preview."
            }
          />
        </div>

        {loading ? (
          <div className="p-8">
            <LoadingState label="Loading announcement preview..." />
          </div>
        ) : imagePreview ? (
          <div>
            <div className="relative overflow-hidden bg-slate-950">
              <img
                src={imagePreview}
                alt="Announcement banner preview"
                className="h-80 w-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md">
                  <span
                    className={cx(
                      "h-2 w-2 rounded-full",
                      isVisible ? "bg-emerald-400 animate-pulse" : "bg-amber-400",
                    )}
                  />
                  {isVisible ? "Active Broadcast" : "Hidden Draft"}
                </span>
              </div>
              <div className="relative flex items-end p-5">
                <div className="w-full rounded-2xl border border-white/20 bg-slate-950/60 p-5 text-white shadow-2xl backdrop-blur-xl">
                  <p className="text-xs font-black uppercase tracking-wider text-violet-300">
                    Featured Update
                  </p>
                  <h3 className="safe-text mt-2 text-2xl font-black leading-tight text-white">
                    {form.title || "Announcement Title"}
                  </h3>
                  <p className="mt-2.5 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-200">
                    {form.description || "Announcement description will render here with full formatting..."}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold text-slate-950 shadow-md">
                      Learn More
                      <FiExternalLink className="h-3 w-3" />
                    </span>
                    {form.link && (
                      <span className="truncate text-xs font-mono text-slate-400 max-w-[180px]">
                        {form.link}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={<FiImage className="h-8 w-8 text-slate-400" aria-hidden="true" />}
              title="No announcement graphic"
              description="Add a cover graphic and title to render the interactive dashboard preview."
            />
          </div>
        )}
      </aside>
    </div>
  );
}

/**
 * Admin editor for the Supported By sponsor block.
 */
function SponsorManagementFeature({
  sponsor,
  form,
  logoFile,
  logoPreview,
  enabled,
  loading,
  saving,
  visibilitySaving,
  onRefresh,
  onFormChange,
  onSocialLinkChange,
  onLogoChange,
  onVisibilityToggle,
  onSubmit,
}) {
  const VisibilityIcon = enabled ? FiEyeOff : FiEye;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <form onSubmit={onSubmit} className="surface-card p-6 sm:p-8">
        <SectionHeading
          kicker="PARTNERS & PATRONS"
          title="Institutional Sponsor Management"
          description="Configure the partner organization logo, public profile description, and external social channels shown across the public portal."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onVisibilityToggle}
                className={enabled ? "btn-secondary" : "btn-primary"}
                disabled={loading || saving || visibilitySaving}
              >
                <VisibilityIcon className={visibilitySaving ? "animate-pulse" : ""} aria-hidden="true" />
                {visibilitySaving ? "Updating..." : enabled ? "Hide Sponsor" : "Show Sponsor"}
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="btn-secondary"
                disabled={loading || saving}
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </button>
            </div>
          }
        />

        {loading ? (
          <div className="mt-8">
            <LoadingState label="Loading sponsor profile..." />
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <FormField
              id="sponsor-logo"
              label="Sponsor Brandmark / Logo"
              helper={
                logoFile
                  ? `Selected: ${logoFile.name}`
                  : logoPreview
                    ? "Current partner logo loaded."
                    : "Upload a transparent PNG or high-res vector logo."
              }
            >
              <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-5 transition hover:border-violet-400 dark:border-slate-800 dark:hover:border-violet-500 sm:flex-row sm:items-center">
                <label
                  htmlFor="sponsor-logo"
                  className="btn-secondary cursor-pointer shrink-0"
                >
                  <FiUploadCloud className="h-4 w-4" aria-hidden="true" />
                  {logoPreview ? "Replace Logo" : "Choose Logo"}
                </label>
                <input
                  id="sponsor-logo"
                  type="file"
                  accept="image/*"
                  onChange={onLogoChange}
                  className="sr-only"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {logoFile ? logoFile.name : logoPreview ? "Logo active in draft" : "No file selected"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Transparent PNG or SVG recommended
                  </p>
                </div>
              </div>
            </FormField>

            <FormField id="sponsor-name" label="Partner / Organization Name">
              <input
                id="sponsor-name"
                type="text"
                value={form.name}
                onChange={(event) => onFormChange("name", event.target.value)}
                className="form-field"
                maxLength={160}
                placeholder="e.g., TechCorp Solutions Bangladesh"
                required
              />
            </FormField>

            <FormField
              id="sponsor-description"
              label="Partnership Scope & Description"
              helper={`${(form.description || "").length}/1200 characters`}
            >
              <textarea
                id="sponsor-description"
                value={form.description}
                onChange={(event) => onFormChange("description", event.target.value)}
                className="form-field min-h-32 resize-y"
                maxLength={1200}
                placeholder="Describe how the sponsor supports the routine management system and student community..."
                required
              />
            </FormField>

            <FormField id="sponsor-website" label="Official Web Portal">
              <div className="relative">
                <FiGlobe
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="sponsor-website"
                  type="url"
                  value={form.websiteUrl}
                  onChange={(event) => onFormChange("websiteUrl", event.target.value)}
                  className="form-field pl-12"
                  maxLength={2048}
                  placeholder="https://sponsor.org"
                />
              </div>
            </FormField>

            <FormField id="sponsor-contact" label="Direct Contact Information">
              <textarea
                id="sponsor-contact"
                value={form.contactInfo}
                onChange={(event) => onFormChange("contactInfo", event.target.value)}
                className="form-field min-h-24 resize-y"
                maxLength={1200}
                placeholder="Key liaison contacts, inquiry email, telephone numbers..."
              />
            </FormField>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Connected Social Ecosystem
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {SPONSOR_SOCIAL_CONFIG.map((item) => {
                  const Icon = item.icon;

                  return (
                    <label key={item.key} htmlFor={`sponsor-${item.key}`} className="block">
                      <span className="sr-only">{item.label}</span>
                      <span className="relative block">
                        <Icon
                          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id={`sponsor-${item.key}`}
                          type="url"
                          value={form.socialLinks?.[item.key] || ""}
                          onChange={(event) => onSocialLinkChange(item.key, event.target.value)}
                          className="form-field pl-11 text-xs"
                          maxLength={2048}
                          placeholder={item.placeholder}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary w-full sm:w-auto"
                disabled={saving || loading}
              >
                <FiSave className={saving ? "animate-pulse" : ""} aria-hidden="true" />
                {saving ? "Saving Changes..." : "Save Sponsor Profile"}
              </button>
            </div>
          </div>
        )}
      </form>

      <aside className="surface-card overflow-hidden shadow-2xl shadow-slate-950/15 ring-1 ring-white/60 dark:shadow-black/40 dark:ring-white/10">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <SectionHeading
            kicker={enabled ? "PUBLICLY VISIBLE" : "RESTRICTED / HIDDEN"}
            title={sponsor ? "Sponsor Plate Preview" : "Draft Preview"}
            description={
              enabled
                ? "This partner plate is currently displayed in the site footer and landing page."
                : "Sponsor data is saved in database but hidden from public pages."
            }
          />
        </div>

        {loading ? (
          <div className="p-8">
            <LoadingState label="Loading sponsor preview..." />
          </div>
        ) : logoPreview || form.name || form.description ? (
          <div className="grid gap-6 p-6">
            <div className="flex justify-center rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <SponsorLogoPlate logo={logoPreview} name={form.name || "Sponsor"} size="preview" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                Official Patron
              </span>
              <h3 className="safe-text mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {form.name || "Partner Organization"}
              </h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {form.description || "Partner organization description will be featured here."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {form.websiteUrl && (
                <a
                  href={form.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  <FiExternalLink aria-hidden="true" />
                  Visit Website
                </a>
              )}
              <SponsorSocialLinks socialLinks={form.socialLinks} compact />
            </div>

            <div
              className={cx(
                "rounded-xl border px-4 py-3 text-xs font-bold flex items-center gap-2",
                enabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
              )}
            >
              <span
                className={cx(
                  "h-2 w-2 rounded-full",
                  enabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500",
                )}
              />
              {enabled ? "Live: Broadcast across public site" : "Concealed: Disabled from public view"}
            </div>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={<FiAward className="h-8 w-8 text-slate-400" aria-hidden="true" />}
              title="No sponsor profile"
              description="Provide partner branding and details to render the public showcase preview."
            />
          </div>
        )}
      </aside>
    </div>
  );
}

/**
 * Session list and editor feature panel.
 */
function SessionFeature({
  sessions,
  loading,
  editingSession,
  sessionForm,
  sessionSaving,
  onRefresh,
  onEdit,
  onFormChange,
  onReset,
  onSubmit,
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="surface-card p-6 sm:p-8">
        <SectionHeading
          kicker="TIMETABLE CALENDAR"
          title="Academic Sessions Registry"
          description="Manage academic sessions and active term flags. The active session determines live timetable lookups, class period mappings, and student routine displays."
          actions={
            <button
              type="button"
              onClick={onRefresh}
              className="btn-secondary"
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
              Refresh
            </button>
          }
        />

        <div className="mt-8">
          {loading ? (
            <div className="p-4">
              <LoadingState label="Loading academic sessions..." />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<FiCalendar className="h-8 w-8 text-slate-400" aria-hidden="true" />}
                title="No academic sessions recorded"
                description="Register an academic session in the panel to activate timetable lookups."
              />
            </div>
          ) : (
            <div className="grid gap-4">
              {sessions.map((sessionItem) => {
                const isSelected = editingSession === sessionItem.session;

                return (
                  <article
                    key={sessionItem.session}
                    className={cx(
                      "group relative overflow-hidden rounded-2xl border p-5 transition-all",
                      isSelected
                        ? "border-violet-500 bg-violet-50/40 ring-2 ring-violet-500/20 dark:border-violet-500/60 dark:bg-violet-950/20"
                        : "border-slate-200/90 bg-white hover:border-violet-300 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700",
                    )}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <span
                          className={cx(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                            sessionItem.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                          )}
                        >
                          <FiCalendar className="h-6 w-6" aria-hidden="true" />
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="safe-text text-lg font-black text-slate-950 dark:text-white">
                              {sessionItem.session}
                            </h3>
                            <span
                              className={cx(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold",
                                sessionItem.isActive
                                  ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
                              )}
                            >
                              <span
                                className={cx(
                                  "h-1.5 w-1.5 rounded-full",
                                  sessionItem.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400",
                                )}
                              />
                              {sessionItem.isActive ? "Active Routine Term" : "Archived Session"}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-400">Effective:</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {sessionItem.start || "N/A"}
                              </span>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-400">Conclusion:</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {sessionItem.stop || "Continuous / Open"}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onEdit(sessionItem)}
                        className={cx(
                          "btn-secondary shrink-0",
                          isSelected && "bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600",
                        )}
                      >
                        <FiEdit3 aria-hidden="true" />
                        {isSelected ? "Editing" : "Edit Details"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <aside className="surface-card p-6 sm:p-7">
        <SectionHeading
          kicker={editingSession ? "TERM CONFIGURATION" : "NEW REGISTRATION"}
          title={editingSession ? `Edit ${editingSession}` : "Add New Session"}
          description={
            editingSession
              ? "Modify term validity dates and active flag status."
              : "Register an upcoming academic session in the routine database."
          }
        />

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <FormField
            id="session-name"
            label="Session Identifier"
            helper={editingSession ? "Session code is permanent once initialized." : "e.g., Autumn 2025, Spring 2026"}
          >
            <input
              id="session-name"
              value={sessionForm.session}
              onChange={(event) => onFormChange("session", event.target.value)}
              placeholder="e.g. Autumn 2025"
              className="form-field"
              disabled={Boolean(editingSession)}
              required
            />
          </FormField>

          <FormField id="session-start" label="Term Start Date">
            <input
              id="session-start"
              type="date"
              value={sessionForm.start}
              onChange={(event) => onFormChange("start", event.target.value)}
              className="form-field"
              required
            />
          </FormField>

          <label
            htmlFor="session-active"
            className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-800/60"
          >
            <div>
              <span className="block font-bold">Primary Active Session</span>
              <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                Directs all public timetable queries to this term.
              </span>
            </div>
            <input
              id="session-active"
              type="checkbox"
              checked={sessionForm.isActive}
              onChange={(event) => onFormChange("isActive", event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <FormField
            id="session-stop"
            label="Term End / Stop Date"
            helper={sessionForm.isActive ? "Disabled while term is flagged as active." : "Required for archived sessions."}
          >
            <input
              id="session-stop"
              type="date"
              value={sessionForm.stop}
              onChange={(event) => onFormChange("stop", event.target.value)}
              className="form-field"
              disabled={sessionForm.isActive}
              required={!sessionForm.isActive}
            />
          </FormField>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3">
            {editingSession && (
              <button type="button" onClick={onReset} className="btn-secondary">
                <FiX aria-hidden="true" />
                Cancel
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={sessionSaving}>
              {editingSession ? <FiSave aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
              {sessionSaving ? "Saving..." : editingSession ? "Save Changes" : "Register Session"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

/**
 * Paginated CR users feature panel.
 */
function CrUsersFeature({
  crUsers,
  loading,
  pagination,
  onRefresh,
  onPageChange,
  onRoleChange,
  onOpenProfile,
}) {
  return (
    <section className="table-shell">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            Student Representatives
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Class Representative Registry
            </h2>
            <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
              {pagination.total} registered
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Assigned CRs have routine update privileges for their respective academic sections.
          </p>
        </div>
        <button type="button" onClick={onRefresh} className="btn-secondary shrink-0" disabled={loading}>
          <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh Registry
        </button>
      </div>

      {loading ? (
        <div className="p-8">
          <LoadingState label="Loading CR users..." />
        </div>
      ) : crUsers.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<FiUsers className="h-8 w-8 text-slate-400" aria-hidden="true" />}
            title="No class representatives found"
            description="Use the Direct Role Update feature to assign a student the CR privilege."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <caption className="sr-only">CR users registry</caption>
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">Student Representative</th>
                <th scope="col" className="px-6 py-4">Section</th>
                <th scope="col" className="px-6 py-4">Communication</th>
                <th scope="col" className="px-6 py-4">Assigned Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {crUsers.map((student) => (
                <tr
                  key={student.id}
                  className="transition-colors hover:bg-violet-50/40 dark:hover:bg-slate-800/50"
                >
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(student.id)}
                      className="group flex min-w-0 items-center gap-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                    >
                      <AdminAvatar image={student.profilePic} name={student.name || student.id} />
                      <div className="min-w-0">
                        <span className="safe-text block font-bold text-slate-950 transition group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-300">
                          {student.name || "Student"}
                        </span>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          ID: {student.id}
                        </span>
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                      {student.sec ? `Section ${student.sec}` : "No Section"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    <p className="safe-text text-xs font-semibold">{student.email || "No email registered"}</p>
                    <p className="safe-text mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">
                      {student.phone || "No phone registered"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={student.type}
                      onChange={(event) => onRoleChange(student.id, event.target.value)}
                      className="form-field min-w-36 text-xs font-semibold"
                      aria-label={`Role for ${student.name || student.id}`}
                    >
                      {VALID_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationControls
        pagination={pagination}
        disabled={loading}
        onPageChange={onPageChange}
      />
    </section>
  );
}

/**
 * Recent login history panel.
 */
function LoginLogsFeature({ loginLogs, loading, onRefresh, onOpenProfile }) {
  return (
    <section className="table-shell">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            Security Audit Stream
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Authentication Audit Feed
            </h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              Latest 10 Sessions
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time verification log of recent successful account sign-ins across the university portal.
          </p>
        </div>
        <button type="button" onClick={onRefresh} className="btn-secondary shrink-0" disabled={loading}>
          <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh Stream
        </button>
      </div>

      {loading ? (
        <div className="p-8">
          <LoadingState label="Loading authentication stream..." />
        </div>
      ) : loginLogs.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<FiClock className="h-8 w-8 text-slate-400" aria-hidden="true" />}
            title="No authentication events recorded"
            description="Recent student and administrator sign-in events will stream here."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <caption className="sr-only">Latest login records</caption>
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">User Identity</th>
                <th scope="col" className="px-6 py-4">Cohort / Section</th>
                <th scope="col" className="px-6 py-4">Authorization Role</th>
                <th scope="col" className="px-6 py-4">Sign-in Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loginLogs.map((entry, index) => (
                <tr
                  key={`${entry.id}-${entry.loginTime || index}`}
                  className="transition-colors hover:bg-violet-50/40 dark:hover:bg-slate-800/50"
                >
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(entry.id)}
                      className="group flex min-w-0 items-center gap-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                    >
                      <AdminAvatar image={entry.profilePic} name={entry.studentName || entry.id} />
                      <div className="min-w-0">
                        <p className="safe-text font-bold text-slate-950 transition group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-300">
                          {entry.studentName || "Unknown Student"}
                        </p>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          ID: {entry.id}
                        </p>
                        {entry.email && (
                          <p className="safe-text truncate text-xs text-slate-400 max-w-[200px]">
                            {entry.email}
                          </p>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                      {entry.sec ? `Section ${entry.sec}` : "No Section"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cx(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                        entry.type === "ADMIN"
                          ? "bg-violet-500/10 text-violet-700 ring-1 ring-inset ring-violet-500/30 dark:bg-violet-500/20 dark:text-violet-300"
                          : entry.type === "cr"
                            ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
                      )}
                    >
                      {entry.type || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <FiClock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span>{formatLoginTime(entry.loginTime)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Fixed latest-record monitoring view for AI queries.
 */
function AiQueryLogsFeature({ logs, loading, onRefresh, onOpenProfile }) {
  return (
    <section className="table-shell">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            Neural Co-Pilot Audit
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Inbound AI Prompt Telemetry
            </h2>
            <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
              Latest 10 Inquiries
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time prompt requests dispatched by students, ordered by record ID from newest to oldest.
          </p>
        </div>
        <button type="button" onClick={onRefresh} className="btn-secondary shrink-0" disabled={loading}>
          <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh Logs
        </button>
      </div>

      {loading ? (
        <div className="p-8">
          <LoadingState label="Loading latest AI queries..." />
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<FiMessageSquare className="h-8 w-8 text-slate-400" aria-hidden="true" />}
            title="No AI queries recorded"
            description="Inbound student AI prompts and routine requests will stream here."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <caption className="sr-only">
              The latest ten AI queries ordered by descending record ID
            </caption>
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">Query Ticket</th>
                <th scope="col" className="px-6 py-4">Prompt Author</th>
                <th scope="col" className="px-6 py-4">Prompt Content</th>
                <th scope="col" className="px-6 py-4">Origin Source</th>
                <th scope="col" className="px-6 py-4">Dispatch Timestamp</th>
                <th scope="col" className="px-6 py-4">Record ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {logs.map((entry) => {
                const hasStudent = Boolean(entry.studentId);

                return (
                  <tr
                    key={entry.id}
                    className="align-top transition-colors hover:bg-violet-50/40 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-lg bg-violet-50 px-2.5 py-1 font-mono text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/30">
                        AIQ-{entry.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {hasStudent ? (
                        <button
                          type="button"
                          onClick={() => onOpenProfile(entry.studentId)}
                          className="safe-text font-bold text-slate-950 transition hover:text-violet-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-white dark:hover:text-violet-300"
                        >
                          <span className="font-mono text-xs underline decoration-violet-300 underline-offset-2">
                            {entry.studentId}
                          </span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                          Guest User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xl">
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                          <p className="whitespace-pre-wrap break-words font-medium">
                            {entry.query || "No query text recorded"}
                          </p>
                        </div>
                        <p className="mt-1.5 font-mono text-[11px] font-medium text-slate-400">
                          Payload: {entry.queryLength ?? String(entry.query || "").length} characters
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-800 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30">
                        {entry.source || "web"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <FiClock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        <span>{formatLoginTime(entry.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-slate-400">
                        #{entry.id}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Modern submission management feature panel.
 */
function SubmissionManagementFeature({
  submissions,
  loading,
  pagination,
  filters,
  expandedSubmissionId,
  unviewedCount,
  onRefresh,
  onPageChange,
  onFilterChange,
  onClearFilters,
  onOpenSubmission,
  onStatusChange,
  onOpenProfile,
}) {
  return (
    <section className="table-shell">
      <div className="flex flex-col gap-6 border-b border-slate-200 bg-white px-6 py-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Community Dispatch Inbox
              </p>
              {unviewedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {unviewedCount} unread
                </span>
              )}
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Student Submissions & Applications
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Review CR candidacies, platform feedback, complaints, course requests, and credential resets.
            </p>
          </div>
          <button type="button" onClick={onRefresh} className="btn-secondary shrink-0" disabled={loading}>
            <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
            Refresh Inbox
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="submission-filter-type" label="Submission Category">
            <select
              id="submission-filter-type"
              value={filters.type}
              onChange={(event) => onFilterChange("type", event.target.value)}
              className="form-field text-xs font-semibold"
            >
              <option value="">All Categories</option>
              {SUBMISSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === "CR" ? "CR Application" : type}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="submission-filter-viewed" label="Read Status">
            <select
              id="submission-filter-viewed"
              value={filters.viewed}
              onChange={(event) => onFilterChange("viewed", event.target.value)}
              className="form-field text-xs font-semibold"
            >
              <option value="">All Read States</option>
              <option value="false">Unread (New)</option>
              <option value="true">Viewed (Reviewed)</option>
            </select>
          </FormField>

          <FormField id="submission-filter-resolved" label="Resolution State">
            <select
              id="submission-filter-resolved"
              value={filters.resolved}
              onChange={(event) => onFilterChange("resolved", event.target.value)}
              className="form-field text-xs font-semibold"
            >
              <option value="">All Resolution States</option>
              <option value="false">Pending Action</option>
              <option value="true">Resolved / Handled</option>
            </select>
          </FormField>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onClearFilters}
              className="btn-secondary w-full text-xs font-bold"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8">
          <LoadingState label="Loading submissions..." />
        </div>
      ) : submissions.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<FiMessageSquare className="h-8 w-8 text-slate-400" aria-hidden="true" />}
            title="No submissions match criteria"
            description="No submissions found with the active filter settings. Reset filters or check back later."
          />
        </div>
      ) : (
        <div className="grid gap-4 p-6">
          {submissions.map((submission) => {
            const isExpanded = expandedSubmissionId === submission.id;
            const passwordChangeDetails = getPasswordChangeDetails(submission);
            const isPasswordChange = submission.type === PASSWORD_CHANGE_TYPE;

            return (
              <article
                key={submission.id}
                className={cx(
                  "relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all",
                  submission.view
                    ? "border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700"
                    : "border-violet-300 bg-violet-50/40 ring-1 ring-violet-500/20 hover:border-violet-400 dark:border-violet-500/40 dark:bg-violet-950/20",
                )}
              >
                {!submission.view && (
                  <span className="absolute top-0 right-0 h-3 w-3 rounded-bl-lg bg-violet-600" />
                )}

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-500/30 dark:bg-violet-500/20 dark:text-violet-300">
                        {submission.type === "CR" ? "CR Application" : submission.type}
                      </span>
                      <ViewedStatus viewed={submission.view} />
                      <ResolvedStatus resolved={submission.resolved} />
                    </div>

                    <h3 className="mt-3">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(submission.by)}
                        className="safe-text text-left text-base font-black text-slate-950 transition hover:text-violet-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-white dark:hover:text-violet-300"
                      >
                        {submission.studentName || "Student"}
                        <span className="ml-2 font-mono text-xs font-normal text-slate-400">
                          ({submission.by})
                        </span>
                      </button>
                    </h3>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>{submission.studentSection ? `Section ${submission.studentSection}` : "No Section"}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FiClock className="h-3 w-3 text-slate-400" />
                        {formatLoginTime(submission.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenSubmission(submission)}
                      className="btn-secondary"
                    >
                      <FiEye aria-hidden="true" />
                      {isExpanded ? "Hide Details" : "View Details"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onStatusChange(submission.id, { resolved: !submission.resolved })}
                      className={submission.resolved ? "btn-secondary" : "btn-primary"}
                    >
                      <FiCheckCircle aria-hidden="true" />
                      {isPasswordChange
                        ? submission.resolved
                          ? "Mark Pending"
                          : "Approve Reset"
                        : submission.resolved
                          ? "Reopen Ticket"
                          : "Mark Resolved"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-5 rounded-xl border border-slate-200/90 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                      <div>
                        {isPasswordChange ? (
                          <>
                            <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                              Credential Reset Telemetry
                            </p>
                            <div className="mt-3 grid gap-2.5 text-xs">
                              <InfoLine label="Student ID" value={passwordChangeDetails.studentId || submission.by} />
                              <InfoLine label="Confirm ID" value={passwordChangeDetails.confirmStudentId || submission.by} />
                              <InfoLine label="Password Hash" value={passwordChangeDetails.passwordHash || "N/A"} />
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                              Submission Message Body
                            </p>
                            <div className="mt-2.5 rounded-lg border border-slate-200/70 bg-white p-4 text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                              <p className="whitespace-pre-line break-words">
                                {submission.description}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="grid gap-2 text-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Submitter Metadata
                        </p>
                        <InfoLine label="Registered Email" value={submission.studentEmail || "N/A"} />
                        <InfoLine label="Contact Telephone" value={submission.studentPhone || "N/A"} />
                        <InfoLine label="Last Activity" value={formatLoginTime(submission.updatedAt)} />
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <PaginationControls
        pagination={pagination}
        disabled={loading}
        onPageChange={onPageChange}
      />
    </section>
  );
}

function ViewedStatus({ viewed }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider",
        viewed
          ? "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
          : "bg-violet-500/10 text-violet-700 ring-1 ring-inset ring-violet-500/30 dark:bg-violet-500/20 dark:text-violet-300",
      )}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          viewed ? "bg-slate-400" : "bg-violet-600 animate-pulse",
        )}
      />
      {viewed ? "Reviewed" : "Unread"}
    </span>
  );
}

function ResolvedStatus({ resolved }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider",
        resolved
          ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300"
          : "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300",
      )}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          resolved ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      {resolved ? "Resolved" : "Pending Action"}
    </span>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
      <span className="font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="safe-text truncate text-right font-mono font-bold text-slate-950 dark:text-white">
        {value}
      </span>
    </div>
  );
}

function getPasswordChangeDetails(submission) {
  const description = String(submission?.description || "");

  return {
    studentId: description.match(/^Student ID:\s*(.+)$/im)?.[1]?.trim() || "",
    confirmStudentId: description.match(/^Confirm Student ID:\s*(.+)$/im)?.[1]?.trim() || "",
    passwordHash: description.match(/^Password hash:\s*(\S+)/im)?.[1] || "",
  };
}

function AdminAvatar({ image, name }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white shadow-md ring-2 ring-white/80 dark:ring-slate-800">
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

/**
 * Admin editor for configurable routine periods.
 */
function PeriodManagementFeature({
  periods,
  loading,
  savingKey,
  onRefresh,
  onChange,
  onSave,
}) {
  const genders = ["male", "female"];

  return (
    <section className="table-shell">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            Timetable Intervals
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Class Period & Shift Schedules
            </h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              Dual Campus Shifts
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Configure the 12-hour time intervals used across daily class routine grids and live session trackers.
          </p>
        </div>
        <button type="button" onClick={onRefresh} className="btn-secondary shrink-0" disabled={loading}>
          <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh Periods
        </button>
      </div>

      {loading ? (
        <div className="p-8">
          <LoadingState label="Loading routine period schedules..." />
        </div>
      ) : periods.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<FiClock className="h-8 w-8 text-slate-400" aria-hidden="true" />}
            title="No period slots found"
            description="Database period records are uninitialized. Check migrations or add slots."
          />
        </div>
      ) : (
        <div className="grid gap-6 p-6 lg:grid-cols-2">
          {genders.map((gender) => {
            const rows = periods
              .filter((periodItem) => periodItem.gender === gender)
              .sort((first, second) => Number(first.no) - Number(second.no));

            const isMale = gender === "male";

            return (
              <div
                key={gender}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div
                  className={cx(
                    "flex items-center justify-between border-b px-5 py-4",
                    isMale
                      ? "border-sky-100 bg-sky-50/50 dark:border-sky-900/30 dark:bg-sky-950/20"
                      : "border-violet-100 bg-violet-50/50 dark:border-violet-900/30 dark:bg-violet-950/20",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cx(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black uppercase",
                        isMale
                          ? "bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                          : "bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
                      )}
                    >
                      {isMale ? "M" : "F"}
                    </span>
                    <div>
                      <h3 className="text-base font-black capitalize text-slate-950 dark:text-white">
                        {gender} Shift Schedule
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Official academic slots
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                    {rows.length} Active Slots
                  </span>
                </div>

                <div className="grid gap-3 p-5">
                  {rows.map((periodItem) => {
                    const periodKey = getPeriodKey(periodItem);
                    const invalid = !isValidPeriodRange(periodItem.startTime, periodItem.stopTime);
                    const saving = savingKey === periodKey;

                    return (
                      <article
                        key={periodKey}
                        className={cx(
                          "rounded-xl border p-4 transition-all",
                          invalid
                            ? "border-rose-300 bg-rose-50/40 dark:border-rose-500/40 dark:bg-rose-950/20"
                            : "border-slate-200/80 bg-slate-50/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700",
                        )}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <FiClock className="h-3 w-3" />
                                Period {periodItem.no}
                              </span>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <FormField id={`${periodKey}-start`} label="Commencement">
                                <input
                                  id={`${periodKey}-start`}
                                  value={periodItem.startTime}
                                  onChange={(event) => onChange(periodItem, "startTime", event.target.value)}
                                  className="form-field text-xs font-semibold"
                                  placeholder="10:40 AM"
                                  autoComplete="off"
                                />
                              </FormField>
                              <FormField id={`${periodKey}-stop`} label="Conclusion">
                                <input
                                  id={`${periodKey}-stop`}
                                  value={periodItem.stopTime}
                                  onChange={(event) => onChange(periodItem, "stopTime", event.target.value)}
                                  className="form-field text-xs font-semibold"
                                  placeholder="11:30 AM"
                                  autoComplete="off"
                                />
                              </FormField>
                            </div>

                            {invalid && (
                              <p className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                                Invalid sequence: Start time must occur prior to stop time.
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onSave(periodItem)}
                            disabled={saving || invalid}
                            className="btn-primary md:self-end text-xs shrink-0"
                          >
                            <FiSave className={saving ? "animate-spin" : ""} aria-hidden="true" />
                            {saving ? "Saving..." : "Save Slot"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * Direct user role update feature panel.
 */
function DirectRoleFeature({
  customId,
  customType,
  roleSuggestions,
  roleSearchLoading,
  selectedStudent,
  updating,
  roleMessage,
  onIdChange,
  onTypeChange,
  onSuggestionSelect,
  onOpenProfile,
  onRoleMessageDismiss,
  onSubmit,
}) {
  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="surface-card p-6 sm:p-8">
        <SectionHeading
          kicker="ACCESS CONTROL DISPATCHER"
          title="Direct Role Authority Manager"
          description="Locate student and faculty records by name or matriculation ID, inspect verification credentials, and dispatch authority updates."
        />

        <div className="mt-8 space-y-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Authorization Tiers & Privileges
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-violet-200/80 bg-violet-50/40 p-5 dark:border-violet-500/30 dark:bg-violet-950/20">
              <div className="flex items-center justify-between">
                <span className="inline-flex rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-black uppercase text-white shadow-sm">
                  ADMIN
                </span>
                <FiShield className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h4 className="mt-3 text-base font-black text-slate-950 dark:text-white">
                System Governance
              </h4>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                Unrestricted administration: session control, AI feature toggling, submission triage, and global period management.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 dark:border-emerald-500/30 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="inline-flex rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-black uppercase text-white shadow-sm">
                  CR
                </span>
                <FiUserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="mt-3 text-base font-black text-slate-950 dark:text-white">
                Class Representative
              </h4>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                Section scheduling privileges: can update and maintain live routine tables for their specific academic section.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <span className="inline-flex rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-black uppercase text-white shadow-sm dark:bg-slate-700">
                  STUDENT
                </span>
                <FiUsers className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </div>
              <h4 className="mt-3 text-base font-black text-slate-950 dark:text-white">
                Student Member
              </h4>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                Standard read-only schedule lookups, personal timetable tracking, academic resource access, and AI Co-Pilot inquiries.
              </p>
            </div>
          </div>
        </div>
      </div>

      <aside className="surface-card p-6 sm:p-7">
        <SectionHeading
          kicker="ROLE DISPATCH"
          title="Update User Authority"
          description="Type name or matriculation ID to search and bind a new authority role."
        />

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <FormField
            id="custom-id"
            label="Student Name or Matriculation ID"
            helper={roleSearchLoading ? "Searching student registry..." : "Type at least 2 characters for autocomplete."}
          >
            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="custom-id"
                value={customId}
                onChange={(event) => onIdChange(event.target.value)}
                placeholder="e.g. C213000 or Student Name"
                className="form-field pl-12 font-medium"
                autoComplete="off"
              />
              {!selectedStudent && roleSuggestions.length > 0 && (
                <AdminStudentSuggestionList
                  suggestions={roleSuggestions}
                  onSelect={onSuggestionSelect}
                />
              )}
            </div>
          </FormField>

          {selectedStudent && (
            <SelectedAdminStudent
              student={selectedStudent}
              onOpenProfile={onOpenProfile}
            />
          )}

          <FormField id="custom-role" label="Assign New Authority Role">
            <select
              id="custom-role"
              value={customType}
              onChange={(event) => onTypeChange(event.target.value)}
              className="form-field font-bold text-xs"
            >
              {VALID_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.toUpperCase()}
                </option>
              ))}
            </select>
          </FormField>

          <button type="submit" className="btn-primary w-full" disabled={updating}>
            {updating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Dispatching Update...
              </>
            ) : (
              <>
                <FiShield aria-hidden="true" />
                Dispatch Role Update
              </>
            )}
          </button>

          {roleMessage && (
            <Notice
              key={roleMessage.id}
              type={roleMessage.type}
              onDismiss={onRoleMessageDismiss}
            >
              {roleMessage.text}
            </Notice>
          )}
        </form>
      </aside>
    </section>
  );
}

function AdminStudentSuggestionList({ suggestions, onSelect }) {
  return (
    <ul className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 py-2 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
      {suggestions.map((studentRecord) => (
        <li key={studentRecord.id}>
          <button
            type="button"
            onClick={() => onSelect(studentRecord)}
            className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition hover:bg-violet-50/70 focus:bg-violet-50 focus:outline-none dark:hover:bg-slate-800/70 dark:focus:bg-slate-800"
          >
            <AdminAvatar image={studentRecord.profilePic} name={studentRecord.name || studentRecord.id} />
            <span className="min-w-0 flex-1">
              <span className="safe-text block text-sm font-bold text-slate-950 dark:text-white">
                {studentRecord.name || "Student"}
              </span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {studentRecord.id} • Sec {studentRecord.sec || "N/A"}
              </span>
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {studentRecord.type || "student"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SelectedAdminStudent({ student, onOpenProfile }) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/30 dark:bg-violet-950/20">
      <div className="flex items-center gap-3.5">
        <AdminAvatar image={student.profilePic} name={student.name || student.id} />
        <div className="min-w-0 flex-1">
          <p className="safe-text font-black text-slate-950 dark:text-white">
            {student.name || "Student"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="font-mono">{student.id}</span>
            <span>•</span>
            <span>Section {student.sec || "N/A"}</span>
            <span>•</span>
            <span className="uppercase text-violet-700 dark:text-violet-300 font-bold">
              {student.type || "student"}
            </span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpenProfile(student.id)}
        className="btn-secondary mt-3.5 w-full text-xs"
      >
        <FiEye aria-hidden="true" />
        Inspect Student Record
      </button>
    </div>
  );
}

/**
 * Paged controls for the CR user table and submissions.
 */
function PaginationControls({ pagination, disabled, onPageChange }) {
  const page = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4 text-xs font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
      <p>
        Showing page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of{" "}
        <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span> •{" "}
        <span className="font-bold text-slate-900 dark:text-white">{total}</span> total record{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className="btn-secondary text-xs"
        >
          <FiChevronLeft aria-hidden="true" />
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className="btn-secondary text-xs"
        >
          Next
          <FiChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function getSponsorFormFromRow(row) {
  return {
    name: row?.name || "",
    description: row?.description || "",
    websiteUrl: row?.websiteUrl || "",
    contactInfo: row?.contactInfo || "",
    socialLinks: Object.keys(emptySponsorSocialLinks).reduce((links, key) => {
      links[key] = row?.socialLinks?.[key] || "";
      return links;
    }, {}),
  };
}

function getPeriodKey(periodItem) {
  return `${periodItem.gender}-${periodItem.no}`;
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function getInitials(value) {
  return String(value || "U")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatLoginTime(value) {
  if (!value) return "No time recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No time recorded";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRoleUpdateError(error, studentId) {
  const apiMessage = error.response?.data?.msg || error.response?.data?.message;

  if (error.response?.status === 404) {
    return `No student found for ${studentId}. Search by name or ID and choose a suggestion.`;
  }

  if (apiMessage) {
    return apiMessage;
  }

  return "Could not update this role. Please check the selected student and try again.";
}

function getSessionError(error) {
  const errors = error.response?.data?.errors;

  if (errors && typeof errors === "object") {
    return Object.values(errors).filter(Boolean).join(" ");
  }

  return error.response?.data?.msg || error.message || "Failed to save session.";
}

export default AdminRoles;
