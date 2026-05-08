"use client";

import { useNavigate } from "react-router-dom";
import { FiBookOpen, FiPlus } from "react-icons/fi";
import { useAuth } from "../App";
import Header from "./components/Header";
import ResourceBrowser from "./components/ResourceBrowser";
import { MetricCard, PageShell, SectionHeading } from "./components/ui";

/**
 * Dedicated resource discovery page.
 */
function Resources() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const openResourceProfile = () => {
    navigate(isLoggedIn ? "/edit/details?tab=resources" : "/auth/login");
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Resources"
            title="Find Course Resources"
            description="Search links, filter by course keywords, sort by newest uploads or highest average rating, and open student-submitted material."
            actions={
              <button type="button" onClick={openResourceProfile} className="btn-primary">
                <FiPlus aria-hidden="true" />
                Add Resource
              </button>
            }
          />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiBookOpen className="h-5 w-5" aria-hidden="true" />}
            label="Browse mode"
            value="Cards"
            tone="blue"
          />
          <MetricCard
            icon={<FiBookOpen className="h-5 w-5" aria-hidden="true" />}
            label="Feedback"
            value="Stars"
            tone="amber"
          />
          <MetricCard
            icon={<FiBookOpen className="h-5 w-5" aria-hidden="true" />}
            label="Pagination"
            value="Enabled"
            tone="teal"
          />
        </section>

        <div className="mt-8">
          <ResourceBrowser
            title="Resource Library"
            description="Use search and sorting to find resources quickly. Click the rating panel on any card to review feedback or add your own."
            limit={9}
            enableCourseFilters
          />
        </div>
      </PageShell>
    </div>
  );
}

export default Resources;
