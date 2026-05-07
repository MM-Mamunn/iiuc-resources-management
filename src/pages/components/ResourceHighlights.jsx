"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiExternalLink, FiPlus, FiSearch, FiStar } from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
import { EmptyState, LoadingState, Notice, SectionHeading } from "./ui";

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
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

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
                    <p className="safe-text mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {resource.studentName || resource.by || "Student"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    <FiStar aria-hidden="true" />
                    {formatStar(resource.star)}
                  </span>
                </div>

                <a
                  href={resource.links}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleResourceOpen}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
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

export default ResourceHighlights;
