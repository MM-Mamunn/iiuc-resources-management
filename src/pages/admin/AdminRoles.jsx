import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiRefreshCw, FiShield, FiUserCheck, FiUsers } from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
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

/**
 * Admin-only role management screen.
 */
const AdminRoles = () => {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [crUsers, setCrUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [customId, setCustomId] = useState("");
  const [customType, setCustomType] = useState("student");

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

    fetchCrUsers();
  }, [isLoggedIn, user, navigate]);

  const fetchCrUsers = async () => {
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
  };

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
              <button type="button" onClick={fetchCrUsers} className="btn-secondary" disabled={loading}>
                <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
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

export default AdminRoles;
