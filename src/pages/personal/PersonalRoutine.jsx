"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiClock, FiDownload, FiSearch } from "react-icons/fi";
import api from "../../api";
import { useActiveSession } from "../../App";
import {
  getCurrentRoutineClass,
  getRoutineTimeSlots,
  usePeriods,
} from "../../services/periodService";
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
} from "../components/ui";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DISPLAY_DAYS = ["sat", "sun", "mon", "tue", "wed"];

/**
 * Personal routine lookup by session.
 */
const PersonalRoutine = () => {
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const [schedule, setSchedule] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [session, setSession] = useState("");
  const [sessionSuggestions, setSessionSuggestions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shift, setShift] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notice, setNotice] = useState(null);
  const { periods } = usePeriods();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeSlots = getRoutineTimeSlots(periods, shift);
  const currentClass = useMemo(
    () => getCurrentRoutineClass(schedule, shift, periods, currentTime),
    [schedule, shift, periods, currentTime]
  );
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
    setHasSearched(false);
    setSession(value);

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

  const fetchPersonalRoutine = async () => {
    const sessionInput = session.toUpperCase().trim();
    setLoading(true);
    setNotice(null);

    try {
      const response = await api.post(`/api/user/fullroutine/${sessionInput}`, {});
      setSchedule(response.data?.rows ?? []);
      setShift(response.data?.gender || 1);
      setHasSearched(true);
    } catch {
      setSchedule([]);
      setShift(1);
      setHasSearched(true);
      setNotice({ type: "error", text: "Could not load your personal routine." });
    } finally {
      setLoading(false);
      setSessionSuggestions([]);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    await fetchPersonalRoutine();
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
        mergedSchedule.push({
          subject: classItem.code || "Course",
          title: classItem.short_name || "",
          room: classItem.room || "",
          faculty: classItem.name || classItem.faculty || "",
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Personal routine"
            title="My Schedule"
            description="Load your routine for any session and see the current active class highlighted."
          />

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <span className="h-2.5 w-2.5 animate-soft-pulse rounded-full bg-teal-500" />
            {currentTime.toLocaleString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          <form onSubmit={handleSearch} className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <FormField
              id="session"
              label="Session"
              helper={sessionLoading ? "Loading suggestions..." : sessionHelper}
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

            <button type="submit" disabled={loading || !session.trim()} className="btn-primary">
              <FiSearch aria-hidden="true" />
              {loading ? "Loading..." : "Load routine"}
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

        {currentClass && (
          <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            <p className="text-sm font-bold uppercase">Live now</p>
            <h2 className="mt-2 text-2xl font-bold">{currentClass.code}</h2>
            <p className="mt-1 text-sm">
              {currentClass.short_name || currentClass.name || currentClass.faculty} - Room {currentClass.room || "N/A"}
            </p>
          </section>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Session"
            value={session}
            tone="blue"
          />
          <MetricCard
            icon={<FiClock className="h-5 w-5" aria-hidden="true" />}
            label="Current class"
            value={currentClass?.code || "None"}
            tone={currentClass ? "teal" : "amber"}
          />
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Loaded classes"
            value={schedule.length}
            tone="teal"
          />
        </section>

        <section className="mt-8">
          {loading ? (
            <LoadingState label="Loading routine..." />
          ) : hasSearched ? (
            schedule.length ? (
              <RoutineTable
                title="Personal Schedule"
                subtitle={`${session} session`}
                timeSlots={timeSlots}
                displayDays={DISPLAY_DAYS}
                getItemsForDay={generateDaySchedule}
                actions={
                  <button type="button" onClick={handlePrint} className="btn-secondary">
                    <FiDownload aria-hidden="true" />
                    Print
                  </button>
                }
                getCellMeta={(day, item) => ({
                  active:
                    Boolean(currentClass) &&
                    day === DAYS[currentTime.getDay()] &&
                    item.subject !== "-" &&
                    !item.isBreak &&
                    currentClass.slot >= item.slotStart &&
                    currentClass.slot < item.slotStart + item.colspan,
                })}
              />
            ) : (
              <div className="table-shell">
                <EmptyState
                  icon={<FiCalendar className="h-7 w-7" aria-hidden="true" />}
                  title="No routine found"
                  description="No personal routine is available for this session."
                />
              </div>
            )
          ) : (
            <div className="table-shell">
              <EmptyState
                icon={<FiSearch className="h-7 w-7" aria-hidden="true" />}
                title="Load your routine"
                description="Choose a session and load your personal schedule."
              />
            </div>
          )}
        </section>
      </PageShell>
    </div>
  );
};

export default PersonalRoutine;
