import { useState } from "react";
import { FiUser, FiMail, FiBriefcase, FiLoader, FiAlertCircle, FiCheckCircle, FiTrash2, FiSend } from "react-icons/fi";
import api from "../api";
import Header from "./components/Header";
import { PageShell, cx } from "./components/ui";

function TeacherInfoExtract() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [results, setResults] = useState([]);

  const handleClear = () => {
    setText("");
    setError("");
    setSuccessMsg("");
    setResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please enter some text to extract information.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");
    setResults([]);

    try {
      const response = await api.post("/api/externalagent/teacherinfo", {
        text: text,
      });

      if (response.data && response.data.success) {
        setSuccessMsg(response.data.message || "Successfully extracted teacher information.");
        setResults(response.data.results || []);
      } else {
        setError("Failed to extract information. Please try again.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.msg || err.message || "An error occurred while extracting information.";
      if (err.response && err.response.status === 401) {
        setError("Unauthorized: Please log in again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-8 sm:py-10">
        <section className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="section-kicker">
                <FiUser className="h-3.5 w-3.5" aria-hidden="true" />
                Extraction
              </p>
              <h1 className="display-heading mt-3 text-2xl text-slate-950 sm:text-3xl dark:text-white">
                Teacher Information Extractor
              </h1>
              <div className="heading-accent-line mt-3 h-0.5 w-16" aria-hidden="true" />
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Paste plain text containing supervisor details to automatically extract and format the information.
              </p>
            </div>
          </div>

          <div className="mt-8 surface-card p-6 sm:p-8">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <label htmlFor="text-input" className="text-sm font-semibold text-slate-900 dark:text-white">
                    Plain Text
                  </label>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {text.length} characters
                  </span>
                </div>
                <textarea
                  id="text-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={loading}
                  rows={8}
                  placeholder="Supervisor Name: Chern Hong Lim&#10;Position: Senior Lecturer&#10;University: Monash University Malaysia&#10;..."
                  className="form-field min-h-48 resize-y text-sm leading-6 sm:text-base p-4"
                />
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {successMsg && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">{successMsg}</p>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading || (!text && results.length === 0)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  <FiTrash2 className="h-4 w-4 mr-2" />
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={!text.trim() || loading}
                  className="btn-primary w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <FiSend className="-ml-1 mr-2 h-4 w-4" />
                      Extract Information
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {results.length > 0 && (
            <div className="mt-10 animate-enter">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                Extracted Supervisors <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-2">({results.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {results.map((teacher, index) => (
                  <div key={index} className="surface-card flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:border-violet-200 dark:hover:border-violet-500/30">
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="mb-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white line-clamp-1">
                          {teacher.name || "Unknown Name"}
                        </h3>
                        {teacher.designation && (
                          <div className="flex items-start gap-2 mt-2 text-slate-700 dark:text-slate-300">
                            <FiBriefcase className="w-4 h-4 mt-1 shrink-0 text-violet-500" />
                            <span className="text-sm font-medium">{teacher.designation}</span>
                          </div>
                        )}
                        {teacher.email && (
                          <div className="flex items-center gap-2 mt-2 text-slate-600 dark:text-slate-400">
                            <FiMail className="w-4 h-4 shrink-0 text-violet-500" />
                            <a 
                              href={`mailto:${teacher.email}`} 
                              className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 truncate"
                            >
                              {teacher.email}
                            </a>
                          </div>
                        )}
                      </div>

                      {teacher.research_interests && teacher.research_interests.length > 0 && (
                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/60">
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                            Research Interests
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {teacher.research_interests.map((interest, idx) => (
                              <span 
                                key={idx} 
                                className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </PageShell>
    </div>
  );
}

export default TeacherInfoExtract;
