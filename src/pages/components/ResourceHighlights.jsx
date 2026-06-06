"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiChevronRight,
  FiExternalLink,
  FiPlus,
  FiSearch,
  FiStar,
} from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
import { EmptyState, LoadingState, Notice, SectionHeading } from "./ui";
import { RatingModal } from "./ResourceBrowser";

/**
 * Compact latest-resource preview with navigation actions.
 */
function ResourceHighlights({
  title = "Latest entered resources",
  description = "Recent course links shared by students.",
  onAdd,
  onFind,
  limit = 3,
}) {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingNotice, setRatingNotice] = useState(null);
  const [ratingForm, setRatingForm] = useState({ star: "5", comments: "" });

  useEffect(() => {
    async function fetchLatestResources() {
      setLoading(true);
      setNotice(null);

      try {
        const response = await api.get("/api/resources", {
          params: { limit, sort: "latest" },
        });
        setResources(response.data?.rows ?? []);
      } catch (resourceError) {
        setResources([]);
        setNotice({ type: "error", text: getResourceError(resourceError) });
      } finally {
        setLoading(false);
      }
    }

    fetchLatestResources();
  }, [limit]);

  const handleResourceOpen = (event) => {
    if (isLoggedIn) return;

    event.preventDefault();
    navigate("/auth/login");
  };

  const openContributorProfile = (studentId) => {
    const contributorId = String(studentId || "").trim();

    if (!contributorId) return;

    navigate(`/info/community?student=${encodeURIComponent(contributorId)}`);
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

  return (
    <section className="surface-card p-6 sm:p-8">
      <SectionHeading
        kicker="Resources"
        title={title}
        description={description}
        actions={
          <>
            <button type="button" onClick={onAdd} className="btn-primary">
              <FiPlus aria-hidden="true" />
              Add Your Resources
            </button>
            <button type="button" onClick={onFind} className="btn-secondary">
              <FiSearch aria-hidden="true" />
              Find Resources
            </button>
          </>
        }
      />

      {notice && (
        <div className="mt-5">
          <Notice type={notice.type} onDismiss={() => setNotice(null)}>
            {notice.text}
          </Notice>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <LoadingState label="Loading latest resources..." />
        ) : resources.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {resources.map((resource) => (
              <article key={resource.id} className="subtle-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="section-kicker">{resource.course || "Course"}</p>
                    <h3 className="safe-text mt-1 font-bold text-slate-950 dark:text-white">
                      {resource.courseTitle || resource.courseShortName || "Shared resource"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => openContributorProfile(resource.by)}
                      className="mt-2 block max-w-full text-left text-sm font-semibold text-slate-600 transition hover:text-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-400 dark:hover:text-violet-300"
                    >
                      <span className="safe-text block">
                        {resource.studentName || resource.by || "Student"}
                      </span>
                      {resource.by && (
                        <span className="safe-text mt-0.5 block text-xs text-slate-500 dark:text-slate-500">
                          ID: {resource.by}
                        </span>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRatings(resource)}
                    className="group inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm font-bold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30 dark:hover:bg-amber-500/15"
                    aria-label={`Rate or view ratings for ${resource.course || "resource"}`}
                  >
                    <FiStar aria-hidden="true" />
                    {formatStar(resource.star)}
                    <FiChevronRight
                      className="h-4 w-4 transition group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <a
                  href={resource.links}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleResourceOpen}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
                >
                  Open resource
                  <FiExternalLink aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FiArrowRight className="h-7 w-7" aria-hidden="true" />}
            title="No resources yet"
            description="Shared resources will appear here as soon as students add them."
          />
        )}
      </div>

      {selectedResource && (
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
      )}
    </section>
  );
}

function formatStar(value) {
  const rating = Number(value || 0);
  return Number.isInteger(rating) ? rating.toFixed(0) : rating.toFixed(1);
}

function getResourceError(error) {
  const status = error.response?.status;
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

export default ResourceHighlights;
