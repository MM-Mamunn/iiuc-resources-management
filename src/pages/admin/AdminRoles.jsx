import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
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

  const refreshAdminData = useCallback(async () => {
    await Promise.all([fetchCrUsers(1), fetchSessions()]);
  }, [fetchCrUsers, fetchSessions]);

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
              disabled={loading || sessionsLoading}
            >
              <FiRefreshCw className={loading || sessionsLoading ? "animate-spin" : ""} aria-hidden="true" />
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
    <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="Admin features">
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

function getSessionError(error) {
  const errors = error.response?.data?.errors;

  if (errors && typeof errors === "object") {
    return Object.values(errors).filter(Boolean).join(" ");
  }

  return error.response?.data?.msg || error.message || "Failed to save session.";
}

export default AdminRoles;
