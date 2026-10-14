"use client";

import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiLayers,
  FiPlus,
  FiSearch,
  FiShield,
  FiStar,
  FiUploadCloud,
  FiUser,
} from "react-icons/fi";
import { useAuth } from "../App";
import campusImage from "../assets/iiuc.webp";
import Header from "./components/Header";
import ResourceBrowser from "./components/ResourceBrowser";
import { PageShell } from "./components/ui";

/**
 * Dedicated resource discovery and study vault page.
 * Allows students to browse, filter, star-rate, and contribute course materials.
 */
function Resources() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const openResourceProfile = () => {
    navigate(isLoggedIn ? "/edit/details?tab=resources" : "/auth/login");
  };

  const featurePillars = [
    {
      icon: FiLayers,
      title: "8 Semesters Covered",
      description: "Filter notes, slides, and syllabus documents across Semesters 1 through 8 with credit weights.",
      badge: "Curriculum Aligned",
    },
    {
      icon: FiStar,
      title: "Community Star Ratings",
      description: "Evaluate material quality through peer star ratings and detailed student reviews.",
      badge: "Peer Verified",
    },
    {
      icon: FiUploadCloud,
      title: "Direct Cloud Links",
      description: "Access verified Google Drive folders, OneDrive repositories, GitHub source codes, and PDFs.",
      badge: "Instant Access",
    },
    {
      icon: FiSearch,
      title: "Smart Filtering",
      description: "Find materials instantly by course codes, keywords, contributor student ID, or semester level.",
      badge: "Search & Sort",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-8 sm:py-12">
        {/* Cinematic Hero Section */}
        <section className="relative isolate overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 p-6 text-white shadow-2xl sm:p-10 lg:p-12">
          {/* Background image & gradient overlays */}
          <img
            src={campusImage}
            alt="IIUC Campus"
            className="absolute inset-0 -z-30 h-full w-full object-cover opacity-25 filter blur-[0.5px]"
          />
          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-slate-950/80 via-slate-950/95 to-slate-950" />

          {/* Ambient decorative glow orbs */}
          <div
            className="pointer-events-none absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl sm:h-96 sm:w-96"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -right-20 -z-10 h-72 w-72 rounded-full bg-cyan-600/20 blur-3xl sm:h-96 sm:w-96"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            {/* Top Kicker Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-sky-200 shadow-sm backdrop-blur-md">
              <FiBookOpen className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span>IIUC CSE Knowledge Archive</span>
            </div>

            {/* Hero Main Heading */}
            <h1 className="display-heading hero-heading-glow mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Course Resource Vault
            </h1>
            <div className="heading-accent-line mx-auto" aria-hidden="true" />

            {/* Hero Subtitle */}
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
              Discover student-submitted lecture notes, past exam questions, slide decks, lab codes,
              and drive links. Filter by semester, check peer star reviews, or contribute your own materials.
            </p>

            {/* Action Bar */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={openResourceProfile}
                className="btn-primary shadow-lg shadow-violet-500/25 px-5 py-2.5 text-sm font-semibold"
              >
                <FiPlus className="h-4 w-4" aria-hidden="true" />
                <span>Contribute Resource</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/info/materials")}
                className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30 dark:border-white/20 dark:bg-white/10 dark:text-white px-5 py-2.5 text-sm font-semibold"
              >
                <FiLayers className="h-4 w-4 text-sky-300" aria-hidden="true" />
                <span>Study Materials & Syllabi</span>
              </button>

              <a
                href="#resource-library"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                <span>Browse Library</span>
                <FiArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            {/* Status indicator pill */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {isLoggedIn ? (
                <span>
                  Signed in as <strong className="text-slate-200">{user?.name || user?.id || "Student"}</strong>.
                  You can publish and manage materials anytime.
                </span>
              ) : (
                <span>
                  Publicly open to all students. Sign in to contribute new resources or write reviews.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featurePillars.map((pillar) => {
            const IconComponent = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="surface-card group relative flex flex-col justify-between overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                      <IconComponent className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {pillar.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contributor Callout Card */}
        <div className="mt-6 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/70 via-indigo-50/40 to-sky-50/70 p-5 dark:border-violet-900/40 dark:from-violet-950/20 dark:via-indigo-950/10 dark:to-sky-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm dark:bg-violet-500">
                <FiUploadCloud className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isLoggedIn ? "Have new slides, notes, or lab exercises?" : "Share your academic resources with the batch"}
                </h4>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {isLoggedIn
                    ? "Add Google Drive folders, GitHub repos, or PDF documents directly to your course archive."
                    : "Log in with your Student Metric ID to submit materials, edit your links, and rate peer resources."}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={openResourceProfile}
                className="btn-primary text-xs font-semibold py-2 px-4 shadow-sm"
              >
                {isLoggedIn ? (
                  <>
                    <FiUser className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Manage My Uploads</span>
                  </>
                ) : (
                  <>
                    <FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sign In & Contribute</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Resource Browser Container */}
        <div id="resource-library" className="mt-8 scroll-mt-20">
          <ResourceBrowser
            title="Resource Library"
            description="Use search and sorting to find resources quickly. Click the rating control on any row to review feedback or add your own."
            limit={9}
            enableCourseFilters
          />
        </div>

        {/* Academic Integrity / Community Note */}
        <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-slate-400 dark:text-slate-500">
          <FiShield className="h-3.5 w-3.5 text-violet-500 shrink-0" aria-hidden="true" />
          <span>
            Materials are submitted by students for academic assistance and peer collaboration. Please respect copyright and university guidelines.
          </span>
        </div>
      </PageShell>
    </div>
  );
}

export default Resources;
