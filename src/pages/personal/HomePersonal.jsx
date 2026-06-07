"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiDownload,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiGrid,
  FiRefreshCw,
  FiUser,
} from "react-icons/fi";
import api from "../../api";
import campusImage from "../../assets/iiuc.webp";
import Header from "../components/Header";
import ResourceHighlights from "../components/ResourceHighlights";
import RoutineDetailsModal from "../components/RoutineDetailsModal";
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
import { cachedRequest } from "../../services/cacheService";
import {
  getCurrentRoutineClass,
  getRoutineTimeSlots,
  usePeriods,
} from "../../services/periodService";
import {
  getRoutineClassDetails,
  joinRoutineValues,
  splitRoutineValue,
  summarizeRoutineDetails,
} from "../../services/routineDetails";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DISPLAY_DAYS = ["sat", "sun", "mon", "tue", "wed"];

const ROUTINE_VIEW_OPTIONS = [
  { key: "personal", label: "Personal routine", icon: FiUser },
  { key: "section", label: "Section routine", icon: FiGrid },
];
const DASHBOARD_CACHE_TTL = 60 * 1000;

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
  const { periods } = usePeriods();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoutineCell, setSelectedRoutineCell] = useState(null);

  const timeSlots = getRoutineTimeSlots(periods, shift);
  const sectionTimeSlots = getRoutineTimeSlots(periods, sectionShift);
  const sessionLabel = activeSessionName || "No active session";
  const sectionLabel = profile?.sec || user?.sec || "N/A";
  const normalizedSection = (profile?.sec || user?.sec || "").toUpperCase().trim();
  const currentClass = useMemo(
    () => getCurrentRoutineClass(schedule, shift, periods, currentTime),
    [schedule, shift, periods, currentTime]
  );
  const sectionCurrentClass = useMemo(
    () => getCurrentRoutineClass(sectionSchedule, sectionShift, periods, currentTime),
    [sectionSchedule, sectionShift, periods, currentTime]
  );
  const selectedCurrentClass =
    routineView === "personal" ? currentClass : sectionCurrentClass;
  const highlightedDay = getHighlightedDay(currentTime);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Fetches the current student's profile.
   */
  const fetchProfile = useCallback(async ({ forceRefresh = false } = {}) => {
    setProfileLoading(true);
    try {
      const nextProfile = await cachedRequest(
        `dashboard:profile:${user?.id || "me"}`,
        async () => {
          const response = await api.get("/api/user/profile");
          return response.data?.[0] ?? null;
        },
        { ttl: DASHBOARD_CACHE_TTL, forceRefresh },
      );
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
  }, [user?.id]);

  /**
   * Fetches the current student's personal routine for the active session.
   */
  const fetchPersonalRoutine = useCallback(async ({ forceRefresh = false } = {}) => {
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
      const routineData = await cachedRequest(
        `dashboard:personal-routine:${user?.id || "me"}:${activeSessionName.toUpperCase()}`,
        async () => {
          const response = await api.post(
            `/api/user/fullroutine/${activeSessionName.toUpperCase()}`,
            {},
          );
          return {
            rows: response.data?.rows ?? [],
            gender: response.data?.gender || 1,
          };
        },
        { ttl: DASHBOARD_CACHE_TTL, forceRefresh },
      );
      setSchedule(routineData.rows);
      setShift(routineData.gender);
    } catch {
      setSchedule([]);
      setShift(1);
      setNotice({
        type: "error",
        text: "Your personal routine could not be loaded.",
      });
    }
  }, [activeSessionError, activeSessionLoading, activeSessionName, user?.id]);

  /**
   * Fetches the student's section routine for the active session.
   */
  const fetchSectionRoutine = useCallback(async (sectionCode, { forceRefresh = false } = {}) => {
    if (!activeSessionName || !sectionCode) {
      setSectionSchedule([]);
      setSectionShift(1);
      return;
    }

    try {
      const sectionInput = sectionCode.toUpperCase();
      const sessionInput = activeSessionName.toUpperCase();
      const routineData = await cachedRequest(
        `dashboard:section-routine:${sectionInput}:${sessionInput}`,
        async () => {
          const response = await api.get(
            `/api/section/fullroutine/${encodeURIComponent(
              sectionInput,
            )}/${encodeURIComponent(sessionInput)}`,
          );
          return {
            rows: response.data?.rows ?? [],
            gender: response.data?.gender || 1,
          };
        },
        { ttl: DASHBOARD_CACHE_TTL, forceRefresh },
      );
      setSectionSchedule(routineData.rows);
      setSectionShift(routineData.gender);
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
  const loadDashboard = useCallback(async ({ forceRefresh = false } = {}) => {
    setLoading(true);
    setNotice(null);
    const [nextProfile] = await Promise.all([
      fetchProfile({ forceRefresh }),
      fetchPersonalRoutine({ forceRefresh }),
    ]);
    await fetchSectionRoutine(nextProfile?.sec || user?.sec, { forceRefresh });
    setLoading(false);
  }, [fetchPersonalRoutine, fetchProfile, fetchSectionRoutine, user?.sec]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /**
   * Converts backend routine rows into cells for the shared timetable.
   */
  const generatePersonalDaySchedule = (day) =>
    buildRoutineDaySchedule({
      schedule,
      shift,
      day,
      session: sessionLabel,
      section: normalizedSection,
    });

  const generateSectionDaySchedule = (day) =>
    buildRoutineDaySchedule({
      schedule: sectionSchedule,
      shift: sectionShift,
      day,
      session: sessionLabel,
      section: normalizedSection,
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
      tone: "violet",
    },
    {
      label: "Section",
      value: profile?.sec || "N/A",
      icon: <FiGrid className="h-5 w-5" aria-hidden="true" />,
      tone: "green",
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
      tone: selectedCurrentClass ? "green" : "rose",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="page-wrap space-y-8 py-8 sm:py-10">
        {notice && (
          <Notice type={notice.type} onDismiss={() => setNotice(null)}>
            {notice.text}
          </Notice>
        )}

        <section className="relative isolate overflow-hidden rounded-xl bg-slate-950 px-5 py-7 text-white shadow-2xl shadow-slate-950/20 ring-1 ring-white/10 sm:px-8 lg:px-10">
          <img
            src={campusImage}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 -z-10 bg-slate-950/72" />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-sky-200">Personal dashboard</p>
              <h1 className="display-heading hero-heading-glow mt-3 text-3xl text-white sm:text-5xl">
                Welcome back{profile?.name ? `, ${profile.name}` : ""}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
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
                  onClick={() => loadDashboard({ forceRefresh: true })}
                  className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20 dark:border-white/20 dark:bg-white/10 dark:text-white"
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

        <section className="grid animate-enter gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <MetricCard key={stat.label} {...stat} />
          ))}
        </section>

        <ResourceHighlights
          onAdd={() => navigate("/edit/details?tab=resources")}
          onFind={() => navigate("/resources")}
        />

        <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-4 xl:sticky xl:top-28">
            <ProfilePanel
              profile={profile}
              loading={profileLoading}
              onEdit={() => navigate("/edit/details")}
              onPrivacySettings={() => navigate("/edit/details?tab=settings")}
            />

            <div className="surface-card p-5 transition-all duration-300 ease-out hover:shadow-xl hover:shadow-violet-500/10">
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

          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-kicker">Routine workspace</p>
                <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  Schedule view
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Switch between your saved courses and the full section routine.
                </p>
              </div>
              <RoutineTypeToggle value={routineView} onChange={setRoutineView} />
            </div>

            {loading ? (
              <LoadingState label="Loading your dashboard..." />
            ) : routineView === "personal" ? (
              schedule.length ? (
                <RoutineTable
                  key="personal-routine"
                  title="Personal Schedule"
                  subtitle={`${profile?.name || "Student"} - ${sessionLabel}`}
                  timeSlots={timeSlots}
                  displayDays={DISPLAY_DAYS}
                  getItemsForDay={generatePersonalDaySchedule}
                  onCellClick={setSelectedRoutineCell}
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
                    active: isCurrentRoutineCell(currentClass, day, item, currentTime),
                  })}
                />
              ) : (
                <div className="table-shell animate-enter">
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
                key="section-routine"
                title="Section Routine"
                subtitle={`${sectionLabel} - ${sessionLabel}`}
                timeSlots={sectionTimeSlots}
                displayDays={DISPLAY_DAYS}
                getItemsForDay={generateSectionDaySchedule}
                onCellClick={setSelectedRoutineCell}
                getDayMeta={(day) => ({
                  active: day === highlightedDay.day,
                  label: day === highlightedDay.day ? highlightedDay.label : "",
                })}
                getCellMeta={(day, item) => ({
                  active: isCurrentRoutineCell(sectionCurrentClass, day, item, currentTime),
                })}
              />
            ) : (
              <div className="table-shell animate-enter">
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
      {selectedRoutineCell && (
        <RoutineDetailsModal
          item={selectedRoutineCell}
          title={
            routineView === "personal"
              ? "Personal Routine Details"
              : "Section Routine Details"
          }
          onClose={() => setSelectedRoutineCell(null)}
        />
      )}
    </div>
  );
};

/**
 * Segmented control for the dashboard routine table.
 */
function RoutineTypeToggle({ value, onChange }) {
  return (
    <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm sm:w-auto dark:border-slate-800 dark:bg-slate-950">
      {ROUTINE_VIEW_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.key;

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cx(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:flex-none",
              isActive
                ? "bg-white text-violet-700 shadow-md shadow-violet-500/10 dark:bg-slate-800 dark:text-violet-200 dark:shadow-black/20"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
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
    <div className="rounded-xl border border-white/15 bg-white/10 p-5 shadow-xl shadow-black/10 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-300/20 text-sky-100 ring-1 ring-white/15">
          <FiClock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-slate-300">Now</p>
          <h2 className="safe-text text-lg font-bold text-white">
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
        <p className="mt-5 text-sm leading-6 text-slate-200">
          Your next active slot will be highlighted automatically when class time arrives.
        </p>
      )}
    </div>
  );
}

/**
 * Student profile summary with editable account details.
 */
function ProfilePanel({ profile, loading, onEdit, onPrivacySettings }) {
  const profileImage = getProfileImage(profile);
  const profileInitials = getProfileInitials(profile);
  const profileHidden = profile?.profileHidden === true;

  if (loading) {
    return (
      <div className="surface-card p-5">
        <div className="h-36 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="surface-card p-5 transition-all duration-300 ease-out hover:shadow-xl hover:shadow-violet-500/10">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white ring-2 ring-violet-100 dark:bg-white dark:text-slate-950 dark:ring-violet-500/30">
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
        <ProfileRow
          label="Visibility"
          value={profileHidden ? "Hidden from Community" : "Public"}
          icon={profileHidden ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        />
      </dl>

      <div className="mt-5 grid gap-2">
        <button type="button" onClick={onEdit} className="btn-secondary w-full">
          <FiEdit3 aria-hidden="true" />
          Update details
        </button>
        <button type="button" onClick={onPrivacySettings} className="btn-secondary w-full">
          {profileHidden ? <FiEye aria-hidden="true" /> : <FiEyeOff aria-hidden="true" />}
          Privacy settings
        </button>
      </div>
    </div>
  );
}

/**
 * One live-class row inside the dashboard status panel.
 */
function LiveClassDetails({ label, classInfo, emptyText }) {
  const code = joinRoutineValues(splitRoutineValue(classInfo?.code), classInfo?.code || "");
  const shortName = joinRoutineValues(
    splitRoutineValue(classInfo?.short_name || classInfo?.name || classInfo?.faculty),
    classInfo?.short_name || classInfo?.name || classInfo?.faculty || "",
  );
  const room = joinRoutineValues(splitRoutineValue(classInfo?.room), classInfo?.room || "");

  return (
    <div className="border-t border-white/15 pt-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-bold uppercase text-sky-100">
        {label}
      </p>
      {classInfo ? (
        <div className="mt-2 space-y-1">
          <p className="font-bold text-white">
            {code}
          </p>
          <p className="text-slate-200">
            {shortName}
          </p>
          <p className="text-slate-300">
            Room {room || "N/A"}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-slate-300">{emptyText}</p>
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
function ProfileRow({ label, value, icon = null }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 transition-colors hover:bg-violet-50/70 dark:bg-slate-900 dark:hover:bg-violet-500/10">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="safe-text flex items-center justify-end gap-2 text-right font-semibold text-slate-900 dark:text-slate-100">
        {icon}
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
      className="group flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-200 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 transition-colors group-hover:bg-white dark:bg-violet-500/10 dark:text-violet-200 dark:group-hover:bg-violet-400/10">
          {icon}
        </span>
        <span className="safe-text">{label}</span>
      </span>
      <FiArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-200" aria-hidden="true" />
    </button>
  );
}

/**
 * Converts backend routine rows into merged cells for the shared timetable.
 */
function buildRoutineDaySchedule({ schedule, shift, day, section, session }) {
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
        section,
        session,
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
}

/**
 * Marks the routine cell that matches the current class slot.
 */
function isCurrentRoutineCell(currentClass, day, item, now = new Date()) {
  return (
    Boolean(currentClass) &&
    day === DAYS[now.getDay()] &&
    item.subject !== "-" &&
    !item.isBreak &&
    currentClass.slot >= item.slotStart &&
    currentClass.slot < item.slotStart + item.colspan
  );
}

/**
 * Finds the current class by matching local time against class slots.
 */
/**
 * Chooses the day highlighted in the routine table.
 */
function getHighlightedDay(now = new Date()) {
  const today = DAYS[now.getDay()];

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
