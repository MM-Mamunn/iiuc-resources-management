"use client";

import { useEffect, useRef, useState } from "react";
import { FiRefreshCw, FiSearch, FiUser, FiUsers } from "react-icons/fi";
import api from "../../api";
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

/**
 * Teacher directory with faculty-code autocomplete search.
 */
function TeacherInfo() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const searchDropdownRef = useRef(null);

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

  const fetchTeachers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/info/teacher");
      setTeachers(response.data?.rows || []);
    } catch (teacherError) {
      setError(teacherError instanceof Error ? teacherError.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = async (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    setSearchResult(null);
    setSearchError("");

    if (value.length < 1 || value.length > 10) {
      setSearchSuggestions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get(`/api/lookLike/facultyLookLike/${value}`);
      const faculties = response.data?.rows?.map((row) => row.code) ?? [];
      setSearchSuggestions(faculties);
    } catch {
      setSearchSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError("Please enter a teacher code to search.");
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    try {
      const response = await api.get(`/api/teacher/search/${searchQuery.trim()}`);
      const result = response.data?.rows?.[0] || null;
      setSearchResult(result);
      if (!result) setSearchError("No teacher found with this short name.");
    } catch {
      setSearchError("Error searching for teacher.");
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Directory"
            title="Teacher Information"
            description="Search faculty by short code or browse the full teacher directory."
            actions={
              <button type="button" onClick={fetchTeachers} className="btn-secondary" disabled={loading}>
                <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </button>
            }
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end" ref={searchDropdownRef}>
            <FormField
              id="teacher-search"
              label="Teacher code"
              helper={searchLoading ? "Searching suggestions..." : "Example: JAA"}
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
                  placeholder="Search by teacher code"
                  className="form-field pl-12 uppercase"
                  autoComplete="off"
                />
                <SuggestionList
                  suggestions={searchSuggestions}
                  onSelect={(suggestion) => {
                    setSearchQuery(suggestion);
                    setSearchSuggestions([]);
                  }}
                />
              </div>
            </FormField>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searchLoading}
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
            value={teachers.length}
            tone="blue"
          />
          <MetricCard
            icon={<FiUser className="h-5 w-5" aria-hidden="true" />}
            label="Search result"
            value={searchResult?.code || "None"}
            tone={searchResult ? "teal" : "amber"}
          />
          <MetricCard
            icon={<FiSearch className="h-5 w-5" aria-hidden="true" />}
            label="Lookup"
            value="Short code"
            tone="teal"
          />
        </section>

        {searchResult && (
          <section className="surface-card mt-8 p-5">
            <SectionHeading kicker="Search result" title={searchResult.name || "Teacher"} />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <InfoTile label="Code" value={searchResult.code} />
              <InfoTile label="Designation" value={searchResult.desig} />
              <InfoTile label="Phone" value={searchResult.phone} />
              <InfoTile label="Email" value={searchResult.email} />
              <InfoTile label="Type" value={searchResult.type} />
            </div>
          </section>
        )}

        <section className="table-shell mt-8">
          {loading ? (
            <LoadingState label="Loading teachers..." />
          ) : teachers.length === 0 ? (
            <EmptyState
              icon={<FiUsers className="h-7 w-7" aria-hidden="true" />}
              title="No teachers found"
              description="Teacher information is not available at the moment."
              action={
                <button type="button" onClick={fetchTeachers} className="btn-primary">
                  Try again
                </button>
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
                  {teachers.map((teacher, index) => (
                    <tr key={`${teacher.code}-${index}`} className="transition hover:bg-blue-50/60 dark:hover:bg-slate-900">
                      <td className="px-5 py-4">
                        <span className="status-pill border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
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

export default TeacherInfo;
