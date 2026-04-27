import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCalendar,
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
} from "../components/ui";

const VALID_ROLES = ["ADMIN", "cr", "student"];
const emptySessionForm = {
  session: "",
  start: "",
  stop: "",
  isActive: true,
};

/**
 * Admin-only role management screen.
 */
const AdminRoles = () => {
  const { user, isLoggedIn } = useAuth();
  const { refreshActiveSession } = useActiveSession();
  const navigate = useNavigate();
  const [crUsers, setCrUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [customId, setCustomId] = useState("");
  const [customType, setCustomType] = useState("student");
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);

  const fetchCrUsers = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.get("/api/admin/cr-users");
      setCrUsers(Array.isArray(response.data) ? response.data : []);
    } catch (roleError) {
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
    await Promise.all([fetchCrUsers(), fetchSessions()]);
  }, [fetchCrUsers, fetchSessions]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/auth/login", { replace: true });
      return;
    }

    if (user && String(user.type || "").toUpperCase() !== "ADMIN") {
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
      await fetchCrUsers();
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

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Admin"
            title="Role Management"
            description="View CR accounts and update user roles with a clearer, auditable interface."
            actions={
              <button
                type="button"
                onClick={refreshAdminData}
                className="btn-secondary"
                disabled={loading || sessionsLoading}
              >
                <FiRefreshCw className={loading || sessionsLoading ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </button>
            }
          />
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
            value={crUsers.length}
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

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="surface-card p-5">
            <SectionHeading
              kicker="Sessions"
              title="Session Management"
              actions={
                <button
                  type="button"
                  onClick={fetchSessions}
                  className="btn-secondary"
                  disabled={sessionsLoading}
                >
                  <FiRefreshCw className={sessionsLoading ? "animate-spin" : ""} aria-hidden="true" />
                  Refresh
                </button>
              }
            />

            <div className="mt-6">
              {sessionsLoading ? (
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
                          onClick={() => beginEditSession(sessionItem)}
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

            <form onSubmit={handleSessionSubmit} className="mt-6 space-y-5">
              <FormField id="session-name" label="Session name">
                <input
                  id="session-name"
                  value={sessionForm.session}
                  onChange={(event) => updateSessionForm("session", event.target.value)}
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
                  onChange={(event) => updateSessionForm("start", event.target.value)}
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
                  onChange={(event) => updateSessionForm("isActive", event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>

              <FormField id="session-stop" label="Stop date">
                <input
                  id="session-stop"
                  type="date"
                  value={sessionForm.stop}
                  onChange={(event) => updateSessionForm("stop", event.target.value)}
                  className="form-field"
                  disabled={sessionForm.isActive}
                  required={!sessionForm.isActive}
                />
              </FormField>

              <div className="flex flex-wrap justify-end gap-3">
                {editingSession && (
                  <button type="button" onClick={resetSessionForm} className="btn-secondary">
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
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="surface-card p-5">
            <SectionHeading kicker="Users" title="CR Users" />

            <div className="mt-6">
              {loading ? (
                <LoadingState label="Loading CR users..." />
              ) : crUsers.length === 0 ? (
                <EmptyState
                  icon={<FiUsers className="h-7 w-7" aria-hidden="true" />}
                  title="No CR users found"
                  description="Refresh the list after assigning CR roles."
                />
              ) : (
                <div className="grid gap-4">
                  {crUsers.map((student) => (
                    <article key={student.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-500 dark:text-slate-400">Student</p>
                          <h2 className="safe-text mt-1 text-xl font-bold text-slate-950 dark:text-white">
                            {student.name || student.id}
                          </h2>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            ID: <span className="font-semibold">{student.id}</span>
                            {" "}- Section: <span className="font-semibold">{student.sec || "N/A"}</span>
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                          <FormField id={`role-${student.id}`} label="Role">
                            <select
                              id={`role-${student.id}`}
                              value={student.type}
                              onChange={(event) => updateRole(student.id, event.target.value)}
                              className="form-field"
                            >
                              {VALID_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          </FormField>
                          <button
                            type="button"
                            onClick={() => updateRole(student.id, student.type)}
                            className="btn-secondary"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="surface-card p-5">
            <SectionHeading
              kicker="Direct update"
              title="Update by ID"
              description="Use this when a user is not already visible in the CR list."
            />
            <form onSubmit={handleCustomUpdate} className="mt-6 space-y-5">
              <FormField id="custom-id" label="Student ID">
                <input
                  id="custom-id"
                  value={customId}
                  onChange={(event) => setCustomId(event.target.value)}
                  placeholder="Enter student id"
                  className="form-field"
                />
              </FormField>
              <FormField id="custom-role" label="New role">
                <select
                  id="custom-role"
                  value={customType}
                  onChange={(event) => setCustomType(event.target.value)}
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
      </PageShell>
    </div>
  );
};

function getSessionError(error) {
  const errors = error.response?.data?.errors;

  if (errors && typeof errors === "object") {
    return Object.values(errors).filter(Boolean).join(" ");
  }

  return error.response?.data?.msg || error.message || "Failed to save session.";
}

export default AdminRoles;
