"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import api from "../../api";
import {
  FACULTY_SEARCH_MAX_LENGTH,
  fetchFacultySuggestions,
  formatFacultyLabel,
  searchFaculty,
} from "../../services/facultySearchService";
import Header from "../components/Header";
import {
  EmptyState,
  FormField,
  LoadingState,
  MetricCard,
  Notice,
  PageShell,
  SectionHeading,
  SuggestionList,
} from "../components/ui";

const SEARCH_PAGE_SIZE = 10;
const DEFAULT_PAGINATION = {
  page: 1,
  limit: SEARCH_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

/**
 * Teacher directory with unified faculty-code and name search.
 */
function TeacherInfo() {
  const [teachers, setTeachers] = useState([]);
  const [directoryPagination, setDirectoryPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPagination, setSearchPagination] = useState(DEFAULT_PAGINATION);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchDropdownRef = useRef(null);

  const firstSearchResult = searchResults[0] || null;
  const tableRows = hasSearched ? searchResults : teachers;
  const tableTitle = hasSearched ? "Search Results" : "Teacher Directory";
  const tableDescription = hasSearched
    ? `${searchPagination.total} teacher${searchPagination.total === 1 ? "" : "s"} found`
    : `${directoryPagination.total} teacher${directoryPagination.total === 1 ? "" : "s"} available`;

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target)
      ) {
        setSearchSuggestions([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTeachers = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/info/teacher", {
        params: { page, limit: SEARCH_PAGE_SIZE },
      });
      const rows = response.data?.rows || [];
      setTeachers(rows);
      setDirectoryPagination(response.data?.pagination || {
        page,
        limit: SEARCH_PAGE_SIZE,
        total: rows.length,
        totalPages: Math.max(Math.ceil(rows.length / SEARCH_PAGE_SIZE), 1),
      });
    } catch (teacherError) {
      setError(teacherError instanceof Error ? teacherError.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchSuggestions([]);
    setSearchResults([]);
    setSearchPagination(DEFAULT_PAGINATION);
    setHasSearched(false);
    setSearchError("");
  };

  const handleSearchChange = async (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    setSearchResults([]);
    setSearchPagination(DEFAULT_PAGINATION);
    setHasSearched(false);
    setSearchError("");

    if (value.length < 1 || value.length > FACULTY_SEARCH_MAX_LENGTH) {
      setSearchSuggestions([]);
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

  const runSearch = async (page = 1) => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchError("Please enter a teacher name or code to search.");
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    try {
      const response = await searchFaculty(query, {
        page,
        limit: SEARCH_PAGE_SIZE,
      });
      const rows = response.rows || [];
      const pagination = response.pagination || {
        page,
        limit: SEARCH_PAGE_SIZE,
        total: rows.length,
        totalPages: Math.max(Math.ceil(rows.length / SEARCH_PAGE_SIZE), 1),
      };

      setSearchResults(rows);
      setSearchPagination(pagination);
      setHasSearched(true);
      if (!rows.length) {
        setSearchError("No teacher found with this name or code.");
      }
    } catch {
      setSearchError("Error searching for teacher.");
      setSearchResults([]);
      setSearchPagination(DEFAULT_PAGINATION);
      setHasSearched(true);
    } finally {
      setSearchLoading(false);
      setSearchSuggestions([]);
    }
  };

  const handleSearch = () => {
    runSearch(1);
  };

  const handleSearchPageChange = (nextPage) => {
    runSearch(nextPage);
  };

  const handleDirectoryPageChange = (nextPage) => {
    fetchTeachers(nextPage);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  };

  const suggestionLabel = useMemo(
    () => (teacher) => formatFacultyLabel(teacher),
    [],
  );

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Directory"
            title="Teacher Information"
            description="Search faculty by name or short code, or browse the full teacher directory."
            actions={
              <button
                type="button"
                onClick={() => fetchTeachers(directoryPagination.page)}
                className="btn-secondary"
                disabled={loading}
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </button>
            }
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end" ref={searchDropdownRef}>
            <FormField
              id="teacher-search"
              label="Teacher name or code"
              helper={searchLoading ? "Searching suggestions..." : "Example: JAA or Abdullah"}
            >
              <div className="relative">
                <FiSearch
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="teacher-search"
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by teacher name or code"
                  className="form-field pl-12"
                  autoComplete="off"
                />
                <SuggestionList
                  suggestions={searchSuggestions}
                  getLabel={suggestionLabel}
                  onSelect={(suggestion) => {
                    setSearchQuery(suggestion.code || suggestion.name || "");
                    setSearchSuggestions([]);
                  }}
                />
              </div>
            </FormField>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searchLoading || !searchQuery.trim()}
              className="btn-primary"
            >
              <FiSearch aria-hidden="true" />
              {searchLoading ? "Searching..." : "Search"}
            </button>
          </div>
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
            icon={<FiUsers className="h-5 w-5" aria-hidden="true" />}
            label="Teachers"
            value={directoryPagination.total}
            tone="violet"
          />
          <MetricCard
            icon={<FiUser className="h-5 w-5" aria-hidden="true" />}
            label="Search result"
            value={hasSearched ? `${searchPagination.total} found` : "None"}
            tone={hasSearched && searchPagination.total > 0 ? "green" : "amber"}
          />
          <MetricCard
            icon={<FiSearch className="h-5 w-5" aria-hidden="true" />}
            label="Lookup"
            value="Name or code"
            tone="green"
          />
        </section>

        {hasSearched && firstSearchResult && (
          <section className="surface-card mt-8 p-5">
            <SectionHeading kicker="Search result" title={firstSearchResult.name || "Teacher"} />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <InfoTile label="Code" value={firstSearchResult.code} />
              <InfoTile label="Designation" value={firstSearchResult.desig} />
              <InfoTile label="Phone" value={firstSearchResult.phone} />
              <InfoTile label="Email" value={firstSearchResult.email} />
              <InfoTile label="Type" value={firstSearchResult.type} />
            </div>
          </section>
        )}

        <section className="table-shell mt-8">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="section-kicker">{hasSearched ? "Results" : "Directory"}</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                {tableTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {tableDescription}
              </p>
            </div>
            {hasSearched && (
              <button type="button" onClick={clearSearch} className="btn-secondary">
                Clear search
              </button>
            )}
          </div>

          {loading && !hasSearched ? (
            <LoadingState label="Loading teachers..." />
          ) : searchLoading && hasSearched ? (
            <LoadingState label="Searching teachers..." />
          ) : tableRows.length === 0 ? (
            <EmptyState
              icon={<FiUsers className="h-7 w-7" aria-hidden="true" />}
              title={hasSearched ? "No matching teachers found" : "No teachers found"}
              description={
                hasSearched
                  ? "Try another teacher code or name."
                  : "Teacher information is not available at the moment."
              }
              action={
                !hasSearched && (
                  <button type="button" onClick={() => fetchTeachers(1)} className="btn-primary">
                    Try again
                  </button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <caption className="sr-only">Teacher information</caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-4 font-bold">Code</th>
                    <th scope="col" className="px-5 py-4 font-bold">Name</th>
                    <th scope="col" className="px-5 py-4 font-bold">Designation</th>
                    <th scope="col" className="px-5 py-4 font-bold">Phone</th>
                    <th scope="col" className="px-5 py-4 font-bold">Email</th>
                    <th scope="col" className="px-5 py-4 font-bold">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tableRows.map((teacher, index) => (
                    <tr key={`${teacher.code}-${index}`} className="transition hover:bg-violet-50/60 dark:hover:bg-slate-900">
                      <td className="px-5 py-4">
                        <span className="status-pill border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
                          {teacher.code || "N/A"}
                        </span>
                      </td>
                      <td className="safe-text px-5 py-4 font-semibold text-slate-950 dark:text-white">
                        {teacher.name || "N/A"}
                      </td>
                      <td className="safe-text px-5 py-4 text-slate-600 dark:text-slate-300">
                        {teacher.desig || "N/A"}
                      </td>
                      <td className="safe-text px-5 py-4 text-slate-600 dark:text-slate-300">
                        {teacher.phone || "N/A"}
                      </td>
                      <td className="safe-text px-5 py-4 text-slate-600 dark:text-slate-300">
                        {teacher.email || "N/A"}
                      </td>
                      <td className="safe-text px-5 py-4 text-slate-600 dark:text-slate-300">
                        {teacher.type || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tableRows.length > 0 && (
            <PaginationControls
              pagination={hasSearched ? searchPagination : directoryPagination}
              disabled={hasSearched ? searchLoading : loading}
              onPageChange={hasSearched ? handleSearchPageChange : handleDirectoryPageChange}
            />
          )}
        </section>
      </PageShell>
    </div>
  );
}

/**
 * Small read-only field in the teacher search result.
 */
function InfoTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="safe-text mt-2 font-semibold text-slate-950 dark:text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

/**
 * Paged search controls shared by code and name search results.
 */
function PaginationControls({ pagination, disabled, onPageChange }) {
  const page = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;

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

export default TeacherInfo;
