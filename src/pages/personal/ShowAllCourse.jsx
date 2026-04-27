"use client";

import { useEffect, useState } from "react";
import { FiBookOpen, FiCalendar, FiSearch, FiTrash2 } from "react-icons/fi";
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

/**
 * Shows a student's saved courses for a selected session.
 */
function ShowAllCourse() {
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const [formData, setFormData] = useState({
    session: "",
  });
  const [sessionSuggestions, setSessionSuggestions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState({});
  const sessionHelper = activeSessionLoading
    ? "Loading active session..."
    : activeSessionError || (activeSessionName ? `Active: ${activeSessionName}` : "Enter a session");

  useEffect(() => {
    if (activeSessionName) {
      setFormData((current) => ({
        ...current,
        session: current.session || activeSessionName,
      }));
    }
  }, [activeSessionName]);

  const totalCredits = courses.reduce((sum, course) => {
    const credit = Number.parseFloat(course.credit || course.credits || 0);
    return sum + credit;
  }, 0);

  const handleSessionChange = async (event) => {
    const value = event.target.value;
    setFormData((current) => ({ ...current, session: value }));

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

  const handleSearch = async (event) => {
    event.preventDefault();
    setSearching(true);
    setNotice(null);
    setCourses([]);
    setHasSearched(true);

    try {
      const response = await api.post("/api/user/course_show", {
        session: formData.session,
      });
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (searchError) {
      setNotice({ type: "error", text: getSearchError(searchError) });
    } finally {
      setSearching(false);
      setSessionSuggestions([]);
    }
  };

  const handleDeleteCourse = async (courseItem, index) => {
    const confirmDelete = window.confirm(
      `Remove this course from your saved courses?\n\n${courseItem.code} - ${courseItem.sec}`
    );
    if (!confirmDelete) return;

    const courseId = `${courseItem.code}-${courseItem.sec}-${courseItem.session}`;
    setDeletingCourse((current) => ({ ...current, [courseId]: true }));
    setNotice(null);

    try {
      await api.post("/api/user/course_delete", {
        session: courseItem.session,
        section: courseItem.sec,
        code: courseItem.code,
      });
      setCourses((current) => current.filter((_, itemIndex) => itemIndex !== index));
      setNotice({
        type: "success",
        text: `${courseItem.code} was removed from your courses.`,
      });
    } catch (deleteError) {
      setNotice({ type: "error", text: getDeleteError(deleteError) });
    } finally {
      setDeletingCourse((current) => ({ ...current, [courseId]: false }));
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Personal courses"
            title="Saved Courses"
            description="Search a session to review your saved course list and remove outdated courses."
          />

          <form onSubmit={handleSearch} className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
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
                  name="session"
                  value={formData.session}
                  onChange={handleSessionChange}
                  autoComplete="off"
                  type="text"
                  placeholder={activeSessionName || "Active session"}
                  className="form-field pl-12"
                  required
                />
                <SuggestionList
                  suggestions={sessionSuggestions}
                  onSelect={(suggestion) => {
                    setFormData((current) => ({ ...current, session: suggestion }));
                    setSessionSuggestions([]);
                  }}
                />
              </div>
            </FormField>

            <button type="submit" disabled={searching} className="btn-primary">
              <FiSearch aria-hidden="true" />
              {searching ? "Searching..." : "Search courses"}
            </button>
          </form>
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
            icon={<FiBookOpen className="h-5 w-5" aria-hidden="true" />}
            label="Courses"
            value={courses.length}
            tone="blue"
          />
          <MetricCard
            icon={<FiBookOpen className="h-5 w-5" aria-hidden="true" />}
            label="Total credits"
            value={totalCredits.toFixed(1)}
            tone="teal"
          />
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Session"
            value={formData.session}
            tone="amber"
          />
        </section>

        <section className="mt-8">
          {courses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course, index) => {
                const courseId = `${course.code}-${course.sec}-${course.session}`;

                return (
                  <article key={courseId} className="interactive-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="section-kicker">Course</p>
                        <h2 className="safe-text mt-1 text-xl font-bold text-slate-950 dark:text-white">
                          {course.code}
                        </h2>
                        {course.title && (
                          <p className="safe-text mt-2 text-sm text-slate-600 dark:text-slate-400">
                            {course.title}
                          </p>
                        )}
                      </div>
                      {(course.credit || course.credits) && (
                        <span className="status-pill border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                          {Number.parseFloat(course.credit || course.credits).toFixed(1)} credits
                        </span>
                      )}
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm">
                      <CourseField label="Section" value={course.sec} />
                      <CourseField label="Teacher" value={`${course.name || ""}${course.faculty ? ` (${course.faculty})` : ""}`} />
                      <CourseField label="Session" value={course.session} />
                    </dl>

                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(course, index)}
                      disabled={deletingCourse[courseId]}
                      className="btn-danger mt-5 w-full"
                    >
                      <FiTrash2 aria-hidden="true" />
                      {deletingCourse[courseId] ? "Deleting..." : "Delete"}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            hasSearched &&
            !searching && (
              <div className="table-shell">
                <EmptyState
                  icon={<FiBookOpen className="h-7 w-7" aria-hidden="true" />}
                  title="No courses found"
                  description="No saved courses were found for this session."
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
 * Course card label/value pair.
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

function getSearchError(error) {
  const status = error.response?.status;
  if (status === 404) return "No courses found for this session.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 500) return "Server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not search courses.";
}

function getDeleteError(error) {
  const status = error.response?.status;
  if (status === 404) return "The course could not be found.";
  if (status === 401) return "This course cannot be removed from your personal schedule.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not delete course.";
}

export default ShowAllCourse;
