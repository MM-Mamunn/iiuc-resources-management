"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiDownload,
  FiEdit3,
  FiGrid,
  FiRefreshCw,
  FiUser,
} from "react-icons/fi";
import api from "../../api";
import Header from "../components/Header";
import RoutineTable from "../components/RoutineTable";
import {
  EmptyState,
  LoadingState,
  MetricCard,
  Notice,
  SectionHeading,
  cx,
} from "../components/ui";
import { useActiveSession, useAuth } from "../../App";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DISPLAY_DAYS = ["sat", "sun", "mon", "tue", "wed"];

const SLOT_LABELS = {
  1: [
    "10.40-11.30",
    "11.31-12.20",
    "12.21-1.10",
    "Break",
    "1.50-2.40",
    "2.41-3.30",
    "3.31-4.20",
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

const ROUTINE_VIEW_OPTIONS = [
  { key: "personal", label: "Personal routine", icon: FiUser },
  { key: "section", label: "Section routine", icon: FiGrid },
];

/**
 * Authenticated student dashboard with profile summary and personal routine.
 */
const HomePersonal = () => {
  const { user } = useAuth();
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState([]);
  const [sectionSchedule, setSectionSchedule] = useState([]);
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [shift, setShift] = useState(1);
  const [sectionShift, setSectionShift] = useState(1);
  const [routineView, setRoutineView] = useState("personal");
  const [notice, setNotice] = useState(null);

  const timeSlots = SLOT_LABELS[shift] ?? SLOT_LABELS[1];
  const sectionTimeSlots = SLOT_LABELS[sectionShift] ?? SLOT_LABELS[1];
  const sessionLabel = activeSessionName || "No active session";
  const sectionLabel = profile?.sec || user?.sec || "N/A";
  const normalizedSection = (profile?.sec || user?.sec || "").toUpperCase().trim();
  const currentClass = useMemo(
    () => getCurrentClass(schedule, shift),
    [schedule, shift]
  );
  const sectionCurrentClass = useMemo(
    () => getCurrentClass(sectionSchedule, sectionShift),
    [sectionSchedule, sectionShift]
  );
  const selectedCurrentClass =
    routineView === "personal" ? currentClass : sectionCurrentClass;
  const highlightedDay = getHighlightedDay();

  /**
   * Fetches the current student's profile.
   */
  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await api.get("/api/user/profile");
      const nextProfile = response.data?.[0] ?? null;
      setProfile(nextProfile);
      return nextProfile;
    } catch {
      setProfile(null);
      setNotice({
        type: "error",
        text: "Profile information could not be loaded.",
      });
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  /**
   * Fetches the current student's personal routine for the active session.
   */
  const fetchPersonalRoutine = useCallback(async () => {
    if (!activeSessionName) {
      setSchedule([]);
      setShift(1);
      if (!activeSessionLoading) {
        setNotice({
          type: "error",
          text: activeSessionError || "No active session is available.",
        });
      }
      return;
    }

    try {
      const response = await api.post(
        `/api/user/fullroutine/${activeSessionName.toUpperCase()}`,
        {},
      );
      setSchedule(response.data?.rows ?? []);
      setShift(response.data?.gender || 1);
    } catch {
      setSchedule([]);
      setShift(1);
      setNotice({
        type: "error",
        text: "Your personal routine could not be loaded.",
      });
    }
  }, [activeSessionError, activeSessionLoading, activeSessionName]);

  /**
   * Fetches the student's section routine for the active session.
   */
  const fetchSectionRoutine = useCallback(async (sectionCode) => {
    if (!activeSessionName || !sectionCode) {
      setSectionSchedule([]);
      setSectionShift(1);
      return;
    }

    try {
      const response = await api.get(
        `/api/section/fullroutine/${encodeURIComponent(
          sectionCode.toUpperCase(),
        )}/${encodeURIComponent(activeSessionName.toUpperCase())}`,
      );
      setSectionSchedule(response.data?.rows ?? []);
      setSectionShift(response.data?.gender || 1);
    } catch {
      setSectionSchedule([]);
      setSectionShift(1);
      setNotice({
        type: "error",
        text: "Your section routine could not be loaded.",
      });
    }
  }, [activeSessionName]);

  /**
   * Loads profile, personal routine, and section routine.
   */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    const [nextProfile] = await Promise.all([fetchProfile(), fetchPersonalRoutine()]);
    await fetchSectionRoutine(nextProfile?.sec || user?.sec);
    setLoading(false);
  }, [fetchPersonalRoutine, fetchProfile, fetchSectionRoutine, user?.sec]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /**
   * Converts backend routine rows into cells for the shared timetable.
   */
  const generatePersonalDaySchedule = (day) =>
    buildRoutineDaySchedule({ schedule, shift, day });

  const generateSectionDaySchedule = (day) =>
    buildRoutineDaySchedule({
      schedule: sectionSchedule,
      shift: sectionShift,
      day,
    });

  /**
   * Opens a printable personal routine document.
   */
  const downloadPDF = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setNotice({
        type: "error",
        text: "Your browser blocked the print window. Allow popups and try again.",
      });
      return;
    }

    printWindow.document.write(
      buildPersonalPrintHtml({
        profile,
        session: sessionLabel,
        timeSlots,
        displayDays: DISPLAY_DAYS,
        getItemsForDay: generatePersonalDaySchedule,
      })
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const stats = [
    {
      label: "Student ID",
      value: profile?.id || "Loading",
      icon: <FiUser className="h-5 w-5" aria-hidden="true" />,
      tone: "blue",
    },
    {
      label: "Section",
      value: profile?.sec || "N/A",
      icon: <FiGrid className="h-5 w-5" aria-hidden="true" />,
      tone: "teal",
    },
    {
      label: "Session",
      value: sessionLabel,
      icon: <FiCalendar className="h-5 w-5" aria-hidden="true" />,
      tone: "amber",
    },
    {
      label: "Current class",
      value: selectedCurrentClass?.code || "No live class",
      icon: <FiClock className="h-5 w-5" aria-hidden="true" />,
      tone: selectedCurrentClass ? "teal" : "rose",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="page-wrap space-y-8 py-10">
        {notice && (
          <Notice type={notice.type} onDismiss={() => setNotice(null)}>
            {notice.text}
          </Notice>
        )}

        <section className="surface-card overflow-hidden">
          <div className="grid gap-8 p-6 lg:grid-cols-[1fr_320px] lg:p-8">
            <div>
              <p className="section-kicker">Personal dashboard</p>
              <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-5xl dark:text-white">
                Welcome back{profile?.name ? `, ${profile.name}` : ""}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Your routine, courses, and key academic actions are gathered into one calm workspace.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/edit/details")}
                  className="btn-primary"
                >
                  <FiEdit3 aria-hidden="true" />
                  Edit profile
                </button>
                <button
                  type="button"
                  onClick={loadDashboard}
                  className="btn-secondary"
                  disabled={loading}
                >
                  <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
                  Refresh
                </button>
              </div>
            </div>

            <CurrentClassPanel
              currentClass={currentClass}
              sectionCurrentClass={sectionCurrentClass}
              sectionLabel={sectionLabel}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <MetricCard key={stat.label} {...stat} />
          ))}
        </section>

        <section className="grid gap-8 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <ProfilePanel
              profile={profile}
              loading={profileLoading}
              onEdit={() => navigate("/edit/details")}
            />

            <div className="surface-card p-5">
              <SectionHeading kicker="Shortcuts" title="Common actions" />
              <div className="mt-5 grid gap-2">
                <DashboardAction
                  icon={<FiBookOpen className="h-4 w-4" aria-hidden="true" />}
                  label="Add or drop courses"
                  onClick={() => navigate("/courseadddrop")}
                />
                <DashboardAction
                  icon={<FiGrid className="h-4 w-4" aria-hidden="true" />}
                  label="My courses"
                  onClick={() => navigate("/showall")}
                />
                <DashboardAction
                  icon={<FiCalendar className="h-4 w-4" aria-hidden="true" />}
                  label="Section routine"
                  onClick={() => navigate("/routine/section")}
                />
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            <div className="flex justify-end">
              <RoutineTypeToggle value={routineView} onChange={setRoutineView} />
            </div>

            {loading ? (
              <LoadingState label="Loading your dashboard..." />
            ) : routineView === "personal" ? (
              schedule.length ? (
                <RoutineTable
                  title="Personal Schedule"
                  subtitle={`${profile?.name || "Student"} - ${sessionLabel}`}
                  timeSlots={timeSlots}
                  displayDays={DISPLAY_DAYS}
                  getItemsForDay={generatePersonalDaySchedule}
                  actions={
                    <button type="button" onClick={downloadPDF} className="btn-secondary">
                      <FiDownload aria-hidden="true" />
                      Print routine
                    </button>
                  }
                  getDayMeta={(day) => ({
                    active: day === highlightedDay.day,
                    label: day === highlightedDay.day ? highlightedDay.label : "",
                  })}
                  getCellMeta={(day, item) => ({
                    active: isCurrentRoutineCell(currentClass, day, item),
                  })}
                />
              ) : (
                <div className="table-shell">
                  <EmptyState
                    icon={<FiCalendar className="h-7 w-7" aria-hidden="true" />}
                    title="No personal routine found"
                    description="Add courses from section routines or refresh once your data is available."
                    action={
                      <button type="button" onClick={() => navigate("/courseadddrop")} className="btn-primary">
                        Add courses
                      </button>
                    }
                  />
                </div>
              )
            ) : sectionSchedule.length ? (
              <RoutineTable
                title="Section Routine"
                subtitle={`${sectionLabel} - ${sessionLabel}`}
                timeSlots={sectionTimeSlots}
                displayDays={DISPLAY_DAYS}
                getItemsForDay={generateSectionDaySchedule}
                getDayMeta={(day) => ({
                  active: day === highlightedDay.day,
                  label: day === highlightedDay.day ? highlightedDay.label : "",
                })}
                getCellMeta={(day, item) => ({
                  active: isCurrentRoutineCell(sectionCurrentClass, day, item),
                })}
              />
            ) : (
              <div className="table-shell">
                <EmptyState
                  icon={<FiCalendar className="h-7 w-7" aria-hidden="true" />}
                  title="No section routine found"
                  description={
                    normalizedSection && activeSessionName
                      ? "No section routine is available for this section and session."
                      : "Section and active session details are needed to load the section routine."
                  }
                />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

/**
 * Segmented control for the dashboard routine table.
 */
function RoutineTypeToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
      {ROUTINE_VIEW_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.key;

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cx(
              "inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isActive
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-200"
                : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Shows the live class when the current time falls inside a scheduled slot.
 */
function CurrentClassPanel({ currentClass, sectionCurrentClass, sectionLabel }) {
  const hasLiveClass = Boolean(currentClass || sectionCurrentClass);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200">
          <FiClock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Now</p>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            {hasLiveClass ? "Class in progress" : "No live class"}
          </h2>
        </div>
      </div>
      {hasLiveClass ? (
        <div className="mt-5 space-y-3 text-sm">
          <LiveClassDetails
            label="Personal Routine"
            classInfo={currentClass}
            emptyText="No personal live class"
          />
          <LiveClassDetails
            label={`${sectionLabel !== "N/A" ? sectionLabel : "Section"} Routine`}
            classInfo={sectionCurrentClass}
            emptyText="No section live class"
          />
        </div>
      ) : (
        <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Your next active slot will be highlighted automatically when class time arrives.
        </p>
      )}
    </div>
  );
}

/**
 * Student profile summary with editable account details.
 */
function ProfilePanel({ profile, loading, onEdit }) {
  const profileImage = getProfileImage(profile);
  const profileInitials = getProfileInitials(profile);

  if (loading) {
    return (
      <div className="surface-card p-5">
        <div className="h-36 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white ring-1 ring-slate-200 dark:bg-white dark:text-slate-950 dark:ring-slate-700">
          {profileImage ? (
            <img src={profileImage} alt="" className="h-full w-full object-cover" />
          ) : (
            profileInitials
          )}
        </span>
        <div className="min-w-0">
          <h2 className="safe-text text-xl font-bold text-slate-950 dark:text-white">
            {profile?.name || "Student"}
          </h2>
          <p className="safe-text text-sm text-slate-500 dark:text-slate-400">
            {profile?.email || profile?.id || "Profile"}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm">
        <ProfileRow label="Student ID" value={profile?.id || "N/A"} />
        <ProfileRow label="Section" value={profile?.sec || "N/A"} />
        <ProfileRow label="Phone" value={profile?.phone || "N/A"} />
      </dl>

      <button type="button" onClick={onEdit} className="btn-secondary mt-5 w-full">
        <FiEdit3 aria-hidden="true" />
        Update details
      </button>
    </div>
  );
}

/**
 * One live-class row inside the dashboard status panel.
 */
function LiveClassDetails({ label, classInfo, emptyText }) {
  return (
    <div className="border-t border-slate-200 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800">
      <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {classInfo ? (
        <div className="mt-2 space-y-1">
          <p className="font-bold text-blue-700 dark:text-blue-300">
            {classInfo.code}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            {classInfo.short_name || classInfo.name || classInfo.faculty}
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            Room {classInfo.room || "N/A"}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-slate-500 dark:text-slate-400">{emptyText}</p>
      )}
    </div>
  );
}

/**
 * Resolves profile image fields used by current and legacy API responses.
 */
function getProfileImage(profile) {
  return profile?.profilePic || profile?.profilePicUrl || profile?.profile_pic || "";
}

/**
 * Builds a stable two-character fallback for profile cards.
 */
function getProfileInitials(profile) {
  return (profile?.name || profile?.id || "U")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * One label/value row in the profile panel.
 */
function ProfileRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="safe-text text-right font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );
}

/**
 * Button row for dashboard shortcuts.
 */
function DashboardAction({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <span className="text-blue-700 dark:text-blue-300">{icon}</span>
      {label}
    </button>
  );
}

/**
 * Converts backend routine rows into merged cells for the shared timetable.
 */
function buildRoutineDaySchedule({ schedule, shift, day }) {
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
}

/**
 * Marks the routine cell that matches the current class slot.
 */
function isCurrentRoutineCell(currentClass, day, item) {
  return (
    Boolean(currentClass) &&
    day === DAYS[new Date().getDay()] &&
    item.subject !== "-" &&
    !item.isBreak &&
    currentClass.slot >= item.slotStart &&
    currentClass.slot < item.slotStart + item.colspan
  );
}

/**
 * Finds the current class by matching local time against class slots.
 */
function getCurrentClass(schedule, shift) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const dayName = DAYS[currentDay];

  if (!DISPLAY_DAYS.includes(dayName)) return null;

  const timeSlots =
    shift === 1
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

  const currentSlot = timeSlots.find(
    (slot) => currentTime >= slot.start && currentTime <= slot.end
  );
  if (!currentSlot) return null;

  return (
    schedule
      .filter((item) => item.day === currentDay)
      .find(
        (item) =>
          currentSlot.slot >= Number(item.slot) &&
          currentSlot.slot < Number(item.slot) + Number(item.count || 1)
      ) || null
  );
}

/**
 * Chooses the day highlighted in the routine table.
 */
function getHighlightedDay() {
  const today = DAYS[new Date().getDay()];

  if (DISPLAY_DAYS.includes(today)) {
    return { day: today, label: "Today" };
  }

  return { day: "sat", label: "Next class day" };
}

/**
 * Builds a print-friendly personal schedule document.
 */
function buildPersonalPrintHtml({ profile, session, timeSlots, displayDays, getItemsForDay }) {
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
    <title>Personal Schedule - ${profile?.name || "Student"}</title>
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
      <h1>Personal Schedule - ${profile?.name || "Student"}</h1>
      <p>${session}</p>
    </header>
    <table>
      <thead><tr><th>Day</th>${timeSlots.map((slot) => `<th>${slot}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;
}

export default HomePersonal;
