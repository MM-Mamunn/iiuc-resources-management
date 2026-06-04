import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiImage,
  FiLink,
  FiMessageSquare,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiShield,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import api from "../../api";
import campusImage from "../../assets/iiuc.webp";
import { useActiveSession, useAuth } from "../../App";
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
  isValidPeriodRange,
  listPeriods,
  updatePeriod,
} from "../../services/periodService";
import Header from "../components/Header";
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

/**
 * Admin-only role and session management workspace.
 */
const AdminRoles = () => {
  const { user, isLoggedIn } = useAuth();
  const { refreshActiveSession } = useActiveSession();
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState("sessions");
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
      fetchPeriods(),
      fetchAnnouncement(),
      fetchSubmissionNotifications(),
    ]);
  }, [fetchAnnouncement, fetchCrUsers, fetchLoginLogs, fetchPeriods, fetchSessions, fetchSubmissionNotifications]);

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

  const features = [
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
      id: "loginLogs",
      icon: FiClock,
      title: "Latest Logins",
      value: loginLogsLoading ? "..." : loginLogs.length,
      description: "See the latest 10 successful student login records.",
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
      id: "submissions",
      icon: FiBell,
      title: `Notifications (${unviewedSubmissionCount})`,
      value: submissionsLoading ? "..." : unviewedSubmissionCount,
      description: "Review applications, feedback, requests, and complaints.",
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
        <section className="relative isolate overflow-hidden rounded-lg bg-slate-950 px-6 py-8 text-white shadow-2xl sm:px-8">
          <img
            src={campusImage}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 -z-10 bg-slate-950/72" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-teal-200">Admin dashboard</p>
              <h1 className="mt-3 text-3xl font-black sm:text-5xl">
                Manage sessions and roles from one focused workspace.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                Use the feature cards below to move between session setup, CR review, and direct role updates.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshAdminData}
              className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20 dark:border-white/20 dark:bg-white/10 dark:text-white"
              disabled={loading || sessionsLoading || loginLogsLoading || periodsLoading || announcementLoading || submissionsLoading}
            >
              <FiRefreshCw
                className={loading || sessionsLoading || loginLogsLoading || periodsLoading || announcementLoading || submissionsLoading ? "animate-spin" : ""}
                aria-hidden="true"
              />
              Refresh
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

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiUsers className="h-5 w-5" aria-hidden="true" />}
            label="CR users"
            value={crPagination.total}
            tone="blue"
          />
          <MetricCard
            icon={<FiShield className="h-5 w-5" aria-hidden="true" />}
            label="Valid roles"
            value={VALID_ROLES.length}
            tone="amber"
          />
          <MetricCard
            icon={<FiUserCheck className="h-5 w-5" aria-hidden="true" />}
            label="Signed in as"
            value={user?.id || "Admin"}
            tone="teal"
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
      className="mt-8 grid auto-cols-[minmax(150px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 xl:grid-cols-7 xl:auto-cols-auto xl:overflow-visible"
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
              "interactive-card min-h-32 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isActive && "border-blue-400 bg-blue-50/80 dark:border-blue-500 dark:bg-blue-500/10",
            )}
          >
            <span className="flex items-start justify-between gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xl font-black text-slate-950 dark:text-white">
                {feature.value}
              </span>
            </span>
            <span className="safe-text mt-4 block text-base font-bold text-slate-950 dark:text-white">
              {feature.title}
            </span>
            <span className="mt-2 block text-xs leading-5 text-slate-600 dark:text-slate-400">
              {feature.description}
            </span>
          </button>
        );
      })}
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
  const visibilityButtonLabel = isVisible ? "Hide card" : "Show card";
  const VisibilityIcon = isVisible ? FiEyeOff : FiEye;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <form onSubmit={onSubmit} className="surface-card p-5">
        <SectionHeading
          kicker="Dashboard card"
          title="Announcement / Featured Update"
          description="Update the image, title, description, and action link shown on the dashboard."
          actions={
            <>
              <button
                type="button"
                onClick={onVisibilityToggle}
                className={isVisible ? "btn-secondary" : "btn-primary"}
                disabled={!announcement || loading || saving || visibilitySaving}
              >
                <VisibilityIcon className={visibilitySaving ? "animate-pulse" : ""} aria-hidden="true" />
                {visibilitySaving ? "Updating..." : visibilityButtonLabel}
              </button>
              <button type="button" onClick={onRefresh} className="btn-secondary" disabled={loading || saving}>
                <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </button>
            </>
          }
        />

        <div className="mt-6 grid gap-5">
          <FormField
            id="announcement-image"
            label="Cover Image"
            helper={imageFile ? imageFile.name : imagePreview ? "Current image selected." : "Upload one image."}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label htmlFor="announcement-image" className="btn-secondary cursor-pointer">
                <FiImage aria-hidden="true" />
                Choose image
              </label>
              <input
                id="announcement-image"
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className="sr-only"
              />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {imageFile ? "New cover ready" : imagePreview ? "Cover available" : "No cover selected"}
              </span>
            </div>
          </FormField>

          <FormField id="announcement-title" label="Title">
            <input
              id="announcement-title"
              type="text"
              value={form.title}
              onChange={(event) => onFormChange("title", event.target.value)}
              className="form-field"
              maxLength={120}
              placeholder="Short announcement title"
            />
          </FormField>

          <FormField id="announcement-description" label="Description">
            <textarea
              id="announcement-description"
              value={form.description}
              onChange={(event) => onFormChange("description", event.target.value)}
              className="form-field min-h-40 resize-y"
              maxLength={1200}
              placeholder="Announcement details"
            />
          </FormField>

          <FormField id="announcement-link" label="Action Link">
            <div className="relative">
              <FiLink
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="announcement-link"
                type="text"
                value={form.link}
                onChange={(event) => onFormChange("link", event.target.value)}
                className="form-field pl-12"
                maxLength={2048}
                placeholder="https://example.com/details"
              />
            </div>
          </FormField>

          <button type="submit" className="btn-primary w-full sm:w-fit" disabled={saving || loading}>
            <FiSave className={saving ? "animate-pulse" : ""} aria-hidden="true" />
            {saving ? "Saving..." : "Save announcement"}
          </button>
        </div>
      </form>

      <aside className="surface-card overflow-hidden shadow-2xl shadow-slate-950/15 ring-1 ring-white/60 dark:shadow-black/40 dark:ring-white/10">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <SectionHeading
            kicker={announcement ? (announcement.isActive ? "Live preview" : "Hidden preview") : "Preview"}
            title={announcement ? "Saved card" : "Draft card"}
            description={
              announcement
                ? announcement.isActive
                  ? "Visible on the dashboard."
                  : "Saved content is hidden from the dashboard."
                : "Complete the form to publish the card."
            }
          />
        </div>

        {loading ? (
          <LoadingState label="Loading announcement..." />
        ) : imagePreview ? (
          <div>
            <div className="relative overflow-hidden bg-slate-950">
              <img
                src={imagePreview}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
              <div className="relative flex min-h-72 items-end p-4">
                <div className="w-full rounded-lg border border-white/20 bg-slate-950/35 p-4 text-white shadow-2xl backdrop-blur-xl">
                  <p className="text-xs font-bold uppercase text-teal-200">Featured update</p>
                  <h3 className="safe-text mt-2 text-2xl font-black leading-tight">
                    {form.title || "Announcement title"}
                  </h3>
                  <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-100">
                    {form.description || "Announcement description"}
                  </p>
                  <span className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950">
                    Learn More
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<FiImage className="h-7 w-7" aria-hidden="true" />}
            title="No announcement yet"
            description="Add a cover image and content to publish the dashboard card."
          />
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
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="surface-card p-5">
        <SectionHeading
          kicker="Sessions"
          title="Session Management"
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

        <div className="mt-6">
          {loading ? (
            <LoadingState label="Loading sessions..." />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={<FiCalendar className="h-7 w-7" aria-hidden="true" />}
              title="No sessions found"
              description="Add a session to activate routine lookups."
            />
          ) : (
            <div className="grid gap-4">
              {sessions.map((sessionItem) => (
                <article
                  key={sessionItem.session}
                  className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="safe-text text-xl font-bold text-slate-950 dark:text-white">
                          {sessionItem.session}
                        </h2>
                        <span
                          className={
                            sessionItem.isActive
                              ? "status-pill border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                              : "status-pill border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          }
                        >
                          {sessionItem.isActive ? "Active" : "Closed"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Start: <span className="font-semibold">{sessionItem.start || "N/A"}</span>
                        {" "}- Stop: <span className="font-semibold">{sessionItem.stop || "Open"}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEdit(sessionItem)}
                      className="btn-secondary"
                    >
                      <FiEdit3 aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="surface-card p-5">
        <SectionHeading
          kicker={editingSession ? "Edit session" : "New session"}
          title={editingSession ? editingSession : "Add Session"}
        />

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <FormField id="session-name" label="Session name">
            <input
              id="session-name"
              value={sessionForm.session}
              onChange={(event) => onFormChange("session", event.target.value)}
              placeholder="Enter session name"
              className="form-field"
              disabled={Boolean(editingSession)}
              required
            />
          </FormField>

          <FormField id="session-start" label="Start date">
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
            className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <span>Active session</span>
            <input
              id="session-active"
              type="checkbox"
              checked={sessionForm.isActive}
              onChange={(event) => onFormChange("isActive", event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <FormField id="session-stop" label="Stop date">
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

          <div className="flex flex-wrap justify-end gap-3">
            {editingSession && (
              <button type="button" onClick={onReset} className="btn-secondary">
                <FiX aria-hidden="true" />
                Cancel
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={sessionSaving}>
              {editingSession ? <FiSave aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
              {sessionSaving ? "Saving..." : editingSession ? "Save changes" : "Add session"}
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
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="section-kicker">Users</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
            CR Users
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {pagination.total} CR user{pagination.total === 1 ? "" : "s"} found
          </p>
        </div>
        <button type="button" onClick={onRefresh} className="btn-secondary" disabled={loading}>
          <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingState label="Loading CR users..." />
      ) : crUsers.length === 0 ? (
        <EmptyState
          icon={<FiUsers className="h-7 w-7" aria-hidden="true" />}
          title="No CR users found"
          description="Assign a CR role by student ID, then refresh this list."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">CR users</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-4 font-bold">Student</th>
                <th scope="col" className="px-5 py-4 font-bold">Section</th>
                <th scope="col" className="px-5 py-4 font-bold">Contact</th>
                <th scope="col" className="px-5 py-4 font-bold">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {crUsers.map((student) => (
                <tr key={student.id} className="transition hover:bg-blue-50/60 dark:hover:bg-slate-900">
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(student.id)}
                      className="group flex min-w-0 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <AdminAvatar image={student.profilePic} name={student.name || student.id} />
                      <span className="min-w-0">
                        <span className="safe-text block font-bold text-slate-950 transition group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-200">
                          {student.name || "Student"}
                        </span>
                        <span className="safe-text mt-1 block text-xs text-slate-500 dark:text-slate-400">
                          ID: {student.id}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="safe-text px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                    {student.sec || "N/A"}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    <p className="safe-text">{student.email || "No email"}</p>
                    <p className="safe-text mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {student.phone || "No phone"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={student.type}
                      onChange={(event) => onRoleChange(student.id, event.target.value)}
                      className="form-field min-w-36"
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
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="section-kicker">Login history</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
            Latest 10 Logged In
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Showing the newest successful login records from the login log.
          </p>
        </div>
        <button type="button" onClick={onRefresh} className="btn-secondary" disabled={loading}>
          <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingState label="Loading latest logins..." />
      ) : loginLogs.length === 0 ? (
        <EmptyState
          icon={<FiClock className="h-7 w-7" aria-hidden="true" />}
          title="No login records found"
          description="Recent successful logins will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Latest login records</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-4 font-bold">Student</th>
                <th scope="col" className="px-5 py-4 font-bold">Section</th>
                <th scope="col" className="px-5 py-4 font-bold">Role</th>
                <th scope="col" className="px-5 py-4 font-bold">Login time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loginLogs.map((entry, index) => (
                <tr
                  key={`${entry.id}-${entry.loginTime || index}`}
                  className="transition hover:bg-blue-50/60 dark:hover:bg-slate-900"
                >
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(entry.id)}
                      className="group flex min-w-0 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <AdminAvatar image={entry.profilePic} name={entry.studentName || entry.id} />
                      <div className="min-w-0">
                        <p className="safe-text font-bold text-slate-950 transition group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-200">
                          {entry.studentName || "Unknown student"}
                        </p>
                        <p className="safe-text mt-1 text-xs text-slate-500 dark:text-slate-400">
                          ID: {entry.id}
                        </p>
                        {entry.email && (
                          <p className="safe-text mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {entry.email}
                          </p>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="safe-text px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                    {entry.sec || "N/A"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="status-pill border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {entry.type || "N/A"}
                    </span>
                  </td>
                  <td className="safe-text px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                    {formatLoginTime(entry.loginTime)}
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
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Notifications ({unviewedCount})</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              Submission Management
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Review CR applications, feedback, suggestions, complaints, requests, and password changes.
            </p>
          </div>
          <button type="button" onClick={onRefresh} className="btn-secondary" disabled={loading}>
            <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <FormField id="submission-filter-type" label="Type">
            <select
              id="submission-filter-type"
              value={filters.type}
              onChange={(event) => onFilterChange("type", event.target.value)}
              className="form-field"
            >
              <option value="">All types</option>
              {SUBMISSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === "CR" ? "CR application" : type}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="submission-filter-viewed" label="Viewed">
            <select
              id="submission-filter-viewed"
              value={filters.viewed}
              onChange={(event) => onFilterChange("viewed", event.target.value)}
              className="form-field"
            >
              <option value="">All</option>
              <option value="false">Unviewed</option>
              <option value="true">Viewed</option>
            </select>
          </FormField>

          <FormField id="submission-filter-resolved" label="Resolved">
            <select
              id="submission-filter-resolved"
              value={filters.resolved}
              onChange={(event) => onFilterChange("resolved", event.target.value)}
              className="form-field"
            >
              <option value="">All</option>
              <option value="false">Pending</option>
              <option value="true">Resolved</option>
            </select>
          </FormField>

          <div className="flex items-end">
            <button type="button" onClick={onClearFilters} className="btn-secondary w-full">
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading submissions..." />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={<FiMessageSquare className="h-7 w-7" aria-hidden="true" />}
          title="No submissions found"
          description="New user submissions will appear here."
        />
      ) : (
        <div className="grid gap-4 p-5">
          {submissions.map((submission) => {
            const isExpanded = expandedSubmissionId === submission.id;
            const passwordChangeDetails = getPasswordChangeDetails(submission);
            const isPasswordChange = submission.type === PASSWORD_CHANGE_TYPE;

            return (
              <article
                key={submission.id}
                className={`rounded-lg border p-4 transition ${
                  submission.view
                    ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                    : "border-blue-300 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-500/10"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-pill border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                        {submission.type}
                      </span>
                      <ViewedStatus viewed={submission.view} />
                      <ResolvedStatus resolved={submission.resolved} />
                    </div>
                    <h3 className="mt-3">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(submission.by)}
                        className="safe-text text-left text-base font-bold text-slate-950 transition hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white dark:hover:text-blue-200"
                      >
                        {submission.studentName || "Student"} ({submission.by})
                      </button>
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {submission.studentSection || "No section"} - {formatLoginTime(submission.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenSubmission(submission)}
                      className="btn-secondary"
                    >
                      <FiEye aria-hidden="true" />
                      {isExpanded ? "Hide" : "View"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onStatusChange(submission.id, { resolved: !submission.resolved })}
                      className={submission.resolved ? "btn-secondary" : "btn-primary"}
                    >
                      <FiCheckCircle aria-hidden="true" />
                      {isPasswordChange
                        ? submission.resolved
                          ? "Mark pending"
                          : "Approve"
                        : submission.resolved
                          ? "Unresolve"
                          : "Resolve"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                      <div>
                        {isPasswordChange ? (
                          <>
                            <p className="section-kicker">Password change request</p>
                            <div className="mt-3 grid gap-2 text-sm">
                              <InfoLine label="Student ID" value={passwordChangeDetails.studentId || submission.by} />
                              <InfoLine label="Confirm ID" value={passwordChangeDetails.confirmStudentId || submission.by} />
                              <InfoLine label="Password hash" value={passwordChangeDetails.passwordHash || "N/A"} />
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="section-kicker">Description</p>
                            <p className="mt-2 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                              {submission.description}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="grid gap-2 text-sm">
                        <InfoLine label="Email" value={submission.studentEmail || "N/A"} />
                        <InfoLine label="Phone" value={submission.studentPhone || "N/A"} />
                        <InfoLine label="Updated" value={formatLoginTime(submission.updatedAt)} />
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
      className={
        viewed
          ? "status-pill border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          : "status-pill border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
      }
    >
      {viewed ? "Viewed" : "Unviewed"}
    </span>
  );
}

function ResolvedStatus({ resolved }) {
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

function InfoLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <span className="font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="safe-text text-right font-bold text-slate-950 dark:text-white">
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
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white ring-1 ring-slate-200 dark:bg-white dark:text-slate-950 dark:ring-slate-700">
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
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="section-kicker">Routine periods</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
            Period Time Management
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Update the 12-hour time windows used by routine pages and live class detection.
          </p>
        </div>
        <button type="button" onClick={onRefresh} className="btn-secondary" disabled={loading}>
          <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingState label="Loading periods..." />
      ) : periods.length === 0 ? (
        <EmptyState
          icon={<FiClock className="h-7 w-7" aria-hidden="true" />}
          title="No periods found"
          description="Run the latest migration to create and seed the period table."
        />
      ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          {genders.map((gender) => {
            const rows = periods
              .filter((periodItem) => periodItem.gender === gender)
              .sort((first, second) => Number(first.no) - Number(second.no));

            return (
              <div
                key={gender}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="section-kicker">{gender} shift</p>
                    <h3 className="mt-1 text-xl font-bold capitalize text-slate-950 dark:text-white">
                      {gender} periods
                    </h3>
                  </div>
                  <span className="status-pill border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {rows.length} slots
                  </span>
                </div>

                <div className="grid gap-3">
                  {rows.map((periodItem) => {
                    const periodKey = getPeriodKey(periodItem);
                    const invalid = !isValidPeriodRange(periodItem.startTime, periodItem.stopTime);
                    const saving = savingKey === periodKey;

                    return (
                      <article
                        key={periodKey}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-slate-950 dark:text-white">
                              Period {periodItem.no}
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <FormField id={`${periodKey}-start`} label="Start time">
                                <input
                                  id={`${periodKey}-start`}
                                  value={periodItem.startTime}
                                  onChange={(event) => onChange(periodItem, "startTime", event.target.value)}
                                  className="form-field"
                                  placeholder="10:40 AM"
                                  autoComplete="off"
                                />
                              </FormField>
                              <FormField id={`${periodKey}-stop`} label="Stop time">
                                <input
                                  id={`${periodKey}-stop`}
                                  value={periodItem.stopTime}
                                  onChange={(event) => onChange(periodItem, "stopTime", event.target.value)}
                                  className="form-field"
                                  placeholder="11:30 AM"
                                  autoComplete="off"
                                />
                              </FormField>
                            </div>
                            {invalid && (
                              <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-300">
                                Start time must not be after stop time.
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onSave(periodItem)}
                            disabled={saving || invalid}
                            className="btn-primary md:self-end"
                          >
                            <FiSave aria-hidden="true" />
                            {saving ? "Saving..." : "Save"}
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
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="surface-card p-6 sm:p-8">
        <SectionHeading
          kicker="Direct update"
          title="Update Role by Student"
          description="Search by student name or ID, choose the correct user, then apply a role."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {VALID_ROLES.map((role) => (
            <div
              key={role}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                Role
              </p>
              <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                {role}
              </p>
            </div>
          ))}
        </div>
      </div>

      <aside className="surface-card p-5">
        <SectionHeading kicker="Role editor" title="Update by ID or name" />
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <FormField
            id="custom-id"
            label="Student name or ID"
            helper={roleSearchLoading ? "Searching students..." : "Type at least 2 characters for suggestions."}
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
                placeholder="Search name or ID"
                className="form-field pl-12"
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
          <FormField id="custom-role" label="New role">
            <select
              id="custom-role"
              value={customType}
              onChange={(event) => onTypeChange(event.target.value)}
              className="form-field"
            >
              {VALID_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </FormField>
          <button type="submit" className="btn-primary w-full" disabled={updating}>
            {updating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Updating...
              </>
            ) : (
              <>
                <FiShield aria-hidden="true" />
                Update Role
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
    <ul className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      {suggestions.map((studentRecord) => (
        <li key={studentRecord.id}>
          <button
            type="button"
            onClick={() => onSelect(studentRecord)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800"
          >
            <AdminAvatar image={studentRecord.profilePic} name={studentRecord.name || studentRecord.id} />
            <span className="min-w-0 flex-1">
              <span className="safe-text block text-sm font-bold text-slate-950 dark:text-white">
                {studentRecord.name || "Student"}
              </span>
              <span className="safe-text mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                {studentRecord.id} - Section {studentRecord.sec || "N/A"}
              </span>
            </span>
            <span className="status-pill border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              {studentRecord.type || "N/A"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SelectedAdminStudent({ student, onOpenProfile }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
      <div className="flex items-center gap-3">
        <AdminAvatar image={student.profilePic} name={student.name || student.id} />
        <div className="min-w-0 flex-1">
          <p className="safe-text font-bold text-slate-950 dark:text-white">
            {student.name || "Student"}
          </p>
          <p className="safe-text mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {student.id} - Section {student.sec || "N/A"} - {student.type || "N/A"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpenProfile(student.id)}
        className="btn-secondary mt-3 w-full"
      >
        <FiEye aria-hidden="true" />
        Open profile
      </button>
    </div>
  );
}

/**
 * Paged controls for the CR user table.
 */
function PaginationControls({ pagination, disabled, onPageChange }) {
  const page = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <p className="font-semibold text-slate-600 dark:text-slate-300">
        Page {page} of {totalPages} - {total} result{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className="btn-secondary"
        >
          <FiChevronLeft aria-hidden="true" />
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className="btn-secondary"
        >
          Next
          <FiChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
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
