"use client";

import { useEffect, useId, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
  FiExternalLink,
  FiMessageSquare,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiStar,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
import {
  EmptyState,
  FormField,
  LoadingState,
  Notice,
  SectionHeading,
} from "./ui";

const SORT_OPTIONS = [
  { value: "latest", label: "Latest upload" },
  { value: "stars", label: "Highest stars" },
];

const RATING_OPTIONS = [-1, 0, 1, 2, 3, 4, 5];

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
  manageable = false,
  onManagedChange = () => {},
}) {
  const { isLoggedIn, user } = useAuth();
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
  const [selectedResource, setSelectedResource] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingNotice, setRatingNotice] = useState(null);
  const [ratingForm, setRatingForm] = useState({ star: "5", comments: "" });
  const [editingResource, setEditingResource] = useState(null);
  const [editForm, setEditForm] = useState({ course: "", links: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteSubmittingId, setDeleteSubmittingId] = useState(null);
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
      setPagination(
        response.data?.pagination ?? {
          page: nextPage,
          limit,
          total: 0,
          totalPages: 1,
        },
      );
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

  const openRatings = async (resource) => {
    setSelectedResource(resource);
    setRatings([]);
    setRatingNotice(null);
    setRatingLoading(true);

    try {
      const response = await api.get(`/api/resources/${resource.id}/stars`);
      const nextRatings = response.data?.rows ?? [];
      const myRating = nextRatings.find((rating) => rating.by === user?.id);

      setRatings(nextRatings);
      setRatingForm({
        star: String(myRating?.star ?? 5),
        comments: myRating?.comments || "",
      });
    } catch (ratingError) {
      setRatingNotice({ type: "error", text: getRatingError(ratingError) });
    } finally {
      setRatingLoading(false);
    }
  };

  const closeRatings = () => {
    setSelectedResource(null);
    setRatings([]);
    setRatingNotice(null);
    setRatingForm({ star: "5", comments: "" });
  };

  const handleRatingSubmit = async (event) => {
    event.preventDefault();

    if (!selectedResource) return;

    setRatingSubmitting(true);
    setRatingNotice(null);

    try {
      const response = await api.post(`/api/resources/${selectedResource.id}/star`, {
        star: Number(ratingForm.star),
        comments: ratingForm.comments,
      });
      const average = response.data?.average ?? selectedResource.star;
      const nextRatings = response.data?.rows ?? [];

      setRatings(nextRatings);
      setResources((current) =>
        current.map((resource) =>
          resource.id === selectedResource.id ? { ...resource, star: average } : resource,
        ),
      );
      setSelectedResource((current) => (current ? { ...current, star: average } : current));
      setRatingNotice({ type: "success", text: "Your rating was saved." });
    } catch (ratingError) {
      setRatingNotice({ type: "error", text: getRatingError(ratingError) });
    } finally {
      setRatingSubmitting(false);
    }
  };

  const openEditResource = (resource) => {
    setEditingResource(resource);
    setEditForm({
      course: resource.course || "",
      links: resource.links || "",
    });
    setNotice(null);
  };

  const closeEditResource = () => {
    setEditingResource(null);
    setEditForm({ course: "", links: "" });
  };

  const handleResourceUpdate = async (event) => {
    event.preventDefault();

    if (!editingResource) return;

    setEditSubmitting(true);
    setNotice(null);

    try {
      await api.put(`/api/resources/${editingResource.id}`, {
        course: editForm.course,
        links: editForm.links,
      });

      closeEditResource();
      setNotice({ type: "success", text: "Resource updated successfully." });
      await fetchResources(pagination.page);
      onManagedChange();
    } catch (resourceError) {
      setNotice({ type: "error", text: getResourceError(resourceError) });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleResourceDelete = async (resource) => {
    setDeleteSubmittingId(resource.id);
    setNotice(null);

    try {
      await api.delete(`/api/resources/${resource.id}`);
      setDeleteConfirmId(null);
      setNotice({ type: "success", text: "Resource deleted successfully." });
      await fetchResources(resources.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page);
      onManagedChange();
    } catch (resourceError) {
      setNotice({ type: "error", text: getResourceError(resourceError) });
    } finally {
      setDeleteSubmittingId(null);
    }
  };

  const content = (
    <>
      <SectionHeading
        kicker={courseCode ? courseCode : "Resources"}
        title={title}
        description={description}
        actions={
          <button
            type="button"
            onClick={() => fetchResources(1)}
            className="btn-secondary"
            disabled={loading}
          >
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
              <ResourceCard
                key={resource.id}
                resource={resource}
                onRate={() => openRatings(resource)}
                manageable={manageable}
                onEdit={() => openEditResource(resource)}
                onDelete={() => handleResourceDelete(resource)}
                onConfirmDelete={() => setDeleteConfirmId(resource.id)}
                onCancelDelete={() => setDeleteConfirmId(null)}
                deleteConfirming={deleteConfirmId === resource.id}
                deleting={deleteSubmittingId === resource.id}
              />
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

  const ratingsModal = selectedResource && (
    <RatingModal
      resource={selectedResource}
      ratings={ratings}
      loading={ratingLoading}
      submitting={ratingSubmitting}
      notice={ratingNotice}
      ratingForm={ratingForm}
      isLoggedIn={isLoggedIn}
      currentUserId={user?.id}
      onClose={closeRatings}
      onSubmit={handleRatingSubmit}
      onFormChange={setRatingForm}
      onNoticeDismiss={() => setRatingNotice(null)}
    />
  );
  const editModal = editingResource && (
    <EditResourceModal
      resource={editingResource}
      editForm={editForm}
      submitting={editSubmitting}
      onClose={closeEditResource}
      onSubmit={handleResourceUpdate}
      onFormChange={setEditForm}
    />
  );

  if (!framed) {
    return (
      <section>
        {content}
        {ratingsModal}
        {editModal}
      </section>
    );
  }

  return (
    <section className="surface-card p-6 sm:p-8">
      {content}
      {ratingsModal}
      {editModal}
    </section>
  );
}

function ResourceCard({
  resource,
  onRate,
  manageable,
  onEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  deleteConfirming,
  deleting,
}) {
  const studentName = resource.studentName || "Student";
  const studentId = resource.by || "N/A";
  const profilePic = resource.studentProfilePic || resource.profilePic || "";
  const courseCode = resource.course || "Course";
  const resourceTitle = resource.courseTitle || resource.courseShortName || "Shared resource";

  return (
    <article className="subtle-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="section-kicker">Course Code</p>
          <h3 className="safe-text mt-2 text-3xl font-black text-blue-700 dark:text-blue-200">
            {courseCode}
          </h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm font-black text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
          <FiStar aria-hidden="true" />
          {formatStar(resource.star)}
        </span>
      </div>

      <h4 className="safe-text mt-4 text-lg font-bold text-slate-950 dark:text-white">
        {resourceTitle}
      </h4>

      <div className="mt-4 flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
        <Avatar image={profilePic} name={studentName} />
        <div className="min-w-0">
          <p className="safe-text text-sm font-bold text-slate-900 dark:text-white">
            {studentName}
          </p>
          <p className="safe-text mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            ID {studentId}
          </p>
          <p className="safe-text mt-1 text-xs text-slate-500 dark:text-slate-400">
            {getLinkHost(resource.links)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRate}
        className="group mt-5 flex w-full items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left text-amber-950 shadow-sm shadow-amber-500/10 transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/15"
      >
        <span className="inline-flex items-center gap-2 text-sm font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-200 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100">
            <FiStar aria-hidden="true" />
          </span>
          <span>
            <span className="block">Rate / view ratings</span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-200">
              Average {formatStar(resource.star)}
            </span>
          </span>
        </span>
        <FiChevronRight
          className="h-5 w-5 shrink-0 transition group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </button>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {formatDate(resource.date)}
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          {manageable && (
            <>
              <button type="button" onClick={onEdit} className="btn-secondary">
                <FiEdit3 aria-hidden="true" />
                Edit
              </button>
              {deleteConfirming ? (
                <>
                  <button
                    type="button"
                    onClick={onCancelDelete}
                    disabled={deleting}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleting}
                    className="btn-danger"
                  >
                    <FiTrash2 aria-hidden="true" />
                    {deleting ? "Deleting..." : "Confirm delete"}
                  </button>
                </>
              ) : (
                <button type="button" onClick={onConfirmDelete} className="btn-danger">
                  <FiTrash2 aria-hidden="true" />
                  Delete
                </button>
              )}
            </>
          )}
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
      </div>
    </article>
  );
}

function EditResourceModal({
  resource,
  editForm,
  submitting,
  onClose,
  onSubmit,
  onFormChange,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="surface-card w-full max-w-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <SectionHeading
            kicker={resource.course || "Resource"}
            title="Edit Resource"
            description="Update the course code or resource link for this submission."
          />
          <button type="button" onClick={onClose} className="btn-secondary px-3" aria-label="Close edit resource">
            <FiX aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-5">
          <FormField id="edit-resource-course" label="Course code">
            <input
              id="edit-resource-course"
              value={editForm.course}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  course: event.target.value.toUpperCase(),
                }))
              }
              className="form-field uppercase"
              placeholder="CSE-1121"
              required
            />
          </FormField>

          <FormField id="edit-resource-link" label="Resource link">
            <input
              id="edit-resource-link"
              value={editForm.links}
              onChange={(event) =>
                onFormChange((current) => ({ ...current, links: event.target.value }))
              }
              className="form-field"
              placeholder="https://drive.google.com/..."
              type="url"
              required
            />
          </FormField>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              <FiSave aria-hidden="true" />
              {submitting ? "Saving..." : "Save resource"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function RatingModal({
  resource,
  ratings,
  loading,
  submitting,
  notice,
  ratingForm,
  isLoggedIn,
  currentUserId,
  onClose,
  onSubmit,
  onFormChange,
  onNoticeDismiss,
}) {
  const myRating = ratings.find((rating) => rating.by === currentUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="surface-card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <SectionHeading
            kicker={resource.course || "Resource"}
            title="Resource Ratings"
            description={`${formatStar(resource.star)} average rating for ${resource.courseTitle || resource.course}.`}
          />
          <button type="button" onClick={onClose} className="btn-secondary px-3" aria-label="Close ratings">
            <FiX aria-hidden="true" />
          </button>
        </div>

        {notice && (
          <div className="mt-5">
            <Notice type={notice.type} onDismiss={onNoticeDismiss}>
              {notice.text}
            </Notice>
          </div>
        )}

        {isLoggedIn ? (
          <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
              <FormField id="resource-rating-star" label={myRating ? "Edit your star" : "Your star"}>
                <select
                  id="resource-rating-star"
                  value={ratingForm.star}
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, star: event.target.value }))
                  }
                  className="form-field"
                  required
                >
                  {RATING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === -1 ? "-1 Not helpful" : `${option} star${option === 1 ? "" : "s"}`}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="resource-rating-comment"
                label="Comment"
                helper={`${ratingForm.comments.length}/200 characters`}
              >
                <textarea
                  id="resource-rating-comment"
                  value={ratingForm.comments}
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, comments: event.target.value }))
                  }
                  maxLength={200}
                  className="form-field min-h-24 resize-y"
                  placeholder="Leave a short note about this resource"
                />
              </FormField>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={submitting} className="btn-primary">
                <FiStar aria-hidden="true" />
                {submitting ? "Saving..." : myRating ? "Update rating" : "Add rating"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6">
            <Notice type="info">Login to add or edit your rating. You can still review existing feedback.</Notice>
          </div>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              Ratings and comments
            </h3>
            <span className="status-pill border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {ratings.length} total
            </span>
          </div>

          {loading ? (
            <LoadingState label="Loading ratings..." />
          ) : ratings.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {ratings.map((rating) => (
                <article key={`${rating.id}-${rating.by}`} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start gap-4">
                    <Avatar image={rating.studentProfilePic} name={rating.studentName || rating.by} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="safe-text font-bold text-slate-950 dark:text-white">
                            {rating.studentName || "Student"}
                          </p>
                          <p className="safe-text mt-1 text-xs text-slate-500 dark:text-slate-400">
                            ID {rating.by}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                          <FiStar aria-hidden="true" />
                          {rating.star}
                        </span>
                      </div>
                      {rating.comments && (
                        <p className="mt-3 flex gap-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                          <FiMessageSquare className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          {rating.comments}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FiStar className="h-7 w-7" aria-hidden="true" />}
              title="No ratings yet"
              description="Be the first to leave feedback for this resource."
            />
          )}
        </section>
      </section>
    </div>
  );
}

function Avatar({ image, name }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white ring-1 ring-slate-200 dark:bg-white dark:text-slate-950 dark:ring-slate-700">
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

function formatStar(value) {
  const rating = Number(value || 0);
  return Number.isInteger(rating) ? rating.toFixed(0) : rating.toFixed(1);
}

function getInitials(value) {
  return String(value || "U")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getLinkHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Resource link";
  }
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

function getRatingError(error) {
  const status = error.response?.status;
  if (status === 400) return error.response?.data?.message || "Please check your rating.";
  if (status === 401) return "Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 404) return "Resource not found.";
  if (status === 500) return "Internal server error.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not save rating.";
}

export default ResourceBrowser;
