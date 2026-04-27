"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiDownload,
  FiSearch,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import api from "../../api";
import { useActiveSession } from "../../App";
import Header from "../components/Header";
import RoutineTable from "../components/RoutineTable";
import {
  EmptyState,
  FormField,
  LoadingState,
  MetricCard,
  Notice,
  PageShell,
  SectionHeading,
  SuggestionList,
  cx,
} from "../components/ui";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DISPLAY_DAYS = ["sat", "sun", "mon", "tue", "wed"];
const SLOT_LABELS = {
  male: [
    "10.40-11.30",
    "11.31-12.20",
    "12.21-1.10",
    "Break",
    "1.50-2.40",
    "2.41-3.30",
    "3.31-4.20",
  ],
  female: [
    "8.20-9.10",
    "9.10-10.00",
    "10.00-10.50",
    "10.50-11.40",
    "11.40-12.30",
    "12.30-1.20",
  ],
};

/**
 * Teacher routine lookup with autocomplete and a reusable timetable surface.
 */
const TeacherRoutine = () => {
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const [schedule, setSchedule] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [session, setSession] = useState("");
  const [teacherQuery, setTeacherQuery] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [gender, setGender] = useState("male");
  const [sessionSuggestions, setSessionSuggestions] = useState([]);
  const [teacherSuggestions, setTeacherSuggestions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentClass = useMemo(
    () => getCurrentClass(schedule, gender, currentTime),
    [schedule, gender, currentTime],
  );

  const timeSlots = SLOT_LABELS[gender];
  const sessionHelper = activeSessionLoading
    ? "Loading active session..."
    : activeSessionError || (activeSessionName ? `Active: ${activeSessionName}` : "Enter a session");

  useEffect(() => {
    if (activeSessionName) {
      setSession((current) => current || activeSessionName);
    }
  }, [activeSessionName]);

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
      const response = await api.get(
        `/api/lookLike/sessionLookLike/${encodeURIComponent(value)}`,
      );
      const sessions = response.data?.rows?.map((row) => row.session) ?? [];
      setSessionSuggestions(sessions);
    } catch {
      setSessionSuggestions([]);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleTeacherChange = async (event) => {
    const value = event.target.value;
    setTeacherQuery(value);
    setTeacherCode("");
    setHasSearched(false);

    if (value.length < 1 || value.length > 50) {
      setTeacherSuggestions([]);
      return;
    }

    setTeacherLoading(true);
    try {
      const response = await api.get(
        `/api/lookLike/facultyLookLike/${encodeURIComponent(value)}`,
      );
      setTeacherSuggestions(response.data?.rows ?? []);
    } catch {
      setTeacherSuggestions([]);
    } finally {
      setTeacherLoading(false);
    }
  };

  const fetchTeacherRoutine = async () => {
    const sessionInput = session.toUpperCase().trim();
    const teacherInput = (teacherCode || teacherQuery).trim();

    if (!teacherInput) {
      setNotice({ type: "error", text: "Enter a teacher code or choose one from suggestions." });
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const response = await api.get(
        `/api/teacher/fullroutine/${encodeURIComponent(teacherInput)}/${encodeURIComponent(
          sessionInput,
        )}/${gender}`,
      );
      setSchedule(response.data?.rows ?? []);
      setHasSearched(true);
    } catch {
      setSchedule([]);
      setHasSearched(true);
      setNotice({ type: "error", text: "Could not load the teacher routine." });
    } finally {
      setLoading(false);
      setSessionSuggestions([]);
      setTeacherSuggestions([]);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    await fetchTeacherRoutine();
  };

  const handleGenderChange = (nextGender) => {
    setGender(nextGender);
    setHasSearched(false);
    setSchedule([]);
  };

  const generateDaySchedule = (day) => {
    const daySchedule = schedule.filter((item) => Number(item.day) === DAYS.indexOf(day));
    const mergedSchedule = [];
    let slot = 1;

    while (slot <= 6) {
      if (gender === "male" && slot === 4) {
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
        mergedSchedule.push({
          subject: classItem.code || "Course",
          title: classItem.short_name || "",
          room: classItem.room || "",
          faculty: classItem.sec ? `Section ${classItem.sec}` : "",
          colspan: count,
          slotStart: slot,
        });
        slot += count;
      } else {
        mergedSchedule.push({ subject: "-", colspan: 1, slotStart: slot });
        slot += 1;
      }
    }

    return mergedSchedule;
  };

  const teacherLabel = teacherCode || teacherQuery || "Not selected";

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Teacher routine"
            title="Faculty Schedule"
            description="Search by teacher code or name, choose the session, and view a clean weekly timetable."
            actions={
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                {["male", "female"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleGenderChange(option)}
                    className={cx(
                      "rounded-md px-4 py-2 text-sm font-semibold capitalize transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      gender === option
                        ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-200"
                        : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            }
          />

          <form
            onSubmit={handleSearch}
            className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end"
            autoComplete="off"
          >
            <FormField
              id="teacher"
              label="Teacher"
              helper={teacherLoading ? "Loading teacher suggestions..." : "Search by name or code."}
            >
              <div className="relative">
                <FiUser
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="teacher"
                  name="teacher"
                  value={teacherQuery}
                  onChange={handleTeacherChange}
                  type="text"
                  placeholder="JAA or teacher name"
                  className="form-field pl-12"
                />
                <SuggestionList
                  suggestions={teacherSuggestions}
                  getLabel={(teacher) =>
                    `${teacher.name || teacher.code || "Teacher"}${teacher.code ? ` (${teacher.code})` : ""}`
                  }
                  onSelect={(teacher) => {
                    setTeacherQuery(teacher.code || teacher.name || "");
                    setTeacherCode(teacher.code || teacher.name || "");
                    setTeacherSuggestions([]);
                  }}
                />
              </div>
            </FormField>

            <FormField
              id="session"
              label="Session"
              helper={sessionLoading ? "Loading session suggestions..." : sessionHelper}
            >
              <div className="relative">
                <FiCalendar
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="session"
                  name="session"
                  value={session}
                  onChange={handleSessionChange}
                  type="text"
                  placeholder={activeSessionName || "Active session"}
                  className="form-field pl-12"
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
              disabled={loading || !session.trim() || !(teacherCode || teacherQuery).trim()}
              className="btn-primary"
            >
              <FiSearch aria-hidden="true" />
              {loading ? "Loading..." : "View routine"}
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

        {currentClass && hasSearched && (
          <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            <p className="text-sm font-bold uppercase">Live now</p>
            <h2 className="mt-2 text-2xl font-bold">{currentClass.code}</h2>
            <p className="mt-1 text-sm">
              {currentClass.short_name || "Scheduled class"} - Room {currentClass.room || "N/A"}
            </p>
          </section>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiUsers className="h-5 w-5" aria-hidden="true" />}
            label="Teacher"
            value={teacherLabel}
            tone="blue"
          />
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Session"
            value={session}
            tone="teal"
          />
          <MetricCard
            icon={<FiClock className="h-5 w-5" aria-hidden="true" />}
            label="Current class"
            value={currentClass?.code || "None"}
            tone={currentClass ? "teal" : "amber"}
          />
        </section>

        <section className="mt-8">
          {loading ? (
            <LoadingState label="Loading teacher routine..." />
          ) : hasSearched ? (
            schedule.length ? (
              <RoutineTable
                title="Teacher Schedule"
                subtitle={`${teacherLabel} - ${session} - ${gender}`}
                timeSlots={timeSlots}
                displayDays={DISPLAY_DAYS}
                getItemsForDay={generateDaySchedule}
                actions={
                  <button type="button" onClick={() => window.print()} className="btn-secondary">
                    <FiDownload aria-hidden="true" />
                    Print
                  </button>
                }
                getDayMeta={(day) => ({
                  active: day === DAYS[currentTime.getDay()],
                  label: day === DAYS[currentTime.getDay()] ? "Today" : "",
                })}
                getCellMeta={(day, item) => ({
                  active:
                    Boolean(currentClass) &&
                    day === DAYS[currentTime.getDay()] &&
                    item.subject !== "-" &&
                    !item.isBreak &&
                    Number(currentClass.slot) >= Number(item.slotStart) &&
                    Number(currentClass.slot) <
                      Number(item.slotStart) + Number(item.colspan || 1),
                })}
              />
            ) : (
              <div className="table-shell">
                <EmptyState
                  icon={<FiCalendar className="h-7 w-7" aria-hidden="true" />}
                  title="No routine found"
                  description="No schedule was found for this teacher, session, and shift."
                />
              </div>
            )
          ) : (
            <div className="table-shell">
              <EmptyState
                icon={<FiSearch className="h-7 w-7" aria-hidden="true" />}
                title="Search a teacher routine"
                description="Choose a teacher and session to view the weekly schedule."
              />
            </div>
          )}
        </section>
      </PageShell>
    </div>
  );
};

function getCurrentClass(schedule, gender, now) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const dayIndex = now.getDay();
  const slotWindows =
    gender === "male"
      ? [
          { start: 10 * 60 + 40, end: 11 * 60 + 30, slot: 1 },
          { start: 11 * 60 + 31, end: 12 * 60 + 20, slot: 2 },
          { start: 12 * 60 + 21, end: 13 * 60 + 10, slot: 3 },
          { start: 13 * 60 + 50, end: 14 * 60 + 40, slot: 4 },
          { start: 14 * 60 + 41, end: 15 * 60 + 30, slot: 5 },
          { start: 15 * 60 + 31, end: 16 * 60 + 20, slot: 6 },
        ]
      : [
          { start: 8 * 60 + 20, end: 9 * 60 + 10, slot: 1 },
          { start: 9 * 60 + 10, end: 10 * 60, slot: 2 },
          { start: 10 * 60, end: 10 * 60 + 50, slot: 3 },
          { start: 10 * 60 + 50, end: 11 * 60 + 40, slot: 4 },
          { start: 11 * 60 + 40, end: 12 * 60 + 30, slot: 5 },
          { start: 12 * 60 + 30, end: 13 * 60 + 20, slot: 6 },
        ];

  const currentSlot = slotWindows.find((slot) => minutes >= slot.start && minutes <= slot.end);
  if (!currentSlot) return null;

  return (
    schedule
      .filter((item) => Number(item.day) === dayIndex)
      .find(
        (item) =>
          currentSlot.slot >= Number(item.slot) &&
          currentSlot.slot < Number(item.slot) + Number(item.count || 1),
      ) || null
  );
}

export default TeacherRoutine;
