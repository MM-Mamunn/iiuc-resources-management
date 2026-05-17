"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiDownload,
  FiGrid,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import Header from "./components/Header";
import ResourceHighlights from "./components/ResourceHighlights";
import RoutineActionToggle from "./components/RoutineActionToggle";
import RoutineTable from "./components/RoutineTable";
import {
  EmptyState,
  FormField,
  Notice,
  SectionHeading,
  SuggestionList,
} from "./components/ui";
import routineImage from "../assets/iiuc.webp";
import api from "../api";
import { useActiveSession, useAuth } from "../App";
import { cachedRequest, clearCacheByPrefix } from "../services/cacheService";
import { getRoutineTimeSlots, usePeriods } from "../services/periodService";
import {
  getRoutineClassDetails,
  summarizeRoutineDetails,
} from "../services/routineDetails";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DISPLAY_DAYS = ["sat", "sun", "mon", "tue", "wed"];
const HOME_CACHE_TTL = 2 * 60 * 1000;

/**
 * Public landing and section routine lookup page.
 */
const Home = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const [schedule, setSchedule] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [shift, setShift] = useState(1);
  const [section, setSection] = useState("");
  const [session, setSession] = useState("");
  const [sectionSuggestions, setSectionSuggestions] = useState([]);
  const [sessionSuggestions, setSessionSuggestions] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [routineLoading, setRoutineLoading] = useState(false);
  const [busyCourses, setBusyCourses] = useState({});
  const [notice, setNotice] = useState(null);
  const [topContributors, setTopContributors] = useState([]);
  const [contributorsLoading, setContributorsLoading] = useState(false);
  const [showRoutineActions, setShowRoutineActions] = useState(false);
  const { periods } = usePeriods();

  const timeSlots = getRoutineTimeSlots(periods, shift);
  const normalizedSection = section.toUpperCase().trim();
  const normalizedSession = session.toUpperCase().trim();
  const sessionLabel = session || activeSessionName || "No active session";
  const sessionHelper = activeSessionLoading
    ? "Loading active session..."
    : activeSessionError || (activeSessionName ? `Active: ${activeSessionName}` : "Enter a session");

  useEffect(() => {
    if (activeSessionName) {
      setSession((current) => current || activeSessionName);
    }
  }, [activeSessionName]);

  useEffect(() => {
    async function fetchTopContributors() {
      setContributorsLoading(true);
      try {
        const response = await api.get("/api/info/topcontributor");
        setTopContributors(getPublicContributors(response.data?.rows));
      } catch {
        setTopContributors([]);
      } finally {
        setContributorsLoading(false);
      }
    }

    fetchTopContributors();
  }, []);

  const summaryStats = useMemo(
    () => [
      {
        label: "Active session",
        value: sessionLabel,
        icon: <FiCalendar className="h-5 w-5" aria-hidden="true" />,
        tone: "blue",
      },
      {
        label: "Visible days",
        value: DISPLAY_DAYS.length,
        icon: <FiGrid className="h-5 w-5" aria-hidden="true" />,
        tone: "teal",
      },
      {
        label: "Contributors",
        value: topContributors.length || "-",
        icon: <FiUsers className="h-5 w-5" aria-hidden="true" />,
        tone: "amber",
      },
    ],
    [sessionLabel, topContributors.length]
  );

  /**
   * Loads autocomplete matches for section codes.
   */
  const handleSectionChange = async (event) => {
    const value = event.target.value;
    setSection(value);
    setHasSearched(false);

    if (value.length < 1 || value.length > 4) {
      setSectionSuggestions([]);
      return;
    }

    setSectionLoading(true);
    try {
      const response = await api.get(`/api/lookLike/sectionLookLike/${value}`);
      const sections = response.data?.rows?.map((row) => row.sec) ?? [];
      setSectionSuggestions(sections);
    } catch {
      setSectionSuggestions([]);
    } finally {
      setSectionLoading(false);
    }
  };

  /**
   * Loads autocomplete matches for available sessions.
   */
  const handleSessionChange = async (event) => {
    const value = event.target.value;
    setSession(value);
    setHasSearched(false);

    if (value.length < 1 || value.length > 30) {
      setSessionSuggestions([]);
      return;
    }

    setSessionLoading(true);
    try {
      const response = await api.get(`/api/lookLike/sessionLookLike/${value}`);
      const sessions = response.data?.rows?.map((row) => row.session) ?? [];
      setSessionSuggestions(sessions);
    } catch {
      setSessionSuggestions([]);
    } finally {
      setSessionLoading(false);
    }
  };

  /**
   * Fetches the selected section routine.
   */
  const handleSearch = async (event) => {
    event.preventDefault();
    setNotice(null);
    setRoutineLoading(true);
    setSectionSuggestions([]);
    setSessionSuggestions([]);

    try {
      const routineData = await cachedRequest(
        `home:section-routine:${normalizedSection}:${normalizedSession}`,
        async () => {
          const response = await api.get(
            `/api/section/fullroutine/${normalizedSection}/${normalizedSession}`,
          );
          return {
            rows: response.data?.rows ?? [],
            gender: response.data?.gender || 1,
          };
        },
        { ttl: HOME_CACHE_TTL },
      );
      setSchedule(routineData.rows);
      setShift(routineData.gender);
      setHasSearched(true);
    } catch {
      setSchedule([]);
      setShift(1);
      setHasSearched(true);
      setNotice({
        type: "error",
        text: "Could not load this routine. Please check the section and session.",
      });
    } finally {
      setRoutineLoading(false);
    }
  };

  /**
   * Adds or removes a course from the authenticated user's routine.
   */
  const updatePersonalCourse = async (action, courseData) => {
    if (!isLoggedIn) {
      setNotice({
        type: "error",
        text: "Please sign in before adding or removing personal courses.",
      });
      return;
    }

    const endpoint =
      action === "add" ? "/api/user/course_insert" : "/api/user/course_delete";
    const busyKey = `${action}-${courseData.code}-${courseData.section}-${courseData.session}`;
    setBusyCourses((current) => ({ ...current, [busyKey]: true }));

    try {
      await api.post(endpoint, {
        code: courseData.code,
        section: courseData.section,
        session: courseData.session,
      });
      setNotice({
        type: "success",
        text:
          action === "add"
            ? `${courseData.code} was added to your routine.`
            : `${courseData.code} was removed from your routine.`,
      });
      clearCacheByPrefix("dashboard:personal-routine:");
    } catch (error) {
      setNotice({
        type: "error",
        text: getCourseActionError(error, action),
      });
    } finally {
      setBusyCourses((current) => ({ ...current, [busyKey]: false }));
    }
  };

  /**
   * Converts API routine rows into table cells with break and empty slots.
   */
  const generateDaySchedule = (day) => {
    const daySchedule = schedule.filter((item) => item.day === DAYS.indexOf(day));
    const mergedSchedule = [];
    let slot = 1;

    while (slot <= 6) {
      if (shift === 1 && slot === 4) {
        mergedSchedule.push({
          subject: "BREAK",
          colspan: 1,
          isBreak: true,
          slotStart: slot,
        });
      }

      const classItem = daySchedule.find((item) => Number(item.slot) === slot);
      if (classItem) {
        const count = Number(classItem.count || 1);
        const details = getRoutineClassDetails(classItem, {
          section: normalizedSection,
          session: normalizedSession,
          day: DAYS.indexOf(day),
          dayLabel: day,
          slot,
        });
        const summary = summarizeRoutineDetails(details, {
          subject: classItem.code || "Course",
          title: classItem.short_name || classItem.name || "",
          room: classItem.room || "",
          faculty: classItem.name || classItem.faculty || "",
        });

        mergedSchedule.push({
          subject: summary.subject,
          title: summary.title,
          room: summary.room,
          faculty: summary.faculty,
          colspan: count,
          slotStart: slot,
          courseData: {
            code: details[0]?.courseCode || classItem.code || "Course",
            section: normalizedSection,
            session: normalizedSession,
          },
          day: DAYS.indexOf(day),
          details,
        });
        slot += count;
      } else {
        mergedSchedule.push({ subject: "-", colspan: 1, slotStart: slot });
        slot += 1;
      }
    }

    return mergedSchedule;
  };

  /**
   * Opens a printable routine view in a new tab.
   */
  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setNotice({
        type: "error",
        text: "Your browser blocked the print window. Allow popups and try again.",
      });
      return;
    }

    printWindow.document.write(
      buildPrintableRoutine({
        title: `Class Schedule - ${normalizedSection}`,
        subtitle: `Session: ${normalizedSession}`,
        timeSlots,
        displayDays: DISPLAY_DAYS,
        getItemsForDay: generateDaySchedule,
      })
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const canSearch =
    normalizedSection.length >= 1 &&
    normalizedSection.length <= 4 &&
    normalizedSession.length >= 1;
  const openCommunityProfile = (studentId) => {
    const contributorId = String(studentId || "").trim();

    if (!contributorId) {
      navigate("/info/community");
      return;
    }

    navigate(`/info/community?student=${encodeURIComponent(contributorId)}`);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <img
          src={routineImage}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-75"
        />
        <div className="absolute inset-0 -z-10 bg-slate-950/55" />

        <div className="page-wrap grid gap-8 py-12 lg:grid-cols-[1fr_430px] lg:items-center lg:py-16">
          <div className="max-w-3xl animate-enter">
            <p className="inline-flex rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-teal-100 ring-1 ring-white/15">
              IIUC CSE Resources
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Find routines, rooms, and study resources faster.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Search section routines instantly, then save courses into your personal dashboard after signing in.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {summaryStats.map((stat) => (
                <div
                  key={stat.label}
                  className="hero-glass-card p-4"
                >
                  <div className="mb-3 text-teal-200">{stat.icon}</div>
                  <p className="text-sm text-slate-300">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSearch} className="hero-glass-card hero-form-card p-5 text-white">
            <div className="mb-5">
              <p className="text-sm font-semibold text-teal-200">Routine lookup</p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Search a section
              </h2>
            </div>

            <div className="grid gap-4">
              <FormField
                id="section"
                label="Section"
                helper={sectionLoading ? "Searching sections..." : "Example: 7BM"}
                labelClassName="!text-slate-100"
                helperClassName="!text-slate-300"
              >
                <div className="relative">
                  <FiSearch
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300"
                    aria-hidden="true"
                  />
                  <input
                    id="section"
                    type="text"
                    value={section}
                    onChange={handleSectionChange}
                    placeholder="Enter section"
                    className="form-field pl-12 uppercase"
                    autoComplete="off"
                  />
                  <SuggestionList
                    suggestions={sectionSuggestions}
                    onSelect={(suggestion) => {
                      setSection(suggestion);
                      setSectionSuggestions([]);
                    }}
                  />
                </div>
              </FormField>

              <FormField
                id="session"
                label="Session"
                helper={sessionLoading ? "Searching sessions..." : sessionHelper}
                labelClassName="!text-slate-100"
                helperClassName="!text-slate-300"
              >
                <div className="relative">
                  <FiCalendar
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300"
                    aria-hidden="true"
                  />
                  <input
                    id="session"
                    type="text"
                    value={session}
                    onChange={handleSessionChange}
                    placeholder={activeSessionName || "Active session"}
                    className="form-field pl-12"
                    autoComplete="off"
                  />
                  <SuggestionList
                    suggestions={sessionSuggestions}
                    onSelect={(suggestion) => {
                      setSession(suggestion);
                      setSessionSuggestions([]);
                    }}
                  />
                </div>
              </FormField>

              <button type="submit" className="btn-primary w-full" disabled={!canSearch || routineLoading}>
                {routineLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Loading routine...
                  </>
                ) : (
                  <>
                    <FiSearch aria-hidden="true" />
                    View schedule
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      <main className="page-wrap space-y-14 py-12">
        {notice && (
          <Notice type={notice.type} onDismiss={() => setNotice(null)}>
            {notice.text}
          </Notice>
        )}

        {hasSearched && (
          <RoutineTable
            title={`${normalizedSection || "Section"} Schedule`}
            subtitle={`${normalizedSession || activeSessionName || "Selected"} session`}
            timeSlots={timeSlots}
            displayDays={schedule.length ? DISPLAY_DAYS : []}
            getItemsForDay={generateDaySchedule}
            actions={
              schedule.length > 0 && (
                <>
                  {isLoggedIn && (
                    <RoutineActionToggle
                      visible={showRoutineActions}
                      onToggle={() => setShowRoutineActions((current) => !current)}
                    />
                  )}
                  <button type="button" onClick={handleDownloadPDF} className="btn-secondary">
                    <FiDownload aria-hidden="true" />
                    Print routine
                  </button>
                </>
              )
            }
            renderCourseActions={(item) =>
              isLoggedIn &&
              showRoutineActions &&
              item.courseData && (
                <>
                  <button
                    type="button"
                    onClick={() => updatePersonalCourse("add", item.courseData)}
                    disabled={
                      busyCourses[
                        `add-${item.courseData.code}-${item.courseData.section}-${item.courseData.session}`
                      ]
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                    aria-label={`Add ${item.courseData.code} to personal routine`}
                    title="Add course"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePersonalCourse("remove", item.courseData)}
                    disabled={
                      busyCourses[
                        `remove-${item.courseData.code}-${item.courseData.section}-${item.courseData.session}`
                      ]
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-60"
                    aria-label={`Remove ${item.courseData.code} from personal routine`}
                    title="Remove course"
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                </>
              )
            }
            emptyTitle="No schedule found"
            emptyDescription="Try another section or session combination."
          />
        )}

        <section className="space-y-6">
          <SectionHeading
            kicker="Quick access"
            title="Academic tools that stay close"
            description="Common routine, room, and course actions are grouped so students can move through the app without hunting through menus."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <QuickAction
              icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
              title="Section routine"
              description="Open public section schedules for the selected session."
              href="/routine/section"
            />
            <QuickAction
              icon={<FiUsers className="h-5 w-5" aria-hidden="true" />}
              title="Teacher routine"
              description="Check faculty schedules and available teaching slots."
              href="/routine/teacher"
            />
            <QuickAction
              icon={<FiBookOpen className="h-5 w-5" aria-hidden="true" />}
              title="Resources"
              description="Browse course resources shared by students."
              href="/resources"
            />
          </div>
        </section>

        <ResourceHighlights
          onAdd={() => navigate(isLoggedIn ? "/edit/details?tab=resources" : "/auth/login")}
          onFind={() => navigate("/resources")}
        />

        <section>
          <div className="surface-card p-6">
            <SectionHeading
              kicker="Contributors"
              title="Top routine contributors"
              description="Students with the highest number of submitted resources."
            />

            <div className="mt-6">
              {contributorsLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : topContributors.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {topContributors.slice(0, 6).map((contributor, index) => (
                    <ContributorCard
                      key={contributor.id || index}
                      contributor={contributor}
                      rank={index + 1}
                      onOpenProfile={openCommunityProfile}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<FiAward className="h-7 w-7" aria-hidden="true" />}
                  title="No contributors yet"
                  description="Contributor data is not available right now."
                />
              )}
            </div>
          </div>
        </section>
      </main>

    </div>
  );
};

/**
 * Compact navigation card used on the home page.
 */
function QuickAction({ icon, title, description, href }) {
  return (
    <a href={href} className="interactive-card group block p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-200">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-slate-950 dark:text-white">
            {title}
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-400">
            {description}
          </span>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            Open <FiArrowRight aria-hidden="true" />
          </span>
        </span>
      </div>
    </a>
  );
}

function getPublicContributors(rows = []) {
  return rows.filter((contributor) => contributor?.profileHidden !== true);
}

/**
 * Contributor summary card with rank and points.
 */
function ContributorCard({ contributor, rank, onOpenProfile }) {
  const points = Number(contributor.resourceCount || contributor.point || contributor.points || 0);
  const highlighted = rank <= 3;
  const initials = getContributorInitials(contributor);

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(contributor.id)}
      className={`rounded-lg border p-4 transition ${
        highlighted
          ? "border-amber-200 bg-amber-50/80 shadow-sm shadow-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/10"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
      } text-left hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
    >
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white ring-2 ring-white dark:bg-white dark:text-slate-950 dark:ring-slate-800">
          {contributor.profilePic ? (
            <img src={contributor.profilePic} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <div className="min-w-0 flex-1">
          <span className={`text-xs font-black uppercase ${highlighted ? "text-amber-700 dark:text-amber-200" : "text-slate-500 dark:text-slate-400"}`}>
            Rank #{rank}
          </span>
          <p className="safe-text font-bold text-slate-950 dark:text-white">
            {contributor.name || "Contributor"}
          </p>
          <p className="safe-text mt-1 text-xs text-slate-500 dark:text-slate-400">
            ID: {contributor.id || "N/A"}
          </p>
        </div>
        <span className="rounded-lg bg-white px-3 py-2 text-right text-sm font-bold text-slate-950 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-white dark:ring-slate-800">
          <span className="block text-lg">{Number.isFinite(points) ? points.toLocaleString() : 0}</span>
          <span className="block text-[11px] uppercase text-slate-500 dark:text-slate-400">resources</span>
        </span>
      </div>
    </button>
  );
}

function getContributorInitials(contributor) {
  return String(contributor?.name || contributor?.id || "C")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Maps backend course action status codes into helpful UI copy.
 */
function getCourseActionError(error, action) {
  const status = error.response?.status;
  const apiMessage = getApiErrorMessage(error);

  if (apiMessage) return apiMessage;

  if (action === "add") {
    if (status === 409) return "This course already exists in your routine.";
    if (status === 422) return "You cannot add more than three courses in this slot.";
    if (status === 402 || status === 403 || status === 404) return "This class is not available for your personal routine.";
  }

  if (action === "remove") {
    if (status === 404) return "This course was not found in your routine.";
    if (status === 402 || status === 403) return "This class is not available in your personal routine.";
  }

  if (status === 500) return "The server could not complete the request. Please try later.";
  return "The request could not be completed.";
}

function getApiErrorMessage(error) {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  return data?.message || data?.msg || "";
}

/**
 * Builds a print-friendly timetable document.
 */
function buildPrintableRoutine({ title, subtitle, timeSlots, displayDays, getItemsForDay }) {
  const rows = displayDays
    .map((day) => {
      const cells = getItemsForDay(day)
        .map((item) => {
          const className = item.isBreak
            ? "break-cell"
            : item.subject !== "-"
              ? "course-cell"
              : "empty-cell";
          const content = item.isBreak
            ? "Break"
            : item.subject !== "-"
              ? `<strong>${item.subject}</strong><span>${item.title || ""}</span><span>${item.room ? `Room ${item.room}` : ""}</span><span>${item.faculty || ""}</span>`
              : "-";
          return `<td colspan="${item.colspan}" class="${className}">${content}</td>`;
        })
        .join("");

      return `<tr><th>${day}</th>${cells}</tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; padding: 32px; font-family: Arial, sans-serif; color: #111827; background: #ffffff; }
      header { margin-bottom: 24px; padding: 24px; border-radius: 8px; background: #0f172a; color: white; }
      h1 { margin: 0; font-size: 28px; }
      p { margin: 8px 0 0; color: #d1d5db; }
      table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 8px; }
      th, td { border: 1px solid #dbe3ef; padding: 12px; text-align: center; vertical-align: top; }
      thead th { background: #f1f5f9; color: #0f172a; }
      tbody th { text-transform: capitalize; background: #f8fafc; }
      td span { display: block; margin-top: 4px; font-size: 12px; color: #475569; }
      .course-cell { background: #ffffff; border-left: 4px solid #2563eb; }
      .break-cell { background: #fffbeb; color: #92400e; font-weight: 700; }
      .empty-cell { color: #94a3b8; }
      @media print { body { padding: 0; } header { border-radius: 0; } }
    </style>
  </head>
  <body>
    <header>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </header>
    <table>
      <thead><tr><th>Day</th>${timeSlots.map((slot) => `<th>${slot}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;
}

export default Home;
