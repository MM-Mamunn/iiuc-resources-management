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
  FiMessageSquare,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiShield,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import api from "../../api";
import campusImage from "../../assets/iiuc.webp";
import { useActiveSession, useAuth } from "../../App";
import {
  createSession,
  listSessions,
  updateSession,
} from "../../services/sessionService";
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
const SUBMISSION_TYPES = ["CR", "Feedback", "Suggestion", "Complaint", "Request"];
const emptySessionForm = {
  session: "",
  start: "",
  stop: "",
  isActive: true,
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
      fetchSubmissionNotifications(),
    ]);
  }, [fetchCrUsers, fetchLoginLogs, fetchSessions, fetchSubmissionNotifications]);

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

  const updateRole = async (studentId, role) => {
    setMessage(null);
    try {
      const response = await api.put(`/api/admin/users/${studentId}/type`, {
        type: role,
      });
      setMessage({
        type: "success",
        text: `Updated ${response.data.name || studentId} to ${role}.`,
      });
      await fetchCrUsers(crPagination.page);
    } catch (roleError) {
      setMessage({
        type: "error",
        text: roleError.response?.data?.msg || "Failed to update role.",
      });
    }
  };

  const handleCustomUpdate = async (event) => {
    event.preventDefault();
    if (!customId.trim()) {
      setMessage({ type: "error", text: "Please enter a student id." });
      return;
    }

    await updateRole(customId.trim(), customType);
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
      await api.patch(`/api/admin/submissions/${submissionId}`, updates);
      await Promise.all([
        fetchAdminSubmissions(submissionPagination.page),
        fetchSubmissionNotifications(),
      ]);

      if (!quiet) {
        setMessage({ type: "success", text: "Submission updated." });
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
              disabled={loading || sessionsLoading || loginLogsLoading || submissionsLoading}
            >
              <FiRefreshCw className={loading || sessionsLoading || loginLogsLoading || submissionsLoading ? "animate-spin" : ""} aria-hidden="true" />
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
            />
          )}

          {activeFeature === "loginLogs" && (
            <LoginLogsFeature
              loginLogs={loginLogs}
              loading={loginLogsLoading}
              onRefresh={fetchLoginLogs}
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
            />
          )}

          {activeFeature === "roleUpdate" && (
            <DirectRoleFeature
              customId={customId}
              customType={customType}
              onIdChange={setCustomId}
              onTypeChange={setCustomType}
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
    <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Admin features">
      {features.map((feature) => {
        const Icon = feature.icon;
        const isActive = activeFeature === feature.id;

        return (
          <button
            key={feature.id}
            type="button"
            onClick={() => onSelect(feature.id)}
            className={cx(
              "interactive-card min-h-36 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isActive && "border-blue-400 bg-blue-50/80 dark:border-blue-500 dark:bg-blue-500/10",
            )}
          >
            <span className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-2xl font-black text-slate-950 dark:text-white">
                {feature.value}
              </span>
            </span>
            <span className="mt-4 block text-lg font-bold text-slate-950 dark:text-white">
              {feature.title}
            </span>
            <span className="mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-400">
              {feature.description}
            </span>
          </button>
        );
      })}
    </section>
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
                    <p className="safe-text font-bold text-slate-950 dark:text-white">
                      {student.name || "Student"}
                    </p>
                    <p className="safe-text mt-1 text-xs text-slate-500 dark:text-slate-400">
                      ID: {student.id}
                    </p>
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
function LoginLogsFeature({ loginLogs, loading, onRefresh }) {
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
                    <div className="flex items-center gap-3">
                      <AdminAvatar image={entry.profilePic} name={entry.studentName || entry.id} />
                      <div className="min-w-0">
                        <p className="safe-text font-bold text-slate-950 dark:text-white">
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
                    </div>
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
              Review CR applications, feedback, suggestions, complaints, and requests.
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
                    <h3 className="safe-text mt-3 text-base font-bold text-slate-950 dark:text-white">
                      {submission.studentName || "Student"} ({submission.by})
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
                      {submission.resolved ? "Unresolve" : "Resolve"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                      <div>
                        <p className="section-kicker">Description</p>
                        <p className="mt-2 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                          {submission.description}
                        </p>
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
 * Direct user role update feature panel.
 */
function DirectRoleFeature({
  customId,
  customType,
  onIdChange,
  onTypeChange,
  onSubmit,
}) {
  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="surface-card p-6 sm:p-8">
        <SectionHeading
          kicker="Direct update"
          title="Update Role by Student ID"
          description="Use this feature when a user is not visible in the CR list or when you need to promote a student directly."
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
        <SectionHeading kicker="Role editor" title="Update by ID" />
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <FormField id="custom-id" label="Student ID">
            <input
              id="custom-id"
              value={customId}
              onChange={(event) => onIdChange(event.target.value)}
              placeholder="Enter student id"
              className="form-field"
            />
          </FormField>
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
          <button type="submit" className="btn-primary w-full">
            Update role
          </button>
        </form>
      </aside>
    </section>
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

function getSessionError(error) {
  const errors = error.response?.data?.errors;

  if (errors && typeof errors === "object") {
    return Object.values(errors).filter(Boolean).join(" ");
  }

  return error.response?.data?.msg || error.message || "Failed to save session.";
}

export default AdminRoles;
