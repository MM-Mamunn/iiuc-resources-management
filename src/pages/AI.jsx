"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCpu,
  FiLock,
  FiLoader,
  FiMessageSquare,
  FiSend,
  FiZap,
} from "react-icons/fi";
import api from "../api";
import { useFeatureSettings } from "../App";
import Header from "./components/Header";
import MarkdownRenderer from "./components/MarkdownRenderer";
import { LoadingState, PageShell, cx } from "./components/ui";

/**
 * Single-turn AI assistant page backed by /api/agentcall.
 */
function AI() {
  const { aiFeatureEnabled, aiFeatureLoading, aiFeatureError } = useFeatureSettings();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [welcomeError, setWelcomeError] = useState("");
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [welcomeRequestKey, setWelcomeRequestKey] = useState(0);
  const requestedWelcomeKey = useRef(null);

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
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery || loading || !aiFeatureEnabled) return;

    setActiveQuery(trimmedQuery);
    setAnswer("");
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/api/agentcall", { query: trimmedQuery });
      setAnswer(formatAgentResponse(response.data));
    } catch (agentError) {
      setError(getAgentErrorMessage(agentError));
    } finally {
      setLoading(false);
    }
  };

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
        <PageShell className="py-10">
          <section className="mx-auto max-w-3xl surface-card p-6 text-center sm:p-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
              <FiLock className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="section-kicker mt-5">AI Feature</p>
            <h1 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
              AI is currently disabled
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              This workspace has been turned off by an administrator. Requests are paused until the feature is enabled again.
            </p>
            {aiFeatureError && (
              <p className="mx-auto mt-4 max-w-xl rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
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
      <PageShell className="py-8 sm:py-10">
        <section className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
            <p className="section-kicker">
              <FiCpu className="h-3.5 w-3.5" aria-hidden="true" />
              AI
            </p>
            <h1 className="display-heading mt-3 text-2xl text-slate-950 sm:text-3xl dark:text-white">
              RMS Assistant
            </h1>
            <div className="heading-accent-line mt-3 h-0.5 w-16" aria-hidden="true" />
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Ask one focused academic or resource question. Each submission replaces the previous response.
            </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Enabled
            </div>
          </div>

          <section
            className="surface-card mt-6 overflow-hidden"
            aria-live="polite"
            aria-busy={welcomeLoading}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                <FiZap className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="section-kicker">Welcome</p>
                <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">
                  Your RMS hello
                </h2>
              </div>
            </div>

            <div className="min-h-28 p-5">
              {welcomeLoading ? (
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <FiLoader className="animate-spin text-violet-600 dark:text-violet-300" aria-hidden="true" />
                  Preparing your welcome...
                </div>
              ) : welcomeError ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="safe-text text-sm text-rose-700 dark:text-rose-200">
                    {welcomeError}
                  </p>
                  <button
                    type="button"
                    onClick={() => setWelcomeRequestKey((key) => key + 1)}
                    className="btn-secondary w-fit px-3 py-2 text-sm"
                  >
                    Try again
                  </button>
                </div>
              ) : welcome ? (
                <p className="whitespace-pre-line text-sm font-semibold leading-7 text-slate-700 dark:text-slate-200">
                  {welcome}
                </p>
              ) : null}
            </div>
          </section>

          <form onSubmit={handleSubmit} className="surface-card mt-6 overflow-hidden p-4 sm:p-5">
            <label htmlFor="ai-query" className="sr-only">
              AI query
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                <FiMessageSquare className="h-5 w-5" aria-hidden="true" />
              </div>
              <textarea
                id="ai-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={loading}
                placeholder="Find the course resources of the course Machine Learning"
                rows={4}
                className="form-field min-h-32 resize-y pl-16 text-sm leading-7 sm:text-base"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
                <FiZap className="h-3.5 w-3.5" aria-hidden="true" />
                Single response
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim() || !aiFeatureEnabled}
                className="btn-primary w-full sm:w-auto"
              >
                {loading ? (
                  <FiLoader className="animate-spin" aria-hidden="true" />
                ) : (
                  <FiSend aria-hidden="true" />
                )}
                {loading ? "Processing" : "Send"}
              </button>
            </div>
          </form>
        </section>

        <section
          className={cx(
            "mx-auto mt-6 max-w-4xl transition-all duration-300 ease-out",
            hasResult ? "opacity-100" : "opacity-95",
          )}
          aria-live="polite"
          aria-busy={loading}
        >
          <div className="surface-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-lg shadow-violet-600/20 dark:bg-white dark:text-slate-950">
                  <FiCpu className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-950 dark:text-white">
                    Response
                  </h2>
                  {activeQuery && (
                    <p className="safe-text mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {activeQuery}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-[260px] p-5 sm:p-7">
              {loading ? (
                <ThinkingState />
              ) : error ? (
                <ErrorState message={error} />
              ) : answer ? (
                <article key={answer} className="animate-enter">
                  <MarkdownRenderer content={answer} />
                </article>
              ) : (
                <EmptyResponse />
              )}
            </div>
          </div>
        </section>
      </PageShell>
    </div>
  );
}

function ThinkingState() {
  return (
    <div className="animate-enter">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 animate-soft-pulse items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
          <FiCpu className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">
            AI is thinking
            <span className="ml-1 inline-flex w-8 justify-between align-middle" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500" />
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Preparing the response...
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="h-4 w-11/12 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-9/12 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-16 animate-pulse rounded-lg bg-amber-50 dark:bg-amber-500/10" />
          <div className="h-16 animate-pulse rounded-lg bg-violet-50 dark:bg-violet-500/10" />
          <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="animate-enter rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-500/30">
          <FiAlertCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-black">Request failed</h3>
          <p className="safe-text mt-1 text-sm leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyResponse() {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 shadow-sm shadow-violet-600/10 dark:bg-violet-500/10 dark:text-violet-200">
        <FiCpu className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-lg font-black text-slate-950 dark:text-white">
        Ready when you are
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        The latest answer will appear here.
      </p>
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
