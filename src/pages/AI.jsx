"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiCopy,
  FiCpu,
  FiDownload,
  FiLoader,
  FiLock,
  FiMessageSquare,
  FiRefreshCw,
  FiSend,
  FiZap,
} from "react-icons/fi";
import api from "../api";
import { useActiveSession, useAuth, useFeatureSettings } from "../App";
import campusImage from "../assets/iiuc.webp";
import Header from "./components/Header";
import MarkdownRenderer from "./components/MarkdownRenderer";
import { LoadingState, PageShell, cx } from "./components/ui";

const PROMPT_SUGGESTIONS = [
  "Find the course resources of the course Machine Learning",
  "Find the information of Mamun Mahmud Sir",
  "Show section routine and room allocations for 5BM of autumn-25",
  "Find study materials for Database Management Systems",
];

const THINKING_STEPS = [
  "Interpreting query intent and entities...",
  "Searching university schedule and course database...",
  "Cross-referencing faculty records and resources...",
  "Synthesizing structured Markdown response...",
];

/**
 * World-class single-turn AI assistant studio backed by /api/agentcall.
 */
function AI() {
  const { aiFeatureEnabled, aiFeatureLoading, aiFeatureError } = useFeatureSettings();
  const { activeSessionName } = useActiveSession();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingStepIndex, setThinkingStepIndex] = useState(0);

  const [welcome, setWelcome] = useState("");
  const [welcomeError, setWelcomeError] = useState("");
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [welcomeRequestKey, setWelcomeRequestKey] = useState(0);

  const [copied, setCopied] = useState(false);
  const [recentQueries, setRecentQueries] = useState([]);

  const requestedWelcomeKey = useRef(null);
  const textareaRef = useRef(null);
  const responseSectionRef = useRef(null);

  // Cycling thinking status messages
  useEffect(() => {
    if (!loading) {
      setThinkingStepIndex(0);
      return undefined;
    }

    const interval = setInterval(() => {
      setThinkingStepIndex((current) => (current + 1) % THINKING_STEPS.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [loading]);

  // Load welcome message
  useEffect(() => {
    if (aiFeatureLoading || !aiFeatureEnabled) return undefined;
    if (requestedWelcomeKey.current === welcomeRequestKey) return undefined;

    let cancelled = false;
    requestedWelcomeKey.current = welcomeRequestKey;
    setWelcomeLoading(true);
    setWelcomeError("");

    api
      .post("/api/agent/welcome")
      .then((response) => {
        if (!cancelled) {
          setWelcome(getWelcomeResponse(response.data));
        }
      })
      .catch((welcomeRequestError) => {
        if (!cancelled) {
          setWelcomeError(getAgentErrorMessage(welcomeRequestError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWelcomeLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [aiFeatureEnabled, aiFeatureLoading, welcomeRequestKey]);

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery || loading || !aiFeatureEnabled) return;

    setActiveQuery(trimmedQuery);
    setAnswer("");
    setError("");
    setLoading(true);

    // Save to recent queries
    setRecentQueries((prev) => {
      const filtered = prev.filter((item) => item !== trimmedQuery);
      return [trimmedQuery, ...filtered].slice(0, 3);
    });

    try {
      const response = await api.post("/api/agentcall", { query: trimmedQuery });
      const formatted = formatAgentResponse(response.data);
      setAnswer(formatted);

      // Smooth scroll to response
      setTimeout(() => {
        responseSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (agentError) {
      setError(getAgentErrorMessage(agentError));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSuggestion = (suggestionText) => {
    setQuery(suggestionText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleCopy = () => {
    if (!answer) return;
    try {
      navigator.clipboard?.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    if (!answer) return;
    const blob = new Blob([answer], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RMS-AI-Response-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = answer ? answer.trim().split(/\s+/).filter(Boolean).length : 0;
  const hasResult = Boolean(answer || error || loading);

  if (aiFeatureLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <PageShell className="py-10">
          <LoadingState label="Checking AI availability..." />
        </PageShell>
      </div>
    );
  }

  if (!aiFeatureEnabled) {
    return (
      <div className="min-h-screen">
        <Header />
        <PageShell className="py-12 sm:py-16">
          <section className="mx-auto max-w-2xl surface-card relative overflow-hidden rounded-3xl border border-slate-200/80 p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900/90 sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 shadow-inner dark:bg-amber-500/10 dark:text-amber-200">
              <FiLock className="h-8 w-8" aria-hidden="true" />
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-100/50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Feature Paused
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              AI Assistant is Offline
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              The RMS AI query engine has been temporarily deactivated by a system administrator.
              Scheduled routine, classroom, and resource searches remain fully available.
            </p>
            {aiFeatureError && (
              <p className="mx-auto mt-5 max-w-lg rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {aiFeatureError}
              </p>
            )}
          </section>
        </PageShell>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-8 sm:py-12">
        {/* Cinematic Hero Section */}
        <section className="relative isolate overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 p-6 text-white shadow-2xl sm:p-10 lg:p-12">
          <img
            src={campusImage}
            alt="IIUC Campus"
            className="absolute inset-0 -z-30 h-full w-full object-cover opacity-20 filter blur-[0.5px]"
          />
          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-slate-950/80 via-slate-950/95 to-slate-950" />
          <div
            className="pointer-events-none absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl sm:h-96 sm:w-96"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -right-20 -z-10 h-72 w-72 rounded-full bg-cyan-600/20 blur-3xl sm:h-96 sm:w-96"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-violet-300 shadow-sm backdrop-blur-md">
                <FiCpu className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
                <span>RMS Neural Co-Pilot • AI Studio</span>
              </div>
              <h1 className="display-heading hero-heading-glow mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Academic AI Assistant
              </h1>
              <div className="heading-accent-line mt-3 h-0.5 w-20" aria-hidden="true" />
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Ask single-turn academic, schedule, or course material questions.
                Get structured, verified answers synthesized directly from university course catalogs and timetable records.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col shrink-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Engine Online</span>
              </div>
              {activeSessionName && (
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1.5 text-xs font-bold text-sky-200 backdrop-blur-md">
                  <FiCalendar className="h-3.5 w-3.5 text-sky-400" />
                  <span>Session: {activeSessionName}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Main Content Layout */}
        <div className="mx-auto mt-8 max-w-4xl space-y-6">
          {/* Welcome Greeting Banner */}
          <section
            className="surface-card overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm dark:border-slate-800"
            aria-live="polite"
            aria-busy={welcomeLoading}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                  <FiZap className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  AI Greeting • Hello, {user?.name || user?.id || "Student"}
                </span>
              </div>
              {welcomeError && (
                <button
                  type="button"
                  onClick={() => setWelcomeRequestKey((key) => key + 1)}
                  className="btn-secondary py-1 px-2 text-xs"
                >
                  <FiRefreshCw className="h-3 w-3" aria-hidden="true" />
                  <span>Retry</span>
                </button>
              )}
            </div>

            <div className="p-5">
              {welcomeLoading ? (
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <FiLoader className="h-4 w-4 animate-spin text-violet-600" aria-hidden="true" />
                  <span>Connecting with RMS knowledge base...</span>
                </div>
              ) : welcomeError ? (
                <p className="safe-text text-xs text-rose-600 dark:text-rose-400">{welcomeError}</p>
              ) : welcome ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                  {welcome}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Ready to answer your course and routine inquiries. Choose a suggestion below or write a query.
                </p>
              )}
            </div>
          </section>

          {/* Prompt Suggestions */}
          <section className="surface-card overflow-hidden rounded-2xl border border-slate-200/90 p-5 shadow-sm dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Suggested Prompts
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Click to load into composer
              </span>
            </div>

            {/* Prompt suggestion chips */}
            <div className="mt-3.5 flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-violet-400 hover:bg-violet-50/60 hover:text-violet-800 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-violet-600 dark:hover:bg-violet-950/40 dark:hover:text-violet-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Recent Queries Strip */}
            {recentQueries.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Recent:
                </span>
                {recentQueries.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="truncate max-w-xs rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  >
                    &ldquo;{item}&rdquo;
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Query Composer Box */}
          <form
            onSubmit={handleSubmit}
            className="surface-card overflow-hidden rounded-2xl border border-slate-200/90 p-5 shadow-sm transition dark:border-slate-800"
          >
            <label htmlFor="ai-query" className="sr-only">
              Academic Inquiry
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                <FiMessageSquare className="h-5 w-5" aria-hidden="true" />
              </div>
              <textarea
                ref={textareaRef}
                id="ai-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Ask about routines, classrooms, teacher contact hours, or semester course drive links..."
                rows={4}
                className="form-field min-h-32 resize-y pl-16 text-sm leading-relaxed sm:text-base font-normal"
              />
            </div>

            {/* Composer Action Bar */}
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80">
              <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                <span className="hidden sm:inline">
                  Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Ctrl+Enter</kbd> to run
                </span>
                {query.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{query.length} chars</span>
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !query.trim() || !aiFeatureEnabled}
                className="btn-primary w-full sm:w-auto px-6 py-2.5 text-xs font-semibold shadow-md shadow-violet-500/20"
              >
                {loading ? (
                  <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FiSend className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{loading ? "Synthesizing..." : "Generate Answer"}</span>
              </button>
            </div>
          </form>

          {/* Response Console */}
          <section
            ref={responseSectionRef}
            className={cx(
              "transition-all duration-300 ease-out scroll-mt-20",
              hasResult ? "opacity-100" : "opacity-95",
            )}
            aria-live="polite"
            aria-busy={loading}
          >
            <div className="surface-card overflow-hidden rounded-2xl border border-slate-200/90 shadow-md dark:border-slate-800">
              {/* Header */}
              <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
                    <FiCpu className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-950 dark:text-white">
                      Synthesized Knowledge Response
                    </h2>
                    {activeQuery && (
                      <p className="safe-text mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                        Query: &ldquo;{activeQuery}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {answer && (
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-xs text-slate-400 font-medium mr-2">
                      {wordCount} words
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="btn-secondary py-1.5 px-3 text-xs"
                      title="Copy response to clipboard"
                    >
                      {copied ? (
                        <>
                          <FiCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          <span className="text-emerald-700 dark:text-emerald-300">Copied!</span>
                        </>
                      ) : (
                        <>
                          <FiCopy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="btn-secondary py-1.5 px-3 text-xs"
                      title="Download as Markdown"
                    >
                      <FiDownload className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="min-h-[260px] p-6 sm:p-8">
                {loading ? (
                  <ThinkingState stepText={THINKING_STEPS[thinkingStepIndex]} />
                ) : error ? (
                  <ErrorState message={error} />
                ) : answer ? (
                  <article key={answer} className="animate-enter prose dark:prose-invert max-w-none">
                    <MarkdownRenderer content={answer} />
                  </article>
                ) : (
                  <EmptyResponse onSelectPrompt={handleSelectSuggestion} />
                )}
              </div>
            </div>
          </section>
        </div>
      </PageShell>
    </div>
  );
}

function ThinkingState({ stepText }) {
  return (
    <div className="animate-enter">
      <div className="flex items-center gap-3.5">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-500/25">
          <FiCpu className="h-6 w-6 animate-pulse" aria-hidden="true" />
          <span className="absolute -inset-1 rounded-2xl bg-violet-500/30 blur-sm animate-ping" />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            RMS Co-Pilot is reasoning
            <span className="ml-1.5 inline-flex w-8 justify-between align-middle" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500" />
            </span>
          </p>
          <p className="mt-0.5 text-xs font-medium text-violet-600 dark:text-violet-300">
            {stepText}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="h-4 w-11/12 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800" />
        <div className="h-4 w-9/12 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-16 animate-pulse rounded-xl bg-amber-50/70 dark:bg-amber-500/10" />
          <div className="h-16 animate-pulse rounded-xl bg-violet-50/70 dark:bg-violet-500/10" />
          <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="animate-enter rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-700 shadow-sm ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-500/30">
          <FiAlertCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-bold text-sm">Query Failed</h3>
          <p className="safe-text mt-1 text-xs leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyResponse({ onSelectPrompt }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center text-center p-4">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-700 shadow-sm dark:from-violet-950/40 dark:to-indigo-950/40 dark:text-violet-300">
        <FiCpu className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-bold text-slate-950 dark:text-white">
        Knowledge Base Ready
      </h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Enter a question or click any suggested prompt above to begin synthesis.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => onSelectPrompt("Show section routine and room allocations for 5BM")}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
        >
          Check 5BM Routine
        </button>
        <button
          type="button"
          onClick={() => onSelectPrompt("Find the course resources of the course Machine Learning")}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
        >
          Machine Learning Notes
        </button>
      </div>
    </div>
  );
}

function formatAgentResponse(data) {
  if (typeof data === "string") return data.trim() || "No response received.";
  if (data == null) return "No response received.";

  const knownValue = data.response || data.answer || data.message || data.output;
  if (typeof knownValue === "string") return knownValue.trim() || "No response received.";

  return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}

function getWelcomeResponse(data) {
  const welcome = data?.welcome;

  if (typeof welcome === "string" && welcome.trim()) {
    return welcome.trim();
  }

  throw new Error("No welcome message was received.");
}

function getAgentErrorMessage(error) {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  return data?.error || data?.message || data?.msg || "The AI response could not be loaded.";
}

export default AI;
