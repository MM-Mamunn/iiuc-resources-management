"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCalendar,
  FiDownload,
  FiHome,
  FiMapPin,
  FiSearch,
  FiUser,
  FiX,
} from "react-icons/fi";
import api from "../../api";
import { useActiveSession } from "../../App";
import { getRoutineTimeSlots, usePeriods } from "../../services/periodService";
import Header from "../components/Header";
import ResourceBrowser from "../components/ResourceBrowser";
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

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Classroom routine lookup with room/session autocomplete and detail dialogs.
 */
const ClassroomRoutine = () => {
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const [formData, setFormData] = useState({
    room: "",
    day: "today",
    session: "",
  });
  const [roomSuggestions, setRoomSuggestions] = useState([]);
  const [sessionSuggestions, setSessionSuggestions] = useState([]);
  const [roomLoading, setRoomLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routineData, setRoutineData] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [facultyModal, setFacultyModal] = useState({ open: false, data: null, loading: false });
  const [courseModal, setCourseModal] = useState({ open: false, data: null, loading: false });
  const [notice, setNotice] = useState(null);
  const { periods } = usePeriods();

  const schedule = useMemo(() => buildSchedule(routineData), [routineData]);
  const timeSlots = getRoutineTimeSlots(periods, "male");
  const displayDay = getDisplayDay(formData.day);
  const sessionHelper = activeSessionLoading
    ? "Loading active session..."
    : activeSessionError || (activeSessionName ? `Active: ${activeSessionName}` : "Enter a session");

  useEffect(() => {
    if (activeSessionName) {
      setFormData((current) => ({
        ...current,
        session: current.session || activeSessionName,
      }));
    }
  }, [activeSessionName]);

  const updateForm = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
    setShowResults(false);
  };

  const handleRoomChange = async (event) => {
    const value = event.target.value;
    updateForm("room", value);

    if (value.length < 1 || value.length > 10) {
      setRoomSuggestions([]);
      return;
    }

    setRoomLoading(true);
    try {
      const response = await api.get(`/api/lookLike/roomLookLike/${encodeURIComponent(value)}`);
      const rooms = response.data?.rows?.map((row) => row.room) ?? [];
      setRoomSuggestions(rooms);
    } catch {
      setRoomSuggestions([]);
    } finally {
      setRoomLoading(false);
    }
  };

  const handleSessionChange = async (event) => {
    const value = event.target.value;
    updateForm("session", value);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setShowResults(false);
    setNotice(null);

    try {
      const dayNumber = getDayNumber(formData.day);
      const response = await api.get(
        `/api/classroom/routine/${encodeURIComponent(
          formData.room.trim(),
        )}/${encodeURIComponent(formData.session.trim())}/${dayNumber}`,
      );
      setRoutineData(response.data?.rows ?? []);
      setShowResults(true);
    } catch {
      setRoutineData([]);
      setShowResults(true);
      setNotice({ type: "error", text: "Could not load the classroom routine." });
    } finally {
      setLoading(false);
      setRoomSuggestions([]);
      setSessionSuggestions([]);
    }
  };

  const handleFacultyClick = async (facultyCode) => {
    setFacultyModal({ open: true, data: null, loading: true });

    try {
      const response = await api.get(`/api/teacher/search/${encodeURIComponent(facultyCode)}`);
      setFacultyModal({ open: true, data: response.data?.rows?.[0] ?? null, loading: false });
    } catch {
      setFacultyModal({ open: true, data: null, loading: false });
    }
  };

  const handleCourseClick = async (courseCode) => {
    setCourseModal({ open: true, data: null, loading: true });

    try {
      const response = await api.get(
        `/api/info/course/search/${encodeURIComponent(courseCode)}`,
      );
      setCourseModal({ open: true, data: response.data?.rows?.[0] ?? null, loading: false });
    } catch {
      setCourseModal({ open: true, data: null, loading: false });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Room routine"
            title="Classroom Schedule"
            description="Check room usage by day and session, then inspect course and faculty details from each class block."
          />

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
            autoComplete="off"
          >
            <FormField
              id="room"
              label="Room"
              helper={roomLoading ? "Loading room suggestions..." : "Example: C505"}
            >
              <div className="relative">
                <FiHome
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="room"
                  name="room"
                  value={formData.room}
                  onChange={handleRoomChange}
                  type="text"
                  placeholder="C505"
                  className="form-field pl-12"
                  required
                />
                <SuggestionList
                  suggestions={roomSuggestions}
                  onSelect={(room) => {
                    updateForm("room", room);
                    setRoomSuggestions([]);
                  }}
                />
              </div>
            </FormField>

            <FormField id="day" label="Day" helper="Use today for a quick room check.">
              <select
                id="day"
                name="day"
                value={formData.day}
                onChange={(event) => updateForm("day", event.target.value)}
                className="form-field"
                required
              >
                <option value="today">Today</option>
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
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
                  value={formData.session}
                  onChange={handleSessionChange}
                  type="text"
                  placeholder={activeSessionName || "Active session"}
                  className="form-field pl-12"
                  required
                />
                <SuggestionList
                  suggestions={sessionSuggestions}
                  onSelect={(session) => {
                    updateForm("session", session);
                    setSessionSuggestions([]);
                  }}
                />
              </div>
            </FormField>

            <button
              type="submit"
              disabled={!formData.room.trim() || !formData.session.trim() || loading}
              className="btn-primary"
            >
              <FiSearch aria-hidden="true" />
              {loading ? "Loading..." : "Search"}
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
            icon={<FiMapPin className="h-5 w-5" aria-hidden="true" />}
            label="Room"
            value={formData.room || "Not selected"}
            tone="blue"
          />
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Day"
            value={displayDay}
            tone="teal"
          />
          <MetricCard
            icon={<FiBookOpen className="h-5 w-5" aria-hidden="true" />}
            label="Classes"
            value={routineData.length}
            tone={routineData.length ? "teal" : "amber"}
          />
        </section>

        <section className="mt-8">
          {loading ? (
            <LoadingState label="Loading classroom routine..." />
          ) : showResults ? (
            <ClassroomTable
              room={formData.room}
              session={formData.session}
              displayDay={displayDay}
              schedule={schedule}
              timeSlots={timeSlots}
              onFacultyClick={handleFacultyClick}
              onCourseClick={handleCourseClick}
            />
          ) : (
            <div className="table-shell">
              <EmptyState
                icon={<FiSearch className="h-7 w-7" aria-hidden="true" />}
                title="Search a classroom"
                description="Enter a room, day, and session to see the scheduled classes."
              />
            </div>
          )}
        </section>

        {showResults && routineData.length > 0 && (
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => window.print()} className="btn-secondary">
              <FiDownload aria-hidden="true" />
              Print
            </button>
          </div>
        )}
      </PageShell>

      {facultyModal.open && (
        <DetailModal
          title="Faculty Details"
          loading={facultyModal.loading}
          onClose={() => setFacultyModal({ open: false, data: null, loading: false })}
        >
          {facultyModal.data ? (
            <div className="grid gap-3">
              <InfoRow label="Code" value={facultyModal.data.code} />
              <InfoRow label="Name" value={facultyModal.data.name} />
              <InfoRow label="Designation" value={facultyModal.data.desig} />
              <InfoRow label="Phone" value={facultyModal.data.phone} />
              <InfoRow label="Email" value={facultyModal.data.email} />
              <InfoRow label="Type" value={facultyModal.data.type} />
            </div>
          ) : (
            <EmptyState
              icon={<FiUser className="h-7 w-7" aria-hidden="true" />}
              title="Faculty not found"
              description="No details are available for this faculty code."
            />
          )}
        </DetailModal>
      )}

      {courseModal.open && (
        <DetailModal
          title="Course Details"
          loading={courseModal.loading}
          onClose={() => setCourseModal({ open: false, data: null, loading: false })}
        >
          {courseModal.data ? (
            <div className="grid gap-3">
              <InfoRow label="Code" value={courseModal.data.code} />
              <InfoRow label="Title" value={courseModal.data.title} />
              <InfoRow label="Short name" value={courseModal.data.short_name} />
              <InfoRow label="Credit" value={courseModal.data.credit} />
              <InfoRow label="Type" value={courseModal.data.type} />
              <InfoRow label="Semester" value={courseModal.data.sem} />
              <InfoRow label="Prerequisite" value={courseModal.data.prereq || "None"} />
              <ResourceBrowser
                title="Course resources"
                description={`Shared links submitted for ${courseModal.data.code}.`}
                courseCode={courseModal.data.code}
                framed={false}
                limit={3}
              />
            </div>
          ) : (
            <EmptyState
              icon={<FiBookOpen className="h-7 w-7" aria-hidden="true" />}
              title="Course not found"
              description="No course details are available for this code."
            />
          )}
        </DetailModal>
      )}
    </div>
  );
};

function ClassroomTable({
  room,
  session,
  displayDay,
  schedule,
  timeSlots,
  onCourseClick,
  onFacultyClick,
}) {
  const hasClasses = schedule.some((slot) => slot.classes.length > 0);

  return (
    <section className="table-shell animate-enter">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="section-kicker">Classroom routine</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
            {room} - {displayDay}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {session} session
          </p>
        </div>
      </div>

      {!hasClasses ? (
        <EmptyState
          icon={<FiHome className="h-7 w-7" aria-hidden="true" />}
          title="No classes scheduled"
          description={`No classes were found in ${room || "this room"} on ${displayDay}.`}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <caption className="sr-only">
              Classroom schedule for {room} on {displayDay}
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
                <th scope="col" className="w-36 px-4 py-4 font-bold">
                  Day
                </th>
                {timeSlots.map((slot) => (
                  <th key={slot} scope="col" className="px-4 py-4 text-center font-bold">
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 transition last:border-b-0 dark:border-slate-800">
                <th
                  scope="row"
                  className="px-4 py-4 text-left align-top text-base font-bold text-slate-950 dark:text-white"
                >
                  {displayDay}
                </th>
                {schedule.map((slot) => (
                  <td
                    key={`${displayDay}-${slot.slot}-${slot.isBreak}`}
                    className={cx(
                      "min-w-36 border-l border-slate-100 px-4 py-4 text-center align-top dark:border-slate-800",
                      slot.isBreak &&
                        "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
                    )}
                  >
                    {slot.isBreak ? (
                      <div className="flex min-h-24 items-center justify-center font-bold">
                        Break
                      </div>
                    ) : slot.classes.length ? (
                      <div className="grid gap-3">
                        {slot.classes.map((classItem, index) => (
                          <article
                            key={`${classItem.subject}-${classItem.faculty}-${index}`}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left dark:border-slate-800 dark:bg-slate-900"
                          >
                            <button
                              type="button"
                              onClick={() => onCourseClick(classItem.subject)}
                              className="safe-text text-sm font-bold text-blue-700 transition hover:text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:text-blue-100"
                            >
                              {classItem.subject}
                            </button>
                            <button
                              type="button"
                              onClick={() => onFacultyClick(classItem.faculty)}
                              className="safe-text mt-2 block text-xs font-semibold text-teal-700 transition hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300 dark:hover:text-teal-100"
                            >
                              {classItem.faculty}
                            </button>
                            <p className="safe-text mt-2 text-xs text-slate-500 dark:text-slate-400">
                              Section {classItem.section}
                            </p>
                          </article>
                        ))}
                        {slot.classes.length > 1 && (
                          <span className="status-pill border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                            {slot.classes.length} classes
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex min-h-24 items-center justify-center text-xl text-slate-300 dark:text-slate-700">
                        -
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DetailModal({ title, loading, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="surface-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Details</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary h-10 w-10 p-0"
            aria-label={`Close ${title}`}
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        {loading ? <LoadingState label="Loading details..." /> : children}
      </section>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="safe-text mt-1 font-bold text-slate-950 dark:text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function buildSchedule(routineData) {
  const schedule = [];

  for (let slot = 1; slot <= 6; slot += 1) {
    if (slot === 4) {
      schedule.push({ slot: "break", isBreak: true, classes: [] });
    }

    const classItems = routineData.filter((item) => Number(item.slot) === slot);
    schedule.push({
      slot,
      isBreak: false,
      classes: classItems.map((item) => ({
        subject: item.code || item.subject || "-",
        faculty: item.faculty || item.name || "-",
        section: item.sec || "-",
      })),
    });
  }

  return schedule;
}

function getDayNumber(selectedDay) {
  if (selectedDay === "today") return new Date().getDay();
  return DAYS.indexOf(selectedDay);
}

function getDisplayDay(selectedDay) {
  if (selectedDay === "today") return DAYS[new Date().getDay()];
  return selectedDay;
}

export default ClassroomRoutine;
