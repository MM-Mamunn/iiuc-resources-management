"use client";

import { useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiPlus,
  FiSearch,
  FiShuffle,
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
  });
  const [suggestions, setSuggestions] = useState({
    session: [],
    section: [],
    code: [],
  });
  const [loadingField, setLoadingField] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [rowState, setRowState] = useState({});
  const [courseCodeEnabled, setCourseCodeEnabled] = useState(false);
  const [sectionEnabled, setSectionEnabled] = useState(false);
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
      const response = await api.get(`${endpoint}/${value}`);
      const nextSuggestions = response.data?.rows?.map(mapValue) ?? [];
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

    if (!hasCourseCode && !hasSection) {
      setNotice({
        type: "error",
        text: "Enable and provide either course code or section before searching.",
      });
      return;
    }

    setSearching(true);
    setNotice(null);
    setSearchResults([]);
    setHasSearched(true);
    setRowState({});

    try {
      const requestBody = { session: formData.session };
      if (sectionEnabled && formData.section.trim()) requestBody.section = formData.section;
      if (courseCodeEnabled && formData.code.trim()) requestBody.code = formData.code;

      const response = await api.post("/api/class/search", requestBody);
      setSearchResults(response.data?.rows ?? []);
    } catch (searchError) {
      setNotice({ type: "error", text: getSearchError(searchError) });
    } finally {
      setSearching(false);
      setSuggestions({ session: [], section: [], code: [] });
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

  const handleAddClass = async (classItem, index) => {
    setItemState(index, {
      adding: true,
      addMessage: null,
      conflictMessage: null,
    });

    try {
      await api.post("/api/user/course_insert", {
        session: classItem.session,
        section: classItem.sec,
        code: classItem.code,
      });
      setItemState(index, {
        addMessage: { type: "success", text: "Class added successfully." },
      });
    } catch (addError) {
      setItemState(index, {
        addMessage: { type: "error", text: getAddError(addError) },
      });
    } finally {
      setItemState(index, { adding: false });
    }
  };

  const handleDeleteClass = async (classItem, index) => {
    const confirmDelete = window.confirm(
      `Remove this course from your personal routine?\n\n${classItem.code} - ${classItem.sec}`
    );
    if (!confirmDelete) return;

    setItemState(index, {
      deleting: true,
      deleteMessage: null,
      conflictMessage: null,
    });

    try {
      await api.post("/api/user/course_delete", {
        session: classItem.session,
        section: classItem.sec,
        code: classItem.code,
      });
      setItemState(index, {
        deleteMessage: { type: "success", text: "Course removed successfully." },
      });
    } catch (deleteError) {
      setItemState(index, {
        deleteMessage: { type: "error", text: getDeleteError(deleteError) },
      });
    } finally {
      setItemState(index, { deleting: false });
    }
  };

  const handleCheckConflict = async (classItem, index) => {
    setItemState(index, {
      checking: true,
      conflictMessage: null,
    });

    try {
      const response = await api.post("/api/user/course_conflict", {
        code: classItem.code,
        section: classItem.sec,
        session: classItem.session,
      });
      setItemState(index, {
        conflictMessage: normalizeConflictResponse(response.data),
      });
    } catch (conflictError) {
      if (conflictError.response?.status === 405) {
        setItemState(index, {
          conflictMessage: {
            type: "warning",
            text: "This course is already enrolled in your schedule.",
          },
        });
      } else {
        setItemState(index, {
          conflictMessage: { type: "error", text: getConflictError(conflictError) },
        });
      }
    } finally {
      setItemState(index, { checking: false });
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
            description="Search by course code, section, or both, then check overlap before adding courses to your routine."
          />

          <form onSubmit={handleSearch} className="mt-6 grid gap-5" autoComplete="off">
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
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
            tone="blue"
          />
          <MetricCard
            icon={<FiShuffle className="h-5 w-5" aria-hidden="true" />}
            label="Overlap check"
            value="Available"
            tone="teal"
          />
          <MetricCard
            icon={<FiPlus className="h-5 w-5" aria-hidden="true" />}
            label="Action"
            value="Add / drop"
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
                  onCheck={() => handleCheckConflict(classItem, index)}
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
      className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
    >
      <span>{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
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
        <SuggestionList suggestions={suggestions} onSelect={onSelect} />
      </div>
    </FormField>
  );
}

/**
 * Search result card with overlap, add, and delete actions.
 */
function ClassResultCard({ classItem, state, onCheck, onAdd, onDelete }) {
  return (
    <article className="interactive-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker">Class</p>
          <h2 className="safe-text mt-1 text-xl font-bold text-slate-950 dark:text-white">
            {classItem.code}
          </h2>
        </div>
        <span className="status-pill border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          {classItem.sec}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <ResultField label="Credit" value={classItem.credit} />
        <ResultField label="Faculty" value={classItem.faculty} />
        <ResultField label="Section" value={classItem.sec} />
        <ResultField label="Session" value={classItem.session} />
      </dl>

      <div className="mt-5 space-y-3">
        {state.addMessage && <InlineMessage {...state.addMessage} />}
        {state.deleteMessage && <InlineMessage {...state.deleteMessage} />}
        {state.conflictMessage && <InlineMessage {...state.conflictMessage} />}
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCheck} disabled={state.checking} className="btn-secondary">
          <FiShuffle aria-hidden="true" />
          {state.checking ? "Checking..." : "Overlap"}
        </button>
        <button type="button" onClick={onAdd} disabled={state.adding} className="btn-primary">
          <FiPlus aria-hidden="true" />
          {state.adding ? "Adding..." : "Add"}
        </button>
        <button type="button" onClick={onDelete} disabled={state.deleting} className="btn-danger">
          <FiTrash2 aria-hidden="true" />
          {state.deleting ? "Deleting..." : "Delete"}
        </button>
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

function InlineMessage({ type, text }) {
  const styles = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
    warning:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    error:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
  };

  const Icon = type === "success" ? FiCheckCircle : FiAlertTriangle;

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${styles[type] || styles.error}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function normalizeConflictResponse(data) {
  if (data?.courseAlreadyEnrolled) {
    return {
      type: "warning",
      text: "This course is already enrolled in your schedule.",
    };
  }

  if (Array.isArray(data) && data.length === 0) {
    return {
      type: "success",
      text: "No conflicts found. You can safely add this course.",
    };
  }

  if (Array.isArray(data) && data.length > 0) {
    return {
      type: "warning",
      text: `Conflicts detected with ${data.map((item) => `${item.code} (${item.sec})`).join(", ")}.`,
    };
  }

  return {
    type: "success",
    text: "No blocking conflict was returned.",
  };
}

function getSearchError(error) {
  const status = error.response?.status;
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
  if (status === 401) return "This course was not found in your personal schedule.";
  if (status === 402) return "No such class exists in your personal routine.";
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
