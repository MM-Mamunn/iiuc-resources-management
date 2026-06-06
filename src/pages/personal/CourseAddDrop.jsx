"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import api from "../../api";
import { useActiveSession } from "../../App";
import {
  FACULTY_SEARCH_MAX_LENGTH,
  formatFacultyLabel,
} from "../../services/facultySearchService";
import { clearCacheByPrefix } from "../../services/cacheService";
import Header from "../components/Header";
import { notify } from "../components/notifications";
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
 * Search classes and add/drop them from the personal routine.
 */
function PersonalCourseManage() {
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const [formData, setFormData] = useState({
    session: "",
    section: "",
    code: "",
    faculty: "",
  });
  const [suggestions, setSuggestions] = useState({
    session: [],
    section: [],
    code: [],
    faculty: [],
  });
  const [loadingField, setLoadingField] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [rowState, setRowState] = useState({});
  const [courseCodeEnabled, setCourseCodeEnabled] = useState(false);
  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [facultyEnabled, setFacultyEnabled] = useState(false);
  const [courseStatuses, setCourseStatuses] = useState({});
  const [statusLoading, setStatusLoading] = useState(false);
  const sessionHelper = activeSessionLoading
    ? "Loading active session..."
    : activeSessionError || (activeSessionName ? `Active: ${activeSessionName}` : "");

  useEffect(() => {
    if (activeSessionName) {
      setFormData((current) => ({
        ...current,
        session: current.session || activeSessionName,
      }));
    }
  }, [activeSessionName]);

  const updateSuggestions = async ({ key, value, endpoint, mapValue, maxLength }) => {
    setFormData((current) => ({ ...current, [key]: value }));

    if (value.length < 1 || value.length > maxLength) {
      setSuggestions((current) => ({ ...current, [key]: [] }));
      return;
    }

    setLoadingField(key);
    try {
      const response = await api.get(`${endpoint}/${encodeURIComponent(value)}`);
      const nextSuggestions =
        response.data?.rows?.map(mapValue || ((row) => row)) ?? [];
      setSuggestions((current) => ({ ...current, [key]: nextSuggestions }));
    } catch {
      setSuggestions((current) => ({ ...current, [key]: [] }));
    } finally {
      setLoadingField("");
    }
  };

  const chooseSuggestion = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
    setSuggestions((current) => ({ ...current, [key]: [] }));
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    if (!formData.session.trim()) {
      setNotice({ type: "error", text: "Session is required." });
      return;
    }

    const hasCourseCode = courseCodeEnabled && formData.code.trim();
    const hasSection = sectionEnabled && formData.section.trim();
    const hasFaculty = facultyEnabled && formData.faculty.trim();

    if (!hasCourseCode && !hasSection && !hasFaculty) {
      setNotice({
        type: "error",
        text: "Enable and provide course code, section, faculty, or any combination before searching.",
      });
      return;
    }

    setSearching(true);
    setNotice(null);
    setSearchResults([]);
    setHasSearched(true);
    setRowState({});
    setCourseStatuses({});

    try {
      const requestBody = { session: formData.session };
      if (sectionEnabled && formData.section.trim()) requestBody.section = formData.section;
      if (courseCodeEnabled && formData.code.trim()) requestBody.code = formData.code;
      if (facultyEnabled && formData.faculty.trim()) requestBody.faculty = formData.faculty;

      const response = await api.post("/api/class/search", requestBody);
      setSearchResults(response.data?.rows ?? []);
    } catch (searchError) {
      setNotice({ type: "error", text: getSearchError(searchError) });
    } finally {
      setSearching(false);
      setSuggestions({ session: [], section: [], code: [], faculty: [] });
    }
  };

  const setItemState = (index, patch) => {
    setRowState((current) => ({
      ...current,
      [index]: {
        ...(current[index] || {}),
        ...patch,
      },
    }));
  };

  const refreshClassStatus = useCallback(async (classItem, index) => {
    const key = getClassResultKey(classItem, index);

    try {
      const response = await api.post("/api/user/course_conflict", {
        code: classItem.code,
        section: classItem.sec,
        session: classItem.session,
      });
      const nextStatus = normalizeCourseStatus(response.data, classItem);

      setCourseStatuses((current) => ({ ...current, [key]: nextStatus }));
      return nextStatus;
    } catch (statusError) {
      const nextStatus = normalizeCourseStatusError(statusError, classItem);
      setCourseStatuses((current) => ({ ...current, [key]: nextStatus }));
      return nextStatus;
    }
  }, []);

  useEffect(() => {
    if (!searchResults.length) {
      setCourseStatuses({});
      setStatusLoading(false);
      return undefined;
    }

    let ignoreResult = false;

    async function loadCourseStatuses() {
      setStatusLoading(true);

      const statusEntries = await Promise.all(
        searchResults.map(async (classItem, index) => {
          try {
            const response = await api.post("/api/user/course_conflict", {
              code: classItem.code,
              section: classItem.sec,
              session: classItem.session,
            });

            return [
              getClassResultKey(classItem, index),
              normalizeCourseStatus(response.data, classItem),
            ];
          } catch (statusError) {
            return [
              getClassResultKey(classItem, index),
              normalizeCourseStatusError(statusError, classItem),
            ];
          }
        }),
      );

      if (!ignoreResult) {
        setCourseStatuses(Object.fromEntries(statusEntries));
        setStatusLoading(false);
      }
    }

    loadCourseStatuses();

    return () => {
      ignoreResult = true;
    };
  }, [searchResults]);

  const handleAddClass = async (classItem, index) => {
    const currentStatus =
      courseStatuses[getClassResultKey(classItem, index)] ||
      (await refreshClassStatus(classItem, index));

    if (currentStatus.state === "enrolled" && currentStatus.sameSection) {
      notify({
        type: "warning",
        message: `${classItem.code} (${classItem.sec}): ${currentStatus.message}`,
      });
      return;
    }

    setItemState(index, {
      adding: true,
    });

    try {
      await api.post("/api/user/course_insert", {
        session: classItem.session,
        section: classItem.sec,
        code: classItem.code,
      });
      notify({
        type: "success",
        message: `${classItem.code} (${classItem.sec}) added successfully.`,
      });
      clearCacheByPrefix("dashboard:personal-routine:");
      await refreshClassStatus(classItem, index);
    } catch (addError) {
      notify({
        type: "error",
        message: `${classItem.code} (${classItem.sec}): ${getAddError(addError)}`,
      });
    } finally {
      setItemState(index, { adding: false });
    }
  };

  const handleDeleteClass = async (classItem, index) => {
    const currentStatus =
      courseStatuses[getClassResultKey(classItem, index)] ||
      (await refreshClassStatus(classItem, index));

    if (currentStatus.state === "enrolled" && !currentStatus.sameSection) {
      notify({
        type: "warning",
        message: `${classItem.code} is enrolled in section ${currentStatus.enrolledSection}, not ${classItem.sec}.`,
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Remove this course from your personal routine?\n\n${classItem.code} - ${classItem.sec}`
    );
    if (!confirmDelete) return;

    setItemState(index, {
      deleting: true,
    });

    try {
      await api.post("/api/user/course_delete", {
        session: classItem.session,
        section: classItem.sec,
        code: classItem.code,
      });
      notify({
        type: "success",
        message: `${classItem.code} (${classItem.sec}) removed successfully.`,
      });
      clearCacheByPrefix("dashboard:personal-routine:");
      await refreshClassStatus(classItem, index);
    } catch (deleteError) {
      notify({
        type: "error",
        message: `${classItem.code} (${classItem.sec}): ${getDeleteError(deleteError)}`,
      });
    } finally {
      setItemState(index, { deleting: false });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Course planner"
            title="Add / Drop Personal Courses"
            description="Search by course, section, faculty, or a combination. Each result shows its add/drop status automatically."
          />

          <form onSubmit={handleSearch} className="mt-6 grid gap-5" autoComplete="off">
            <div className="grid gap-4 md:grid-cols-3">
              <SearchToggle
                id="course-toggle"
                label="Search by course code"
                checked={courseCodeEnabled}
                onChange={(checked) => {
                  setCourseCodeEnabled(checked);
                  if (!checked) {
                    setFormData((current) => ({ ...current, code: "" }));
                    setSuggestions((current) => ({ ...current, code: [] }));
                  }
                }}
              />
              <SearchToggle
                id="section-toggle"
                label="Search by section"
                checked={sectionEnabled}
                onChange={(checked) => {
                  setSectionEnabled(checked);
                  if (!checked) {
                    setFormData((current) => ({ ...current, section: "" }));
                    setSuggestions((current) => ({ ...current, section: [] }));
                  }
                }}
              />
              <SearchToggle
                id="faculty-toggle"
                label="Search by faculty"
                checked={facultyEnabled}
                onChange={(checked) => {
                  setFacultyEnabled(checked);
                  if (!checked) {
                    setFormData((current) => ({ ...current, faculty: "" }));
                    setSuggestions((current) => ({ ...current, faculty: [] }));
                  }
                }}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {courseCodeEnabled && (
                <AutocompleteField
                  id="code"
                  label="Course code"
                  value={formData.code}
                  placeholder="CSE-1121"
                  loading={loadingField === "code"}
                  suggestions={suggestions.code}
                  onChange={(value) =>
                    updateSuggestions({
                      key: "code",
                      value,
                      endpoint: "/api/lookLike/courseLookLike",
                      mapValue: (row) => row.code,
                      maxLength: 15,
                    })
                  }
                  onSelect={(value) => chooseSuggestion("code", value)}
                />
              )}

              {sectionEnabled && (
                <AutocompleteField
                  id="section"
                  label="Section"
                  value={formData.section}
                  placeholder="1AM"
                  loading={loadingField === "section"}
                  suggestions={suggestions.section}
                  onChange={(value) =>
                    updateSuggestions({
                      key: "section",
                      value,
                      endpoint: "/api/lookLike/sectionLookLike",
                      mapValue: (row) => row.sec,
                      maxLength: 4,
                    })
                  }
                  onSelect={(value) => chooseSuggestion("section", value)}
                />
              )}

              {facultyEnabled && (
                <AutocompleteField
                  id="faculty"
                  label="Faculty"
                  value={formData.faculty}
                  placeholder="JAA or Abdullah"
                  loading={loadingField === "faculty"}
                  suggestions={suggestions.faculty}
                  getSuggestionLabel={formatFacultyLabel}
                  onChange={(value) =>
                    updateSuggestions({
                      key: "faculty",
                      value,
                      endpoint: "/api/lookLike/facultyAnyLookLike",
                      maxLength: FACULTY_SEARCH_MAX_LENGTH,
                    })
                  }
                  onSelect={(faculty) => chooseSuggestion("faculty", faculty.code || faculty.name || "")}
                />
              )}

              <AutocompleteField
                id="session"
                label="Session"
                value={formData.session}
                placeholder={activeSessionName || "Active session"}
                loading={loadingField === "session"}
                helper={loadingField === "session" ? "" : sessionHelper}
                suggestions={suggestions.session}
                onChange={(value) =>
                  updateSuggestions({
                    key: "session",
                    value,
                    endpoint: "/api/lookLike/sessionLookLike",
                    mapValue: (row) => row.session,
                    maxLength: 30,
                  })
                }
                onSelect={(value) => chooseSuggestion("session", value)}
              />
            </div>

            <button type="submit" disabled={searching} className="btn-primary w-full md:w-fit">
              <FiSearch aria-hidden="true" />
              {searching ? "Searching..." : "Search classes"}
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
            icon={<FiSearch className="h-5 w-5" aria-hidden="true" />}
            label="Search results"
            value={searchResults.length}
            tone="violet"
          />
          <MetricCard
            icon={<FiCheckCircle className="h-5 w-5" aria-hidden="true" />}
            label="Course status"
            value={statusLoading ? "Checking" : "Auto-detected"}
            tone="green"
          />
          <MetricCard
            icon={<FiUser className="h-5 w-5" aria-hidden="true" />}
            label="Faculty filter"
            value={facultyEnabled ? "Enabled" : "Off"}
            tone="amber"
          />
        </section>

        <section className="mt-8">
          {searchResults.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {searchResults.map((classItem, index) => (
                <ClassResultCard
                  key={`${classItem.code}-${classItem.sec}-${classItem.session}-${index}`}
                  classItem={classItem}
                  state={rowState[index] || {}}
                  status={courseStatuses[getClassResultKey(classItem, index)]}
                  statusLoading={statusLoading}
                  onAdd={() => handleAddClass(classItem, index)}
                  onDelete={() => handleDeleteClass(classItem, index)}
                />
              ))}
            </div>
          ) : (
            hasSearched &&
            !searching && (
              <div className="table-shell">
                <EmptyState
                  icon={<FiSearch className="h-7 w-7" aria-hidden="true" />}
                  title="No classes found"
                  description="Try broadening your search criteria."
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
 * Toggle card for enabling optional search filters.
 */
function SearchToggle({ id, label, checked, onChange }) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 transition hover:border-violet-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
    >
      <span>{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

/**
 * Autocomplete input used in the search form.
 */
function AutocompleteField({
  id,
  label,
  value,
  placeholder,
  loading,
  helper,
  suggestions,
  getSuggestionLabel,
  onChange,
  onSelect,
}) {
  return (
    <FormField id={id} label={label} helper={loading ? "Loading suggestions..." : helper}>
      <div className="relative">
        <input
          id={id}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          type="text"
          placeholder={placeholder}
          className="form-field"
          required
        />
        <SuggestionList
          suggestions={suggestions}
          getLabel={getSuggestionLabel}
          onSelect={onSelect}
        />
      </div>
    </FormField>
  );
}

/**
 * Search result card with automatic enrollment and overlap status.
 */
function ClassResultCard({
  classItem,
  state,
  status,
  statusLoading,
  onAdd,
  onDelete,
}) {
  const statusView = getStatusView(status, statusLoading);

  return (
    <article className="interactive-card overflow-hidden">
      <div className="border-b border-slate-200 p-5 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="section-kicker">Class</p>
            <h2 className="safe-text mt-1 text-2xl font-black text-slate-950 dark:text-white">
              {classItem.code}
            </h2>
            {classItem.title && (
              <p className="safe-text mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {classItem.title}
              </p>
            )}
          </div>
          <span className="status-pill border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
            Section {classItem.sec}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${statusView.className}`}>
          <div className="flex items-start gap-3">
            <statusView.icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p>{statusView.label}</p>
              <p className="mt-1 font-medium leading-6">{statusView.message}</p>
            </div>
          </div>
        </div>

        {status?.state === "enrolled" && (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <ResultField label="Enrolled section" value={status.enrolledSection} />
            <ResultField label="Searched section" value={classItem.sec} />
          </div>
        )}

        {status?.state === "conflict" && status.conflicts?.length > 0 && (
          <div className="mt-4 grid gap-2">
            {status.conflicts.map((conflict, index) => (
              <div
                key={`${conflict.code}-${conflict.sec}-${index}`}
                className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100"
              >
                {conflict.code} is already scheduled from section {conflict.sec}.
              </div>
            ))}
          </div>
        )}

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <ResultField label="Credit" value={classItem.credit} />
          <ResultField label="Faculty" value={formatClassFaculty(classItem)} />
          <ResultField label="Section" value={classItem.sec} />
          <ResultField label="Session" value={classItem.session} />
        </dl>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onAdd}
            disabled={state.adding || (status?.state === "enrolled" && status.sameSection)}
            className="btn-primary"
          >
            <FiPlus aria-hidden="true" />
            {state.adding ? "Adding..." : "Add"}
          </button>
          {status?.state === "enrolled" && status.sameSection && (
            <button type="button" onClick={onDelete} disabled={state.deleting} className="btn-danger">
              <FiTrash2 aria-hidden="true" />
              {state.deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ResultField({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="safe-text mt-1 font-semibold text-slate-950 dark:text-white">
        {value || "N/A"}
      </dd>
    </div>
  );
}

function getClassResultKey(classItem, index) {
  return `${classItem.code}-${classItem.sec}-${classItem.session}-${classItem.faculty}-${index}`;
}

function normalizeCourseStatus(data, classItem) {
  if (data?.courseAlreadyEnrolled) {
    const enrolledSection = data.enrolledSection || data.enrollment?.sec || "";
    const sameSection =
      data.sameSection ??
      String(enrolledSection || "").toLowerCase() ===
        String(classItem.sec || "").toLowerCase();

    return {
      state: "enrolled",
      sameSection,
      enrolledSection,
      message: sameSection
        ? `${classItem.code} is already enrolled in section ${enrolledSection}.`
        : `${classItem.code} is already enrolled from section ${enrolledSection}.`,
    };
  }

  if (Array.isArray(data) && data.length === 0) {
    return {
      state: "available",
      message: "No conflict found. This course can be added.",
    };
  }

  if (Array.isArray(data) && data.length > 0) {
    return {
      state: "conflict",
      conflicts: data,
      message: `Schedule conflict with ${data.map((item) => `${item.code} in section ${item.sec}`).join(", ")}.`,
    };
  }

  return {
    state: "available",
    message: "No blocking conflict was returned.",
  };
}

function normalizeCourseStatusError(error, classItem) {
  const apiMessage = getApiErrorMessage(error);

  if (error.response?.status === 405) {
    return {
      state: "enrolled",
      sameSection: false,
      enrolledSection: "",
      message: `${classItem.code} is already enrolled in another section.`,
    };
  }

  return {
    state: "error",
    message: apiMessage || getConflictError(error),
  };
}

function getStatusView(status, loading) {
  if (loading && !status) {
    return {
      icon: FiSearch,
      label: "Checking status",
      message: "Looking for enrolled sections and schedule conflicts.",
      className:
        "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100",
    };
  }

  if (status?.state === "available") {
    return {
      icon: FiCheckCircle,
      label: "Available",
      message: status.message,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
    };
  }

  if (status?.state === "enrolled") {
    return {
      icon: FiAlertTriangle,
      label: status.sameSection ? "Already taken here" : "Taken in another section",
      message: status.message,
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    };
  }

  if (status?.state === "conflict") {
    return {
      icon: FiAlertTriangle,
      label: "Schedule conflict",
      message: status.message,
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    };
  }

  if (status?.state === "error") {
    return {
      icon: FiAlertTriangle,
      label: "Status unavailable",
      message: status.message,
      className:
        "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
    };
  }

  return {
    icon: FiSearch,
    label: "Waiting",
    message: "Status will appear after the automatic check finishes.",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
  };
}

function formatClassFaculty(classItem) {
  if (classItem.facultyName && classItem.faculty) {
    return `${classItem.facultyName} (${classItem.faculty})`;
  }

  return classItem.facultyName || classItem.faculty || "N/A";
}

function getSearchError(error) {
  const status = error.response?.status;
  if (status === 400) return "Add at least one enabled filter with a value.";
  if (status === 404) return "No classes found matching your criteria.";
  if (status === 500) return "Server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not search classes.";
}

function getAddError(error) {
  const status = error.response?.status;
  const apiMessage = getApiErrorMessage(error);

  if (apiMessage) return apiMessage;

  if (status === 422) return "You cannot add more than three courses in the same slot.";
  if (status === 409) return "This course is already in your personal schedule.";
  if (status === 405 || status === 404 || status === 402) return "No such class exists in your personal routine.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.message || "Could not add class.";
}

function getDeleteError(error) {
  const status = error.response?.status;
  const apiMessage = getApiErrorMessage(error);

  if (apiMessage) return apiMessage;

  if (status === 401) return "This course was not found in your personal schedule.";
  if (status === 402) return "No such class exists in your personal routine.";
  if (status === 409) return "This course is enrolled in another section.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not delete class.";
}

function getConflictError(error) {
  const status = error.response?.status;
  if (status === 401) return "Unauthorized access.";
  if (status === 402) return "No such class exists in your personal routine.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not check conflicts.";
}

function getApiErrorMessage(error) {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  return data?.message || data?.msg || "";
}

export default PersonalCourseManage;
