"use client";

import { useMemo, useState } from "react";
import { FiAward, FiChevronDown, FiMail, FiUserCheck, FiUsers } from "react-icons/fi";
import Header from "../components/Header";
import { MetricCard, PageShell, SectionHeading, cx } from "../components/ui";

const contributorsData = [
  {
    name: "Mamun Mahmud",
    id: "C221046",
    email: "c221046@ugrad.iiuc.ac.bd",
    field: "Development",
    description:
      "Built the main structure of the project, implemented core features, and ensured responsive design.",
  },
  {
    name: "Md. Rayhan Uddain",
    id: "C221050",
    email: "c221050@ugrad.iiuc.ac.bd",
    field: "Data Entry & Testing",
    description: "Entered data for the following sections:",
  },
  {
    name: "Tawheedul Amin Siam",
    id: "C221043",
    email: "c221043@ugrad.iiuc.ac.bd",
    field: "Data Entry",
    description: "Entered data for the following sections:",
  },
  {
    name: "Mayeen Uddin Hasan",
    id: "C221047",
    email: "c221047@ugrad.iiuc.ac.bd",
    field: "Data Entry",
    description: "Entered data for the following sections:",
  },
  {
    name: "Parba Das Gupta",
    id: "C221049",
    email: "c221049@ugrad.iiuc.ac.bd",
    field: "Data Entry",
    description: "Entered data for the following sections:",
  },
  {
    name: "Istahadul Haque Tasin",
    id: "C221059",
    email: "c221059@ugrad.iiuc.ac.bd",
    field: "Data Entry",
    description: "Entered data for the following sections:",
  },
  {
    name: "Md. Najmus Sakib Rafi",
    id: "C221060",
    email: "c221060@ugrad.iiuc.ac.bd",
    field: "Course Material",
    description: "Sorted Course Materials links",
  },
  {
    name: "Faisal Fardin Chowdhury",
    id: "C221072",
    email: "c221072@ugrad.iiuc.ac.bd",
    field: "Marketing",
    description: "Marketing",
  },
  {
    name: "Nazrul Islam Sajib",
    id: "C221074",
    email: "c221074@ugrad.iiuc.ac.bd",
    field: "Data Entry",
    description: "Entered data for the following sections:",
  },
  {
    name: "MD. Faisal Haque Rifat",
    id: "C221076",
    email: "c221076@ugrad.iiuc.ac.bd",
    field: "Data Entry",
    description: "Entered data for the following sections:",
  },
  {
    name: "Nahid Alam Chowdhury",
    id: "C221062",
    email: "c221062@ugrad.iiuc.ac.bd",
    field: "Data Entry",
    description: "Entered data for the following sections:",
  },
];

/**
 * Contributor directory with compact cards and expandable contribution notes.
 */
export default function Contributor() {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const fields = useMemo(
    () => new Set(contributorsData.map((contributor) => contributor.field)).size,
    []
  );

  const toggleRowExpansion = (index) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Community"
            title="Contributors"
            description="People who helped build, verify, organize, and improve the routine and resource experience."
          />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiUsers className="h-5 w-5" aria-hidden="true" />}
            label="Contributors"
            value={contributorsData.length}
            tone="violet"
          />
          <MetricCard
            icon={<FiAward className="h-5 w-5" aria-hidden="true" />}
            label="Contribution areas"
            value={fields}
            tone="amber"
          />
          <MetricCard
            icon={<FiUserCheck className="h-5 w-5" aria-hidden="true" />}
            label="Primary focus"
            value="Resources"
            tone="green"
          />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contributorsData.map((contributor, index) => {
            const isExpanded = expandedRows.has(index);
            const initials = contributor.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <article key={contributor.id} className="interactive-card p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="safe-text text-lg font-bold text-slate-950 dark:text-white">
                      {contributor.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {contributor.id}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <span className="status-pill border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
                    {contributor.field}
                  </span>
                  <a
                    href={`mailto:${contributor.email}`}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-violet-700 dark:text-slate-300 dark:hover:text-violet-300"
                  >
                    <FiMail className="h-4 w-4" aria-hidden="true" />
                    <span className="safe-text">{contributor.email}</span>
                  </a>
                  <p
                    className={cx(
                      "safe-text text-sm leading-6 text-slate-600 dark:text-slate-400",
                      !isExpanded && "line-clamp-2"
                    )}
                  >
                    {contributor.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleRowExpansion(index)}
                  className="btn-secondary mt-5 w-full"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? "Show less" : "Show more"}
                  <FiChevronDown
                    className={cx("transition", isExpanded && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
              </article>
            );
          })}
        </section>
      </PageShell>
    </div>
  );
}
