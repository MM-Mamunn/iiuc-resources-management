"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiBookOpen,
  FiChevronDown,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import api from "../../api";
import Header from "../components/Header";
import ResourceBrowser from "../components/ResourceBrowser";
import {
  EmptyState,
  FormField,
  LoadingState,
  MetricCard,
  Notice,
  PageShell,
  SectionHeading,
  SuggestionList,
  cx,
} from "../components/ui";

const SEMESTERS = Array.from({ length: 8 }, (_, index) => index + 1);

/**
 * Course directory grouped by semester with searchable course details.
 */
function CourseInfo() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [expandedCourses, setExpandedCourses] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [courseSuggestions, setCourseSuggestions] = useState([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groupedCourses = useMemo(() => {
    return courses.reduce((grouped, course) => {
      const semester = course.sem;
      if (!grouped[semester]) grouped[semester] = [];
      grouped[semester].push(course);
      return grouped;
    }, {});
  }, [courses]);

  const fetchCourses = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/info/course");
      setCourses(response.data?.rows || []);
    } catch (courseError) {
      setError(courseError instanceof Error ? courseError.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSearch = async (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    setSearchResult(null);
    setSearchError("");

    if (value.length < 1 || value.length > 15) {
      setCourseSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setCourseLoading(true);
    setShowSuggestions(true);
    try {
      const response = await api.get(`/api/lookLike/courseLookLike/${value}`);
      const suggestions = response.data?.rows?.map((row) => row.code) ?? [];
      setCourseSuggestions(suggestions);
    } catch {
      setCourseSuggestions([]);
    } finally {
      setCourseLoading(false);
    }
  };

  const handleCourseSelect = async (courseCode) => {
    setSearchQuery(courseCode);
    setShowSuggestions(false);
    setCourseSuggestions([]);
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);

    try {
      const response = await api.get(`/api/info/course/search/${courseCode}`);
      const result = response.data?.rows?.[0] || null;
      if (result) setSearchResult(result);
      else setSearchError("Course not found.");
    } catch (courseError) {
      if (courseError.response?.status === 404) setSearchError("Course not found.");
      else setSearchError("Error searching for course.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (searchQuery.trim()) handleCourseSelect(searchQuery.trim());
  };

  const toggleSemester = (semester) => {
    setExpandedSemesters((current) => ({
      ...current,
      [semester]: !current[semester],
    }));
  };

  const toggleCourse = (courseCode) => {
    setExpandedCourses((current) => ({
      ...current,
      [courseCode]: !current[courseCode],
    }));
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Catalog"
            title="Course Information"
            description="Search a course directly or browse the CSE curriculum by semester."
            actions={
              <button type="button" onClick={fetchCourses} className="btn-secondary" disabled={loading}>
                <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </button>
            }
          />

          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"
            ref={searchRef}
          >
            <FormField
              id="course-search"
              label="Course code"
              helper={courseLoading ? "Loading suggestions..." : "Example: CSE-1121"}
            >
              <div className="relative">
                <FiSearch
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="course-search"
                  type="text"
                  value={searchQuery}
                  onChange={handleCourseSearch}
                  placeholder="Search course"
                  className="form-field pl-12 uppercase"
                  autoComplete="off"
                />
                {showSuggestions && (
                  <SuggestionList
                    suggestions={courseSuggestions}
                    onSelect={handleCourseSelect}
                  />
                )}
              </div>
            </FormField>
            <button type="submit" className="btn-primary" disabled={searchLoading}>
              <FiSearch aria-hidden="true" />
              {searchLoading ? "Searching..." : "Search"}
            </button>
          </form>
        </section>

        {(error || searchError) && (
          <div className="mt-6">
            <Notice type="error" onDismiss={() => { setError(""); setSearchError(""); }}>
              {error || searchError}
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
            icon={<FiSearch className="h-5 w-5" aria-hidden="true" />}
            label="Search result"
            value={searchResult?.code || "None"}
            tone={searchResult ? "teal" : "amber"}
          />
          <MetricCard
            icon={<FiBookOpen className="h-5 w-5" aria-hidden="true" />}
            label="Semesters"
            value={SEMESTERS.length}
            tone="teal"
          />
        </section>

        {searchResult && (
          <CourseDetailCard course={searchResult} className="mt-8" />
        )}

        <section className="surface-card mt-8 p-5">
          <SectionHeading
            kicker="Browse"
            title="Courses by semester"
            description="Expand a semester, then open any course to see prerequisites and shared resources."
          />

          <div className="mt-6">
            {loading ? (
              <LoadingState label="Loading courses..." />
            ) : courses.length === 0 ? (
              <EmptyState
                icon={<FiBookOpen className="h-7 w-7" aria-hidden="true" />}
                title="No courses found"
                description="Course information is not available at the moment."
                action={
                  <button type="button" onClick={fetchCourses} className="btn-primary">
                    Try again
                  </button>
                }
              />
            ) : (
              <div className="grid gap-3">
                {SEMESTERS.map((semester) => {
                  const semesterCourses = groupedCourses[semester] || [];
                  const isExpanded = expandedSemesters[semester];

                  return (
                    <article key={semester} className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => toggleSemester(semester)}
                        className="flex w-full items-center justify-between gap-4 rounded-lg px-4 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-900"
                        aria-expanded={Boolean(isExpanded)}
                      >
                        <span>
                          <span className="block text-lg font-bold text-slate-950 dark:text-white">
                            Semester {semester}
                          </span>
                          <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                            {semesterCourses.length} courses
                          </span>
                        </span>
                        <FiChevronDown
                          className={cx("h-5 w-5 text-slate-500 transition", isExpanded && "rotate-180")}
                          aria-hidden="true"
                        />
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                          {semesterCourses.length === 0 ? (
                            <EmptyState
                              title="No courses available"
                              description="This semester does not have course data yet."
                            />
                          ) : (
                            <div className="grid gap-3">
                              {semesterCourses.map((course) => {
                                const courseKey = `${semester}-${course.code}`;
                                const isCourseExpanded = expandedCourses[courseKey];

                                return (
                                  <CourseAccordion
                                    key={courseKey}
                                    course={course}
                                    isExpanded={Boolean(isCourseExpanded)}
                                    onToggle={() => toggleCourse(courseKey)}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </PageShell>
    </div>
  );
}

/**
 * Expandable course row in a semester accordion.
 */
function CourseAccordion({ course, isExpanded, onToggle }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 rounded-lg px-4 py-4 text-left transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-950"
        aria-expanded={isExpanded}
      >
        <span className="min-w-0">
          <span className="safe-text block font-bold text-slate-950 dark:text-white">
            {course.code}
          </span>
          <span className="safe-text mt-1 block text-sm text-slate-600 dark:text-slate-400">
            {course.title}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="status-pill border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            {course.credit} credits
          </span>
          <span className="status-pill border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
            {course.type}
          </span>
          <FiChevronDown
            className={cx("h-5 w-5 text-slate-500 transition", isExpanded && "rotate-180")}
            aria-hidden="true"
          />
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <CourseDetail course={course} />
        </div>
      )}
    </article>
  );
}

/**
 * Full course detail panel used by search results.
 */
function CourseDetailCard({ course, className = "" }) {
  return (
    <section className={cx("surface-card p-5", className)}>
      <SectionHeading kicker="Course details" title={course.code} description={course.title} />
      <div className="mt-5">
        <CourseDetail course={course} />
      </div>
    </section>
  );
}

/**
 * Shared course fields and submitted resources.
 */
function CourseDetail({ course }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <InfoTile label="Credit" value={course.credit} />
        <InfoTile label="Semester" value={course.sem} />
        <InfoTile label="Type" value={course.type} />
        <InfoTile label="Short name" value={course.short_name} />
        <InfoTile label="Prerequisites" value={course.prereq || "None"} />
      </div>

      <ResourceBrowser
        title="Course resources"
        description={`Shared links submitted for ${course.code}.`}
        courseCode={course.code}
        framed={false}
        limit={6}
      />
    </div>
  );
}

/**
 * Compact course metadata tile.
 */
function InfoTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="safe-text mt-2 font-semibold text-slate-950 dark:text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

export default CourseInfo;
