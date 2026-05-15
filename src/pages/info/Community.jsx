"use client";

import { useEffect, useId, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import api from "../../api";
import Header from "../components/Header";
import ResourceBrowser from "../components/ResourceBrowser";
import {
  EmptyState,
  FormField,
  LoadingState,
  Notice,
  PageShell,
  SectionHeading,
  SuggestionList,
} from "../components/ui";
import { useAuth } from "../../App";

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
};

/**
 * Searchable student community directory with filterable profile results.
 */
function Community() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [sectionInput, setSectionInput] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [sectionSuggestions, setSectionSuggestions] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [typeEnabled, setTypeEnabled] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [studentTypes, setStudentTypes] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const controlPrefix = useId();

  const activeSection = sectionEnabled ? selectedSection : "";
  const activeType = typeEnabled ? selectedType : "";

  useEffect(() => {
    fetchStudentTypes();
  }, []);

  useEffect(() => {
    fetchStudents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeSection, activeType]);

  useEffect(() => {
    const query = searchInput.trim();

    if (!query) {
      setStudentSuggestions([]);
      setSuggestionLoading(false);
      return undefined;
    }

    let ignoreResult = false;
    const timer = window.setTimeout(async () => {
      setSuggestionLoading(true);
      try {
        const response = await api.get("/api/community/suggest", {
          params: {
            search: query,
            section: activeSection,
            type: activeType,
          },
        });

        if (!ignoreResult) {
          setStudentSuggestions(response.data?.rows ?? []);
        }
      } catch {
        if (!ignoreResult) {
          setStudentSuggestions([]);
        }
      } finally {
        if (!ignoreResult) {
          setSuggestionLoading(false);
        }
      }
    }, 250);

    return () => {
      ignoreResult = true;
      window.clearTimeout(timer);
    };
  }, [searchInput, activeSection, activeType]);

  useEffect(() => {
    if (!sectionEnabled) {
      setSectionInput("");
      setSelectedSection("");
      setSectionSuggestions([]);
      setSectionLoading(false);
    }
  }, [sectionEnabled]);

  useEffect(() => {
    if (!typeEnabled) {
      setSelectedType("");
    }
  }, [typeEnabled]);

  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudent(null);
      return undefined;
    }

    let ignoreResult = false;
    const loadProfile = async () => {
      setProfileLoading(true);
      setNotice(null);

      try {
        const response = await api.get(
          `/api/community/${encodeURIComponent(selectedStudentId)}`,
          {
            params: {
              trackView:
                user?.id &&
                String(user.id).toLowerCase() === String(selectedStudentId).toLowerCase()
                  ? "0"
                  : "1",
            },
          },
        );

        if (!ignoreResult) {
          setSelectedStudent(response.data?.row ?? null);
        }
      } catch (profileError) {
        if (!ignoreResult) {
          setSelectedStudent(null);
          setNotice({ type: "error", text: getCommunityError(profileError) });
        }
      } finally {
        if (!ignoreResult) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      ignoreResult = true;
    };
  }, [selectedStudentId, user?.id]);

  const fetchStudentTypes = async () => {
    try {
      const response = await api.get("/api/community/types");
      setStudentTypes(response.data?.rows ?? []);
    } catch {
      setStudentTypes([]);
    }
  };

  const fetchStudents = async (nextPage = pagination.page) => {
    setLoading(true);
    setNotice(null);

    try {
      const response = await api.get("/api/community", {
        params: {
          page: nextPage,
          limit: pagination.limit,
          search,
          section: activeSection,
          type: activeType,
        },
      });

      setStudents(response.data?.rows ?? []);
      setPagination(response.data?.pagination ?? DEFAULT_PAGINATION);
    } catch (communityError) {
      setStudents([]);
      setPagination(DEFAULT_PAGINATION);
      setNotice({ type: "error", text: getCommunityError(communityError) });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setStudentSuggestions([]);
    setSelectedStudentId("");
  };

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
    setStudentSuggestions([]);
  };

  const handleStudentSuggestionSelect = (student) => {
    setSearchInput(student.name || student.id || "");
    setSearch(student.name || student.id || "");
    setStudentSuggestions([]);
    setSelectedStudentId(student.id);
  };

  const handleSectionChange = async (event) => {
    const value = event.target.value.toUpperCase();
    setSectionInput(value);
    setSelectedSection("");

    if (value.length < 1 || value.length > 4) {
      setSectionSuggestions([]);
      return;
    }

    setSectionLoading(true);
    try {
      const response = await api.get(
        `/api/lookLike/sectionLookLike/${encodeURIComponent(value)}`,
      );
      setSectionSuggestions(response.data?.rows?.map((row) => row.sec) ?? []);
    } catch {
      setSectionSuggestions([]);
    } finally {
      setSectionLoading(false);
    }
  };

  const chooseSection = (sectionCode) => {
    setSectionInput(sectionCode);
    setSelectedSection(sectionCode);
    setSectionSuggestions([]);
    setSelectedStudentId("");
  };

  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
    setSelectedStudentId("");
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setStudentSuggestions([]);
    setSectionEnabled(false);
    setSectionInput("");
    setSelectedSection("");
    setSectionSuggestions([]);
    setTypeEnabled(false);
    setSelectedType("");
    setSelectedStudentId("");
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) {
      return;
    }

    fetchStudents(nextPage);
  };

  if (selectedStudentId) {
    return (
      <CommunityProfileView
        student={selectedStudent}
        loading={profileLoading}
        notice={notice}
        onBack={() => setSelectedStudentId("")}
        onNoticeDismiss={() => setNotice(null)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Directory"
            title="Community"
            description="Search students by name or ID, then narrow the directory by section and account type."
            actions={
              <button type="button" onClick={() => fetchStudents(1)} className="btn-secondary" disabled={loading}>
                <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </button>
            }
          />

          <form onSubmit={handleSearchSubmit} className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <FormField
              id={`${controlPrefix}-student-search`}
              label="Search students"
              helper={suggestionLoading ? "Loading suggestions..." : "Search by name or ID."}
            >
              <div className="relative">
                <FiSearch
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id={`${controlPrefix}-student-search`}
                  value={searchInput}
                  onChange={handleSearchChange}
                  className="form-field pl-12"
                  type="search"
                  autoComplete="off"
                  placeholder="Student name or ID"
                />
                <StudentSuggestionList
                  suggestions={studentSuggestions}
                  onSelect={handleStudentSuggestionSelect}
                />
              </div>
            </FormField>

            <button type="submit" disabled={loading} className="btn-primary">
              <FiSearch aria-hidden="true" />
              Search
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

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-4 lg:grid-cols-[minmax(150px,auto)_1fr_minmax(120px,auto)_1fr_auto] lg:items-end">
            <label className="flex h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <input
                type="checkbox"
                checked={sectionEnabled}
                onChange={(event) => setSectionEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
              Section
            </label>

            <div className={sectionEnabled ? "" : "hidden lg:block"}>
              {sectionEnabled ? (
                <FormField
                  id={`${controlPrefix}-section-filter`}
                  label="Section"
                  helper={sectionLoading ? "Searching sections..." : selectedSection ? `Selected ${selectedSection}` : "All sections until one is selected."}
                >
                  <div className="relative">
                    <input
                      id={`${controlPrefix}-section-filter`}
                      value={sectionInput}
                      onChange={handleSectionChange}
                      className="form-field uppercase"
                      autoComplete="off"
                      placeholder="Example: 8AM"
                    />
                    <SuggestionList suggestions={sectionSuggestions} onSelect={chooseSection} />
                  </div>
                </FormField>
              ) : (
                <div className="h-11 rounded-lg border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
              )}
            </div>

            <label className="flex h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <input
                type="checkbox"
                checked={typeEnabled}
                onChange={(event) => setTypeEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
              Type
            </label>

            <div className={typeEnabled ? "" : "hidden lg:block"}>
              {typeEnabled ? (
                <FormField id={`${controlPrefix}-type-filter`} label="Type">
                  <select
                    id={`${controlPrefix}-type-filter`}
                    value={selectedType}
                    onChange={handleTypeChange}
                    className="form-field"
                  >
                    <option value="">All types</option>
                    {studentTypes.map((type) => (
                      <option key={type} value={type}>
                        {formatType(type)}
                      </option>
                    ))}
                  </select>
                </FormField>
              ) : (
                <div className="h-11 rounded-lg border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
              )}
            </div>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!search && !searchInput && !sectionEnabled && !typeEnabled}
              className="btn-secondary"
            >
              <FiX aria-hidden="true" />
              Clear all
            </button>
          </div>

          {(search || activeSection || activeType) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {search && (
                <span className="status-pill border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                  Search: {search}
                </span>
              )}
              {activeSection && (
                <span className="status-pill border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200">
                  Section {activeSection}
                </span>
              )}
              {activeType && (
                <span className="status-pill border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {formatType(activeType)}
                </span>
              )}
            </div>
          )}
        </section>

        <section className="mt-8">
          {loading ? (
            <LoadingState label="Loading community..." />
          ) : students.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {students.map((student) => (
                  <StudentResultCard
                    key={student.id}
                    student={student}
                    onOpen={() => setSelectedStudentId(student.id)}
                  />
                ))}
              </div>
              <CommunityPagination
                pagination={pagination}
                loading={loading}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <div className="table-shell">
              <EmptyState
                icon={<FiUsers className="h-7 w-7" aria-hidden="true" />}
                title="No students found"
                description="Try another search or adjust the active filters."
              />
            </div>
          )}
        </section>
      </PageShell>
    </div>
  );
}

function CommunityProfileView({ student, loading, notice, onBack, onNoticeDismiss }) {
  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        {notice && (
          <div className="mt-6">
            <Notice type={notice.type} onDismiss={onNoticeDismiss}>
              {notice.text}
            </Notice>
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading student profile..." />
        ) : student ? (
          <>
            <section className="surface-card mt-6 overflow-hidden">
              <div className="flex flex-col gap-5 border-b border-slate-200 p-6 lg:flex-row lg:items-start lg:justify-between dark:border-slate-800">
                <div className="grid min-w-0 gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
                  <StudentAvatar student={student} size="large" />
                  <div className="min-w-0">
                    <p className="section-kicker">Community profile</p>
                    <h1 className="safe-text mt-2 text-3xl font-black text-slate-950 dark:text-white">
                      {student.name || "Student"}
                    </h1>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <InfoPill label="ID" value={student.id} />
                      <InfoPill label="Section" value={student.sec} />
                      <InfoPill label="Type" value={formatType(student.type)} />
                      <InfoPill label="Resources" value={student.resourceCount ?? 0} />
                      <InfoPill label="Views" value={student.view ?? 0} />
                    </div>
                  </div>
                </div>
                <button type="button" onClick={onBack} className="btn-secondary shrink-0">
                  <FiChevronLeft aria-hidden="true" />
                  Community
                </button>
              </div>

              <div className="grid gap-4 p-6">
                <ProfileField label="Email" value={student.email} />
              </div>
            </section>

            <div className="mt-8">
              <ResourceBrowser
                title={`${student.name || student.id}'s resources`}
                description="Search and open resources shared by this student. Rating controls use the standard resource workflow."
                fixedContributorId={student.id}
                enableCourseFilters
                limit={6}
              />
            </div>
          </>
        ) : (
          <div className="table-shell mt-6">
            <EmptyState
              icon={<FiUser className="h-7 w-7" aria-hidden="true" />}
              title="Student not found"
              description="Return to the directory and choose another student."
            />
          </div>
        )}
      </PageShell>
    </div>
  );
}

function StudentSuggestionList({ suggestions, onSelect }) {
  if (!suggestions.length) return null;

  return (
    <ul className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      {suggestions.map((student) => (
        <li key={student.id}>
          <button
            type="button"
            onClick={() => onSelect(student)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800"
          >
            <StudentAvatar student={student} />
            <span className="min-w-0">
              <span className="safe-text block text-sm font-bold text-slate-950 dark:text-white">
                {student.name || "Student"}
              </span>
              <span className="safe-text mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                {student.id} - Section {student.sec || "N/A"}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function StudentResultCard({ student, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="interactive-card p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex items-start gap-4">
        <StudentAvatar student={student} />
        <div className="min-w-0 flex-1">
          <h2 className="safe-text text-lg font-black text-slate-950 dark:text-white">
            {student.name || "Student"}
          </h2>
          <p className="safe-text mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            ID {student.id}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="status-pill border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          Section {student.sec || "N/A"}
        </span>
        <span className="status-pill border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200">
          {formatType(student.type)}
        </span>
        <span className="status-pill border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {student.resourceCount || 0} resource{Number(student.resourceCount || 0) === 1 ? "" : "s"}
        </span>
      </div>
    </button>
  );
}

function CommunityPagination({ pagination, loading, onPageChange }) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {pagination.total} student{pagination.total === 1 ? "" : "s"} found
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1 || loading}
          className="btn-secondary px-3"
          aria-label="Previous student page"
        >
          <FiChevronLeft aria-hidden="true" />
        </button>
        <span className="min-w-24 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
          {pagination.page} / {pagination.totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages || loading}
          className="btn-secondary px-3"
          aria-label="Next student page"
        >
          <FiChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function StudentAvatar({ student, size = "default" }) {
  const large = size === "large";

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-slate-950 font-black text-white ring-2 ring-white dark:bg-white dark:text-slate-950 dark:ring-slate-800 ${
        large ? "h-28 w-28 rounded-xl text-3xl" : "h-12 w-12 rounded-full text-sm"
      }`}
    >
      {student?.profilePic ? (
        <img src={student.profilePic} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(student?.name || student?.id || "S")
      )}
    </span>
  );
}

function InfoPill({ label, value }) {
  return (
    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <span className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="safe-text mt-1 block text-sm font-black text-slate-950 dark:text-white">
        {value === 0 ? 0 : value || "N/A"}
      </span>
    </span>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="safe-text mt-2 font-semibold text-slate-950 dark:text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function getInitials(value) {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatType(value) {
  const text = String(value || "student").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Student";
}

function getCommunityError(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.status === 404) return "Student not found.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.message || "Could not load community data.";
}

export default Community;
