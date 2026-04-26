"use client";

import { useState } from "react";
import { FiCalendar, FiDownload, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import api from "../api";
import { useAuth } from "../App";
import Header from "./components/Header";
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
const SLOT_LABELS = {
  1: [
    "10.40-11.30",
    "11.30-12.20",
    "12.20-1.10",
    "Break",
    "1.50-2.40",
    "2.40-3.30",
    "3.30-4.20",
  ],
  2: [
    "8.20-9.10",
    "9.10-10.00",
    "10.00-10.50",
    "10.50-11.40",
    "11.40-12.30",
    "12.30-1.20",
  ],
};

/**
 * Public section-routine lookup page.
 */
const SectionRoutine = () => {
  const { isLoggedIn } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [shift, setShift] = useState(1);
  const [section, setSection] = useState("");
  const [session, setSession] = useState("Spring-26");
  const [sectionSuggestions, setSectionSuggestions] = useState([]);
  const [sessionSuggestions, setSessionSuggestions] = useState([]);
  const [loadingField, setLoadingField] = useState("");
  const [routineLoading, setRoutineLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [busyCourses, setBusyCourses] = useState({});
  const [notice, setNotice] = useState(null);

  const timeSlots = SLOT_LABELS[shift] ?? SLOT_LABELS[1];
  const normalizedSection = section.toUpperCase().trim();
  const normalizedSession = session.toUpperCase().trim();

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
    } catch (courseError) {
      setNotice({
        type: "error",
        text: courseError.response?.data?.message || "Could not update personal routine.",
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
        const code = classItem.code || "Course";
        mergedSchedule.push({
          subject: code,
          title: classItem.short_name || "",
          room: classItem.room || "",
          faculty: classItem.name || classItem.faculty || "",
          colspan: count,
          slotStart: slot,
          courseData: {
            code,
            section: normalizedSection,
            session: normalizedSession,
          },
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
              helper={loadingField === "session" ? "Loading suggestions..." : "Example: Spring-26"}
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
            tone="blue"
          />
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Session"
            value={session}
            tone="teal"
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
                  <button type="button" onClick={handlePrint} className="btn-secondary">
                    <FiDownload aria-hidden="true" />
                    Print
                  </button>
                }
                renderCourseActions={(item) =>
                  isLoggedIn &&
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

export default SectionRoutine;
