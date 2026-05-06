"use client";

import { useEffect, useId, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiRefreshCw,
  FiSearch,
  FiStar,
} from "react-icons/fi";
import api from "../../api";
import {
  EmptyState,
  FormField,
  LoadingState,
  Notice,
  SectionHeading,
  cx,
} from "./ui";

const SORT_OPTIONS = [
  { value: "latest", label: "Latest upload" },
  { value: "stars", label: "Highest stars" },
];

/**
 * Searchable, sortable, paginated resource list used across resource surfaces.
 */
function ResourceBrowser({
  title = "Resources",
  description = "Browse shared course resources.",
  courseCode = "",
  mine = false,
  framed = true,
  limit = 6,
  refreshKey = 0,
}) {
  const [resources, setResources] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("latest");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const controlPrefix = useId();

  const fetchResources = async (nextPage = pagination.page) => {
    setLoading(true);
    setNotice(null);

    try {
      const endpoint = mine ? "/api/resources/mine" : "/api/resources";
      const response = await api.get(endpoint, {
        params: {
          page: nextPage,
          limit,
          sort,
          search,
          course: courseCode,
        },
      });

      setResources(response.data?.rows ?? []);
      setPagination(response.data?.pagination ?? {
        page: nextPage,
        limit,
        total: 0,
        totalPages: 1,
      });
    } catch (resourceError) {
      setResources([]);
      setNotice({ type: "error", text: getResourceError(resourceError) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseCode, mine, sort, search, limit, refreshKey]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) {
      return;
    }

    fetchResources(nextPage);
  };

  const content = (
    <>
      <SectionHeading
        kicker={courseCode ? courseCode : "Resources"}
        title={title}
        description={description}
        actions={
          <button type="button" onClick={() => fetchResources(1)} className="btn-secondary" disabled={loading}>
            <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      <form
        onSubmit={handleSearchSubmit}
        className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end"
      >
        <FormField id={`${controlPrefix}-resource-search`} label="Search resources">
          <div className="relative">
            <FiSearch
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id={`${controlPrefix}-resource-search`}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="form-field pl-12"
              placeholder="Search course, title, link, or student"
              type="search"
            />
          </div>
        </FormField>

        <FormField id={`${controlPrefix}-resource-sort`} label="Sort">
          <select
            id={`${controlPrefix}-resource-sort`}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="form-field"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <button type="submit" className="btn-primary" disabled={loading}>
          <FiSearch aria-hidden="true" />
          Search
        </button>
      </form>

      {notice && (
        <div className="mt-5">
          <Notice type={notice.type} onDismiss={() => setNotice(null)}>
            {notice.text}
          </Notice>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <LoadingState label="Loading resources..." />
        ) : resources.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} showCourse={!courseCode} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FiSearch className="h-7 w-7" aria-hidden="true" />}
            title="No resources found"
            description="Try another search or sorting option."
          />
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pagination.total} resource{pagination.total === 1 ? "" : "s"} found
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
            className="btn-secondary px-3"
            aria-label="Previous resource page"
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <span className="min-w-24 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="btn-secondary px-3"
            aria-label="Next resource page"
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );

  if (!framed) {
    return <section>{content}</section>;
  }

  return <section className="surface-card p-6 sm:p-8">{content}</section>;
}

function ResourceCard({ resource, showCourse }) {
  return (
    <article className="subtle-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          {showCourse && (
            <p className="section-kicker">{resource.course || "Course"}</p>
          )}
          <h3 className={cx("safe-text font-bold text-slate-950 dark:text-white", showCourse ? "mt-1" : "")}>
            {resource.courseTitle || resource.courseShortName || resource.course || "Resource"}
          </h3>
          <p className="safe-text mt-2 text-sm text-slate-500 dark:text-slate-400">
            By {resource.studentName || resource.by || "Student"}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <FiStar aria-hidden="true" />
          {Number(resource.star || 0)}
        </span>
      </div>

      {resource.images && (
        <img
          src={resource.images}
          alt=""
          className="mt-4 aspect-video w-full rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-800"
        />
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {formatDate(resource.date)}
        </span>
        <a
          href={resource.links}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          Open
          <FiExternalLink aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getResourceError(error) {
  const status = error.response?.status;
  if (status === 401) return "Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 404) return "Resources were not found.";
  if (status === 500) return "Internal server error.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not load resources.";
}

export default ResourceBrowser;
