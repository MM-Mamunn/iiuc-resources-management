"use client";

import { useEffect, useState } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiEdit3,
  FiGrid,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUserPlus,
} from "react-icons/fi";
import api from "../../api";
import campusImage from "../../assets/iiuc.webp";
import { useActiveSession } from "../../App";
import {
  FACULTY_SEARCH_MAX_LENGTH,
  fetchFacultySuggestions,
  searchFaculty,
} from "../../services/facultySearchService";
import CrRoutine from "./CrRoutine";
import Header from "../components/Header";
import {
  EmptyState,
  FormField,
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

const emptyFacultyForm = {
  code: "",
  name: "",
  desig: "",
  type: "",
  email: "",
  phone: "",
};

/**
 * CR dashboard for reviewing and managing section classes.
 */
function CR() {
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
  const [activePanel, setActivePanel] = useState("");
  const sessionHelper = activeSessionLoading
    ? "Loading active session..."
    : activeSessionError || (activeSessionName ? `Active: ${activeSessionName}` : "Enter a session");
  const navigationCards = [
    {
      key: "routine",
      title: "Routine editor",
      description: "Edit routine cells directly in this workspace.",
      icon: FiEdit3,
      tone: "blue",
    },
    {
      key: "bulk",
      title: "Bulk entry",
      description: "Queue multiple faculty classes before saving.",
      icon: FiPlus,
      tone: "amber",
    },
    {
      key: "faculty",
      title: "Faculty management",
      description: "Add new faculty or update teacher information.",
      icon: FiUserPlus,
      tone: "teal",
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
        <section className="hero-form-card relative isolate overflow-hidden rounded-lg bg-slate-950 px-6 py-8 text-white shadow-2xl sm:px-8">
          <img
            src={campusImage}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 -z-10 bg-slate-950/72" />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-teal-200">CR Dashboard</p>
              <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">
                Class Management
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                Review all classes for a session, then open the routine editor when you need to add or adjust class data.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel("routine")}
              className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20 dark:border-white/20 dark:bg-white/10 dark:text-white"
            >
              <FiEdit3 aria-hidden="true" />
              Open editor
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <FormField
              id="session"
              label="Session"
              helper={sessionLoading ? "Loading suggestions..." : sessionHelper}
              labelClassName="!text-slate-100"
              helperClassName="!text-slate-300"
            >
              <div className="relative">
                <FiCalendar
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300"
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
              className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20 dark:border-white/20 dark:bg-white/10 dark:text-white"
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

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {navigationCards.map((item) => {
            const Icon = item.icon;
            const active = activePanel === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActivePanel(item.key)}
                className={`interactive-card group p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? "border-blue-300 bg-blue-50/80 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20 dark:border-blue-500/50 dark:bg-blue-500/10"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-lg ${getActionTone(item.tone)}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  {active ? (
                    <span className="status-pill border-blue-200 bg-white text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                      Active
                    </span>
                  ) : (
                    <FiArrowRight
                      className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-blue-300"
                      aria-hidden="true"
                    />
                  )}
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

        {activePanel === "faculty" && <FacultyManagementSection />}

        {(activePanel === "routine" || activePanel === "bulk") && (
          <section className="mt-8">
            <CrRoutine
              embedded
              mode={activePanel === "bulk" ? "bulk" : "routine"}
              showModeCards={false}
            />
          </section>
        )}

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
function FacultyManagementSection() {
  const [addForm, setAddForm] = useState(emptyFacultyForm);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addNotice, setAddNotice] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [updateForm, setUpdateForm] = useState(emptyFacultyForm);
  const [selectedFacultyCode, setSelectedFacultyCode] = useState("");
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateNotice, setUpdateNotice] = useState(null);

  const handleAddFormChange = (field, value) => {
    setAddForm((current) => ({
      ...current,
      [field]: field === "code" ? value.toUpperCase() : value,
    }));
    setAddNotice(null);
  };

  const handleUpdateFormChange = (field, value) => {
    setUpdateForm((current) => ({
      ...current,
      [field]: field === "code" ? value.toUpperCase() : value,
    }));
    setUpdateNotice(null);
  };

  const handleAddFaculty = async (event) => {
    event.preventDefault();

    if (!addForm.code.trim()) {
      setAddNotice({ type: "error", text: "Faculty code is required." });
      return;
    }

    setAddSubmitting(true);
    setAddNotice(null);

    try {
      const response = await api.post("/api/cr/faculty", getFacultyPayload(addForm));
      const savedFaculty = response.data?.row;

      setAddForm(emptyFacultyForm);
      setAddNotice({
        type: "success",
        text: `${formatFacultyLabel(savedFaculty)} added successfully.`,
      });
    } catch (facultyError) {
      setAddNotice({ type: "error", text: getFacultyError(facultyError) });
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleSearchChange = async (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    setSearchSuggestions([]);
    setSelectedFacultyCode("");
    setUpdateForm(emptyFacultyForm);
    setUpdateNotice(null);

    if (value.length < 1 || value.length > FACULTY_SEARCH_MAX_LENGTH) {
      return;
    }

    setSearchLoading(true);
    try {
      setSearchSuggestions(await fetchFacultySuggestions(value));
    } catch {
      setSearchSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadFacultyForUpdate = async (faculty) => {
    const facultyCode = faculty?.code || "";
    setSearchLoading(true);
    setUpdateNotice(null);

    try {
      const endpoint = facultyCode
        ? `/api/teacher/search/${encodeURIComponent(facultyCode)}`
        : `/api/teacher/search-any/${encodeURIComponent(faculty?.name || "")}`;
      const response = await api.get(endpoint, { params: { limit: 1 } });
      const selectedFaculty = response.data?.rows?.[0] || faculty;

      if (!selectedFaculty?.code) {
        setUpdateNotice({ type: "error", text: "Could not load this faculty." });
        return;
      }

      setUpdateForm(getFacultyFormFromRow(selectedFaculty));
      setSelectedFacultyCode(selectedFaculty.code);
      setSearchQuery(selectedFaculty.code || selectedFaculty.name || "");
      setSearchSuggestions([]);
    } catch (facultyError) {
      setUpdateNotice({ type: "error", text: getFacultyError(facultyError) });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const query = searchQuery.trim();

    if (!query) {
      setUpdateNotice({ type: "error", text: "Enter a faculty code or name." });
      return;
    }

    setSearchLoading(true);
    setUpdateNotice(null);

    try {
      const response = await searchFaculty(query, { limit: 5 });
      const rows = response.rows ?? [];

      if (rows.length === 0) {
        setSearchSuggestions([]);
        setUpdateForm(emptyFacultyForm);
        setSelectedFacultyCode("");
        setUpdateNotice({ type: "info", text: "No matching faculty found." });
        return;
      }

      setSearchSuggestions(rows);
      await loadFacultyForUpdate(rows[0]);
    } catch (facultyError) {
      setUpdateNotice({ type: "error", text: getFacultyError(facultyError) });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUpdateFaculty = async (event) => {
    event.preventDefault();

    if (!selectedFacultyCode) {
      setUpdateNotice({ type: "error", text: "Search and select a faculty first." });
      return;
    }

    setUpdateSubmitting(true);
    setUpdateNotice(null);

    try {
      const response = await api.put(
        `/api/cr/faculty/${encodeURIComponent(selectedFacultyCode)}`,
        getFacultyPayload(updateForm),
      );
      const savedFaculty = response.data?.row;

      setUpdateForm(getFacultyFormFromRow(savedFaculty));
      setSelectedFacultyCode(savedFaculty?.code || selectedFacultyCode);
      setUpdateNotice({
        type: "success",
        text: `${formatFacultyLabel(savedFaculty)} updated successfully.`,
      });
    } catch (facultyError) {
      setUpdateNotice({ type: "error", text: getFacultyError(facultyError) });
    } finally {
      setUpdateSubmitting(false);
    }
  };

  return (
    <section id="faculty-management" className="mt-8 surface-card p-6 sm:p-8">
      <SectionHeading
        kicker="Faculty management"
        title="Add or Update Faculty"
        description="Create faculty records for routine entry, or search by name/code and update existing teacher information."
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <SectionHeading kicker="Add faculty" title="New Faculty Entry" />

          {addNotice && (
            <div className="mt-5">
              <Notice type={addNotice.type} onDismiss={() => setAddNotice(null)}>
                {addNotice.text}
              </Notice>
            </div>
          )}

          <form onSubmit={handleAddFaculty} className="mt-6 grid gap-5">
            <FacultyFormFields
              idPrefix="add-faculty"
              form={addForm}
              onChange={handleAddFormChange}
            />
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={addSubmitting}>
                <FiPlus aria-hidden="true" />
                {addSubmitting ? "Adding..." : "Add Faculty"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <SectionHeading kicker="Update faculty" title="Search and Edit" />

          <form onSubmit={handleSearchSubmit} className="mt-6">
            <FormField
              id="faculty-search"
              label="Find faculty"
              helper={searchLoading ? "Loading faculty..." : "Search by faculty name or code before editing."}
            >
              <div className="relative">
                <FiSearch
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="faculty-search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search faculty name or code"
                  className="form-field pl-12"
                  maxLength={FACULTY_SEARCH_MAX_LENGTH}
                  autoComplete="off"
                />
                <SuggestionList
                  suggestions={searchSuggestions}
                  getLabel={(faculty) => formatFacultyLabel(faculty)}
                  onSelect={loadFacultyForUpdate}
                />
              </div>
            </FormField>

            <div className="mt-4 flex justify-end">
              <button type="submit" className="btn-secondary" disabled={searchLoading}>
                <FiSearch aria-hidden="true" />
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {updateNotice && (
            <div className="mt-5">
              <Notice type={updateNotice.type} onDismiss={() => setUpdateNotice(null)}>
                {updateNotice.text}
              </Notice>
            </div>
          )}

          <form onSubmit={handleUpdateFaculty} className="mt-6 grid gap-5">
            {selectedFacultyCode ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                <span className="inline-flex items-center gap-2">
                  <FiCheckCircle aria-hidden="true" />
                  Selected {formatFacultyLabel(updateForm)}
                </span>
              </div>
            ) : (
              <Notice inline type="info">Select a faculty to enable the update form.</Notice>
            )}

            <FacultyFormFields
              idPrefix="update-faculty"
              form={updateForm}
              onChange={handleUpdateFormChange}
              readOnlyCode
              disabled={!selectedFacultyCode}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary"
                disabled={updateSubmitting || !selectedFacultyCode}
              >
                <FiEdit3 aria-hidden="true" />
                {updateSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function FacultyFormFields({
  idPrefix,
  form,
  onChange,
  readOnlyCode = false,
  disabled = false,
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`${idPrefix}-code`} label="Faculty code" helper="Required. Example: JAA">
          <input
            id={`${idPrefix}-code`}
            value={form.code}
            onChange={(event) => onChange("code", event.target.value)}
            className="form-field uppercase"
            placeholder="JAA"
            readOnly={readOnlyCode}
            disabled={disabled}
            required
          />
        </FormField>
        <FormField id={`${idPrefix}-name`} label="Faculty name">
          <input
            id={`${idPrefix}-name`}
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            className="form-field"
            placeholder="Faculty name"
            disabled={disabled}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`${idPrefix}-designation`} label="Designation">
          <input
            id={`${idPrefix}-designation`}
            value={form.desig}
            onChange={(event) => onChange("desig", event.target.value)}
            className="form-field"
            placeholder="Lecturer"
            disabled={disabled}
          />
        </FormField>
        <FormField id={`${idPrefix}-type`} label="Department / Type">
          <input
            id={`${idPrefix}-type`}
            value={form.type}
            onChange={(event) => onChange("type", event.target.value)}
            className="form-field"
            placeholder="CSE"
            disabled={disabled}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`${idPrefix}-email`} label="Email">
          <input
            id={`${idPrefix}-email`}
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
            className="form-field"
            placeholder="name@example.com"
            type="email"
            disabled={disabled}
          />
        </FormField>
        <FormField id={`${idPrefix}-phone`} label="Phone">
          <input
            id={`${idPrefix}-phone`}
            value={form.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            className="form-field"
            placeholder="+880..."
            disabled={disabled}
          />
        </FormField>
      </div>
    </>
  );
}

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

function getFacultyFormFromRow(faculty) {
  return {
    code: faculty?.code || "",
    name: faculty?.name || "",
    desig: faculty?.desig || "",
    type: faculty?.type || "",
    email: faculty?.email || "",
    phone: faculty?.phone || "",
  };
}

function getFacultyPayload(form) {
  return {
    code: String(form.code || "").trim().toUpperCase(),
    name: String(form.name || "").trim(),
    desig: String(form.desig || "").trim(),
    type: String(form.type || "").trim(),
    email: String(form.email || "").trim(),
    phone: String(form.phone || "").trim(),
  };
}

function formatFacultyLabel(faculty) {
  if (!faculty) return "Faculty";

  const code = faculty.code || "";
  const name = faculty.name || "";

  if (code && name) return `${name} (${code})`;
  return code || name || "Faculty";
}

function getFacultyError(error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.response?.data?.msg;

  if (message) return message;
  if (status === 400) return "Please check the faculty information.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 404) return "Faculty not found.";
  if (status === 409) return "Faculty code already exists.";
  if (status === 500) return "Internal server error.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.message || "Could not save faculty.";
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
