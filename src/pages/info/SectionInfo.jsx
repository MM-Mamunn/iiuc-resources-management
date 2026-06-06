"use client";

import { useEffect, useState } from "react";
import { FiRefreshCw, FiUsers } from "react-icons/fi";
import api from "../../api";
import Header from "../components/Header";
import { EmptyState, LoadingState, Notice, PageShell, SectionHeading } from "../components/ui";

/**
 * Public section directory with CR and ACR contact information.
 */
function SectionInfo() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/info/section");
      setSections(response.data?.rows || []);
    } catch (sectionError) {
      setError(sectionError instanceof Error ? sectionError.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Directory"
            title="Section Information"
            description="A clean reference for CR and ACR contacts across listed sections."
            actions={
              <button type="button" onClick={fetchSections} className="btn-secondary" disabled={loading}>
                <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
                Refresh
              </button>
            }
          />
        </section>

        {error && (
          <div className="mt-6">
            <Notice type="error" onDismiss={() => setError("")}>
              Error: {error}
            </Notice>
          </div>
        )}

        <section className="table-shell mt-8">
          {loading ? (
            <LoadingState label="Loading sections..." />
          ) : sections.length === 0 ? (
            <EmptyState
              icon={<FiUsers className="h-7 w-7" aria-hidden="true" />}
              title="No sections found"
              description="Section information is not available at the moment."
              action={
                <button type="button" onClick={fetchSections} className="btn-primary">
                  Try again
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <caption className="sr-only">Section CR and ACR information</caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-4 font-bold">Section</th>
                    <th scope="col" className="px-5 py-4 font-bold">CR</th>
                    <th scope="col" className="px-5 py-4 font-bold">CR Phone</th>
                    <th scope="col" className="px-5 py-4 font-bold">ACR</th>
                    <th scope="col" className="px-5 py-4 font-bold">ACR Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sections.map((section, index) => (
                    <tr key={`${section.sec}-${index}`} className="transition hover:bg-violet-50/60 dark:hover:bg-slate-900">
                      <td className="px-5 py-4">
                        <span className="status-pill border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
                          {section.sec || "N/A"}
                        </span>
                      </td>
                      <td className="safe-text px-5 py-4 font-semibold text-slate-950 dark:text-white">
                        {section.cr || "N/A"}
                      </td>
                      <td className="safe-text px-5 py-4 text-slate-600 dark:text-slate-300">
                        {section.cr_phone || "N/A"}
                      </td>
                      <td className="safe-text px-5 py-4 font-semibold text-slate-950 dark:text-white">
                        {section.acr || "N/A"}
                      </td>
                      <td className="safe-text px-5 py-4 text-slate-600 dark:text-slate-300">
                        {section.acr_phone || "N/A"}
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

export default SectionInfo;
