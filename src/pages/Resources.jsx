"use client";

import { useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import { useAuth } from "../App";
import campusImage from "../assets/iiuc.webp";
import Header from "./components/Header";
import ResourceBrowser from "./components/ResourceBrowser";
import { PageShell } from "./components/ui";

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
        <section className="relative isolate overflow-hidden rounded-lg bg-slate-950 px-6 py-8 text-white shadow-2xl sm:px-8">
          <img
            src={campusImage}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 -z-10 bg-slate-950/72" />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-teal-200">Resources</p>
              <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">
                Find Course Resources
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                Search links, filter by course keywords, sort by newest uploads or highest average rating, and open student-submitted material.
              </p>
            </div>
            <button
              type="button"
              onClick={openResourceProfile}
              className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20 dark:border-white/20 dark:bg-white/10 dark:text-white"
            >
              <FiPlus aria-hidden="true" />
              Add Resource
            </button>
          </div>
        </section>

        <div className="mt-8">
          <ResourceBrowser
            title="Resource Library"
            description="Use search and sorting to find resources quickly. Click the rating control on any row to review feedback or add your own."
            limit={9}
            enableCourseFilters
          />
        </div>
      </PageShell>
    </div>
  );
}

export default Resources;
