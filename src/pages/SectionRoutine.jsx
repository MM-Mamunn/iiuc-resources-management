"use client";

import { useEffect, useState } from "react";
import { FiCalendar, FiDownload, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import api from "../api";
import { useActiveSession, useAuth } from "../App";
import { clearCacheByPrefix } from "../services/cacheService";
import { getRoutineTimeSlots, usePeriods } from "../services/periodService";
import {
  getRoutineClassDetails,
  summarizeRoutineDetails,
} from "../services/routineDetails";
import Header from "./components/Header";
import RoutineActionToggle from "./components/RoutineActionToggle";
import RoutineTable from "./components/RoutineTable";
import {
  EmptyState,
  FormField,
  MetricCard,
  Notice,
  PageShell,
  SectionHeading,
  SuggestionList,
} from "./components/ui";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DISPLAY_DAYS = ["sat", "sun", "mon", "tue", "wed"];

/**
 * Public section-routine lookup page.
 */
const SectionRoutine = () => {
  const { isLoggedIn } = useAuth();
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const [schedule, setSchedule] = useState([]);
  const [shift, setShift] = useState(1);
  const [section, setSection] = useState("");
  const [session, setSession] = useState("");
  const [sectionSuggestions, setSectionSuggestions] = useState([]);
  const [sessionSuggestions, setSessionSuggestions] = useState([]);
  const [loadingField, setLoadingField] = useState("");
  const [routineLoading, setRoutineLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [busyCourses, setBusyCourses] = useState({});
  const [notice, setNotice] = useState(null);
  const [showRoutineActions, setShowRoutineActions] = useState(false);
  const { periods } = usePeriods();

  const timeSlots = getRoutineTimeSlots(periods, shift);
  const normalizedSection = section.toUpperCase().trim();
  const normalizedSession = session.toUpperCase().trim();
  const sessionHelper = activeSessionLoading
    ? "Loading active session..."
    : activeSessionError || (activeSessionName ? `Active: ${activeSessionName}` : "Enter a session");

  useEffect(() => {
    if (activeSessionName) {
      setSession((current) => current || activeSessionName);
    }
  }, [activeSessionName]);

  const updateSuggestions = async ({ key, value, endpoint, mapValue, maxLength }) => {
    if (key === "section") setSection(value);
    if (key === "session") setSession(value);
    setHasSearched(false);

    if (value.length < 1 || value.length > maxLength) {
      if (key === "section") setSectionSuggestions([]);
      if (key === "session") setSessionSuggestions([]);
      return;
    }

    setLoadingField(key);
    try {
      const response = await api.get(`${endpoint}/${value}`);
      const nextSuggestions = response.data?.rows?.map(mapValue) ?? [];
      if (key === "section") setSectionSuggestions(nextSuggestions);
      if (key === "session") setSessionSuggestions(nextSuggestions);
    } catch {
      if (key === "section") setSectionSuggestions([]);
      if (key === "session") setSessionSuggestions([]);
    } finally {
      setLoadingField("");
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setNotice(null);
    setRoutineLoading(true);
    setSectionSuggestions([]);
    setSessionSuggestions([]);

    try {
      const response = await api.get(
        `/api/section/fullroutine/${normalizedSection}/${normalizedSession}`
      );
      setSchedule(response.data?.rows ?? []);
      setShift(response.data?.gender || 1);
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
    const key = `${action}-${courseData.code}-${courseData.section}-${courseData.session}`;
    setBusyCourses((current) => ({ ...current, [key]: true }));

    try {
      await api.post(endpoint, courseData);
      setNotice({
        type: "success",
        text: action === "add" ? `${courseData.code} added.` : `${courseData.code} removed.`,
      });
      clearCacheByPrefix("dashboard:personal-routine:");
    } catch (courseError) {
      setNotice({
        type: "error",
        text: getCourseActionError(courseError),
      });
    } finally {
      setBusyCourses((current) => ({ ...current, [key]: false }));
    }
  };

  const generateDaySchedule = (day) => {
    const daySchedule = schedule.filter((item) => item.day === DAYS.indexOf(day));
    const mergedSchedule = [];
    let slot = 1;

    while (slot <= 6) {
      if (shift === 1 && slot === 4) {
        mergedSchedule.push({ subject: "BREAK", colspan: 1, isBreak: true, slotStart: slot });
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
          title: classItem.short_name || "",
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Section routine"
            title="Find a Section Schedule"
            description="Search by section and session, then add classes into your personal routine when signed in."
          />

          <form onSubmit={handleSearch} className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <FormField
              id="section"
              label="Section"
              helper={loadingField === "section" ? "Loading suggestions..." : "Example: 7BM"}
            >
              <div className="relative">
                <input
                  id="section"
                  value={section}
                  onChange={(event) =>
                    updateSuggestions({
                      key: "section",
                      value: event.target.value,
                      endpoint: "/api/lookLike/sectionLookLike",
                      mapValue: (row) => row.sec,
                      maxLength: 4,
                    })
                  }
                  className="form-field uppercase"
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
              helper={loadingField === "session" ? "Loading suggestions..." : sessionHelper}
            >
              <div className="relative">
                <input
                  id="session"
                  value={session}
                  onChange={(event) =>
                    updateSuggestions({
                      key: "session",
                      value: event.target.value,
                      endpoint: "/api/lookLike/sessionLookLike",
                      mapValue: (row) => row.session,
                      maxLength: 30,
                    })
                  }
                  className="form-field"
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

            <button
              type="submit"
              className="btn-primary"
              disabled={routineLoading || !normalizedSection || !normalizedSession}
            >
              <FiSearch aria-hidden="true" />
              {routineLoading ? "Loading..." : "Search"}
            </button>
          </form>
        </section>

        {notice && (
          <div className="mt-6">
            <Notice type={notice.type} onDismiss={() => setNotice(null)}>
              {notice.text}
            </Notice>
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Section"
            value={normalizedSection || "None"}
            tone="violet"
          />
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Session"
            value={session}
            tone="green"
          />
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Classes"
            value={schedule.length}
            tone="amber"
          />
        </section>

        <section className="mt-8">
          {hasSearched ? (
            schedule.length ? (
              <RoutineTable
                title={`${normalizedSection} Schedule`}
                subtitle={`${normalizedSession} session`}
                timeSlots={timeSlots}
                displayDays={DISPLAY_DAYS}
                getItemsForDay={generateDaySchedule}
                actions={
                  <>
                    {isLoggedIn && (
                      <RoutineActionToggle
                        visible={showRoutineActions}
                        onToggle={() => setShowRoutineActions((current) => !current)}
                      />
                    )}
                    <button type="button" onClick={handlePrint} className="btn-secondary">
                      <FiDownload aria-hidden="true" />
                      Print
                    </button>
                  </>
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700"
                        aria-label={`Add ${item.courseData.code}`}
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-700"
                        aria-label={`Remove ${item.courseData.code}`}
                      >
                        <FiTrash2 aria-hidden="true" />
                      </button>
                    </>
                  )
                }
              />
            ) : (
              <div className="table-shell">
                <EmptyState
                  icon={<FiCalendar className="h-7 w-7" aria-hidden="true" />}
                  title="No schedule found"
                  description="Try another section or session."
                />
              </div>
            )
          ) : (
            <div className="table-shell">
              <EmptyState
                icon={<FiSearch className="h-7 w-7" aria-hidden="true" />}
                title="Search for a routine"
                description="Enter a section and session to view the timetable."
              />
            </div>
          )}
        </section>
      </PageShell>
    </div>
  );
};

function getCourseActionError(error) {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  return data?.message || data?.msg || error.message || "Could not update personal routine.";
}

export default SectionRoutine;
