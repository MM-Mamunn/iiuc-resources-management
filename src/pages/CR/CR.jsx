"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiEdit3,
  FiGrid,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import api from "../../api";
import { useActiveSession } from "../../App";
import Header from "../components/Header";
import {
  EmptyState,
  FormField,
  MetricCard,
  Notice,
  PageShell,
  SectionHeading,
  SuggestionList,
} from "../components/ui";

const dayNames = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

/**
 * CR dashboard for reviewing and managing section classes.
 */
function CR() {
  const navigate = useNavigate();
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const [session, setSession] = useState("");
  const [sessionSuggestions, setSessionSuggestions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const sessionHelper = activeSessionLoading
    ? "Loading active session..."
    : activeSessionError || (activeSessionName ? `Active: ${activeSessionName}` : "Enter a session");
  const navigationCards = [
    {
      title: "Routine editor",
      description: "Bulk add and adjust section classes.",
      to: "/CR/routine",
      icon: FiPlus,
      tone: "blue",
    },
    {
      title: "Section routine",
      description: "Open the public timetable view.",
      to: "/routine/section",
      icon: FiCalendar,
      tone: "teal",
    },
    {
      title: "Course selection",
      description: "Review personal add/drop choices.",
      to: "/courseadddrop",
      icon: FiBookOpen,
      tone: "amber",
    },
  ];

  useEffect(() => {
    if (activeSessionName) {
      setSession((current) => current || activeSessionName);
    }
  }, [activeSessionName]);

  const handleSessionChange = async (event) => {
    const value = event.target.value;
    setSession(value);

    if (value.length < 1 || value.length > 30) {
      setSessionSuggestions([]);
      return;
    }

    setSessionLoading(true);
    try {
      const response = await api.get(`/api/lookLike/sessionLookLike/${value}`);
      const sessions = response.data?.rows?.map((row) => row.session) ?? [];
      setSessionSuggestions(sessions);
    } catch {
      setSessionSuggestions([]);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleShowAllCourse = async () => {
    if (!session.trim()) {
      setNotice({ type: "error", text: "Please enter a session." });
      return;
    }

    setLoading(true);
    setNotice(null);
    setCourses([]);

    try {
      const response = await api.post(`/api/class/allcourse/${session}`, {});
      setCourses(response.data?.rows ?? []);
    } catch (courseError) {
      setNotice({ type: "error", text: getLoadError(courseError) });
    } finally {
      setLoading(false);
      setSessionSuggestions([]);
    }
  };

  const handleDeleteCourse = async (course) => {
    const confirmDelete = window.confirm(
      `Delete this class?\n\nCourse: ${course.code}\nSection: ${course.sec}\nDay: ${dayNames[course.day]}\nSlot: ${course.slot}`
    );

    if (!confirmDelete) return;

    try {
      await api.post("/api/class/delete", {
        session: course.session,
        section: course.sec,
        code: course.code,
        day: course.day,
        slot: course.slot,
      });

      setCourses((current) =>
        current.filter((item) => item.class_id !== course.class_id)
      );
      setNotice({
        type: "success",
        text: `Deleted ${course.code} from ${course.sec}.`,
      });
    } catch (deleteError) {
      setNotice({ type: "error", text: getDeleteError(deleteError) });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="CR Dashboard"
            title="Class Management"
            description="Review all classes for a session, then open the routine editor when you need to add or adjust class data."
            actions={
              <button type="button" onClick={() => navigate("/cr/routine")} className="btn-primary">
                <FiPlus aria-hidden="true" />
                Edit routine
              </button>
            }
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <FormField
              id="session"
              label="Session"
              helper={sessionLoading ? "Loading suggestions..." : sessionHelper}
            >
              <div className="relative">
                <FiCalendar
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="session"
                  value={session}
                  onChange={handleSessionChange}
                  autoComplete="off"
                  type="text"
                  placeholder={activeSessionName || "Active session"}
                  className="form-field pl-12"
                />
                <SuggestionList
                  suggestions={sessionSuggestions}
                  onSelect={(suggestion) => {
                    setSession(suggestion);
                    setSessionSuggestions([]);
                  }}
                />
              </div>
            </FormField>

            <button
              type="button"
              onClick={handleShowAllCourse}
              disabled={loading}
              className="btn-secondary"
            >
              <FiSearch aria-hidden="true" />
              {loading ? "Loading..." : "Show classes"}
            </button>
          </div>
        </section>

        {notice && (
          <div className="mt-6">
            <Notice type={notice.type} onDismiss={() => setNotice(null)}>
              {notice.text}
            </Notice>
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {navigationCards.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="interactive-card group p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-lg ${getActionTone(item.tone)}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <FiArrowRight
                    className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-blue-300"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </button>
            );
          })}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiGrid className="h-5 w-5" aria-hidden="true" />}
            label="Loaded classes"
            value={courses.length}
            tone="blue"
          />
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Session"
            value={session || "N/A"}
            tone="teal"
          />
          <MetricCard
            icon={<FiEdit3 className="h-5 w-5" aria-hidden="true" />}
            label="Editor"
            value="Available"
            tone="amber"
          />
        </section>

        <section className="mt-8">
          {courses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <article key={course.class_id} className="interactive-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="section-kicker">Course</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                        {course.code}
                      </h2>
                    </div>
                    <span className="status-pill border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                      {course.sec}
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm">
                    <CourseField label="Faculty" value={course.faculty} />
                    <CourseField label="Room" value={course.room} />
                    <CourseField label="Day" value={dayNames[course.day]} />
                    <CourseField label="Slot" value={course.slot} />
                    <CourseField label="Session" value={course.session} />
                    <CourseField label="Added by" value={course.by} />
                  </dl>

                  <button
                    type="button"
                    onClick={() => handleDeleteCourse(course)}
                    className="btn-danger mt-5 w-full"
                  >
                    <FiTrash2 aria-hidden="true" />
                    Delete
                  </button>
                </article>
              ))}
            </div>
          ) : (
            !loading && (
              <div className="table-shell">
                <EmptyState
                  icon={<FiGrid className="h-7 w-7" aria-hidden="true" />}
                  title="No classes loaded"
                  description="Search a session to review its classes."
                />
              </div>
            )
          )}
        </section>
      </PageShell>
    </div>
  );
}

/**
 * One label/value row in a CR course card.
 */
function CourseField({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="safe-text text-right font-semibold text-slate-950 dark:text-white">
        {value || "N/A"}
      </dd>
    </div>
  );
}

function getActionTone(tone) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200",
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
  };

  return tones[tone] || tones.blue;
}

function getLoadError(error) {
  const status = error.response?.status;
  if (status === 404) return "The requested endpoint was not found.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Internal server error.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.message || "Could not load classes.";
}

function getDeleteError(error) {
  const status = error.response?.status;
  if (status === 404) return "Class not found.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Internal server error.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.message || "Could not delete the class.";
}

export default CR;
