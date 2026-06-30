"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiArrowRight,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiDownload,
  FiGrid,
  FiInfo,
  FiLogIn,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrendingUp,
  FiTrash2,
  FiUser,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import Header from "./components/Header";
import ResourceHighlights from "./components/ResourceHighlights";
import RoutineActionToggle from "./components/RoutineActionToggle";
import RoutineTable from "./components/RoutineTable";
import { SponsorSection } from "./components/SponsorDisplay";
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
import { fetchFeaturedAnnouncement } from "../services/announcementService";
import { fetchFeaturedSponsor } from "../services/sponsorService";
import { getRoutineTimeSlots, usePeriods } from "../services/periodService";
import {
  getRoutineClassDetails,
  summarizeRoutineDetails,
} from "../services/routineDetails";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DISPLAY_DAYS = ["sat", "sun", "mon", "tue", "wed"];
const HOME_CACHE_TTL = 2 * 60 * 1000;
const SEMESTER_LABELS = Array.from({ length: 8 }, (_, index) => index + 1);
const emptyHomeAnalytics = {
  period: { from: "", to: "" },
  resources: {
    total: 0,
    semesterDistribution: SEMESTER_LABELS.map((semester) => ({ semester, total: 0 })),
    growth: [],
  },
  users: {
    total: 0,
    growth: [],
  },
};

/**
 * Public landing and section routine lookup page.
 */
const Home = () => {
  const { user, isLoggedIn } = useAuth();
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
  const [expandedFeatureGroups, setExpandedFeatureGroups] = useState([]);
  const [homeAnalytics, setHomeAnalytics] = useState(emptyHomeAnalytics);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [announcement, setAnnouncement] = useState(null);
  const [featuredSponsor, setFeaturedSponsor] = useState(null);
  const { periods } = usePeriods();

  const userType = String(user?.type || "").toLowerCase();
  const isAdmin = isLoggedIn && userType === "admin";
  const isCrOrAdmin = isLoggedIn && ["cr", "admin"].includes(userType);
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
    let ignoreResult = false;

    async function loadAnnouncement() {
      try {
        const featuredAnnouncement = await fetchFeaturedAnnouncement();

        if (!ignoreResult) {
          setAnnouncement(featuredAnnouncement);
        }
      } catch {
        if (!ignoreResult) {
          setAnnouncement(null);
        }
      }
    }

    loadAnnouncement();

    return () => {
      ignoreResult = true;
    };
  }, []);

  useEffect(() => {
    let ignoreResult = false;

    async function loadSponsor() {
      try {
        const data = await fetchFeaturedSponsor();

        if (!ignoreResult) {
          setFeaturedSponsor(data.sponsorFeatureEnabled ? data.sponsor : null);
        }
      } catch {
        if (!ignoreResult) {
          setFeaturedSponsor(null);
        }
      }
    }

    loadSponsor();

    return () => {
      ignoreResult = true;
    };
  }, []);

  useEffect(() => {
    let ignoreResult = false;

    async function fetchHomeAnalytics() {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      try {
        const analytics = await cachedRequest(
          "home:platform-analytics",
          async () => {
            const response = await api.get("/api/info/home/analytics");
            return response.data || emptyHomeAnalytics;
          },
          { ttl: HOME_CACHE_TTL },
        );

        if (!ignoreResult) {
          setHomeAnalytics(normalizeHomeAnalytics(analytics));
        }
      } catch {
        if (!ignoreResult) {
          setHomeAnalytics(emptyHomeAnalytics);
          setAnalyticsError("Could not load platform analytics right now.");
        }
      } finally {
        if (!ignoreResult) {
          setAnalyticsLoading(false);
        }
      }
    }

    fetchHomeAnalytics();

    return () => {
      ignoreResult = true;
    };
  }, []);

  useEffect(() => {
    async function fetchTopContributors() {
      setContributorsLoading(true);
      try {
        const response = await api.get("/api/info/topcontributor");
        setTopContributors(response.data?.rows ?? []);
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
        tone: "violet",
      },
      {
        label: "Visible days",
        value: DISPLAY_DAYS.length,
        icon: <FiGrid className="h-5 w-5" aria-hidden="true" />,
        tone: "green",
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
  const featureGroups = [
    {
      id: "routine",
      title: "Routine",
      description: "Section, personal, teacher, and room schedules.",
      icon: FiCalendar,
      tone: "violet",
      items: [
        { label: "Find Routine", href: "/#routine-search", icon: FiSearch },
        { label: "Section Routine", href: "/routine/section", icon: FiGrid },
        { label: "Personal Routine", href: isLoggedIn ? "/routine/personalroutine" : "/auth/login", icon: FiUser },
        { label: "Teacher Routine", href: "/routine/teacher", icon: FiUsers },
        { label: "Room Routine", href: "/classroom/routine", icon: FiMapPin },
      ],
    },
    {
      id: "resources",
      title: "Resources",
      description: "Course files, study materials, and contribution actions.",
      icon: FiBookOpen,
      tone: "green",
      items: [
        { label: "Resources", href: "/resources", icon: FiBookOpen },
        { label: "Study Materials", href: "/info/materials", icon: FiGrid },
        { label: "Add Resource", href: isLoggedIn ? "/edit/details?tab=resources" : "/auth/login", icon: FiPlus },
      ],
    },
    {
      id: "community",
      title: "Community",
      description: "Student discovery and contributor activity.",
      icon: FiUsers,
      tone: "sky",
      items: [
        { label: "Community", href: "/info/community", icon: FiUsers },
        { label: "Top Contributors", href: "/#contributors", icon: FiAward },
      ],
    },
    {
      id: "information",
      title: "Information",
      description: "Teacher, course, section, and room references.",
      icon: FiInfo,
      tone: "cyan",
      items: [
        { label: "Teacher Info", href: "/info/teacher", icon: FiUsers },
        { label: "Course Info", href: "/info/course", icon: FiBookOpen },
        { label: "Section Info", href: "/info/section", icon: FiGrid },
        { label: "Room Routine", href: "/classroom/routine", icon: FiMapPin },
      ],
    },
    {
      id: "account",
      title: isLoggedIn ? "Profile & Settings" : "Account",
      description: isLoggedIn
        ? "Dashboard, course selection, and profile settings."
        : "Login or create an account for personal tools.",
      icon: isLoggedIn ? FiUser : FiLogIn,
      tone: isLoggedIn ? "green" : "sky",
      items: isLoggedIn
        ? [
            { label: "Dashboard", href: "/homepersonal", icon: FiGrid },
            { label: "Profile Settings", href: "/edit/details", icon: FiUser },
            { label: "My Courses", href: "/showall", icon: FiBookOpen },
            { label: "Add or Drop", href: "/courseadddrop", icon: FiPlus },
          ]
        : [
            { label: "Login", href: "/auth/login", icon: FiLogIn },
            { label: "Register", href: "/auth/reg", icon: FiUserPlus },
          ],
    },
    {
      id: "management",
      title: "Management",
      description: "CR and admin workspaces when available.",
      icon: FiShield,
      tone: "amber",
      items: [
        isCrOrAdmin && { label: "CR Workspace", href: "/CR", icon: FiUsers },
        isAdmin && { label: "Admin Users", href: "/admin/users", icon: FiShield },
      ].filter(Boolean),
    },
  ].filter((group) => group.items.length > 0);

  const toggleFeatureGroup = (groupId) => {
    setExpandedFeatureGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
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

        <div className="page-wrap grid gap-8 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] lg:items-center lg:py-[4.5rem]">
          <div className="mx-auto flex max-w-3xl animate-enter flex-col items-center text-center">
            <p className="section-kicker border-white/20 bg-white/10 text-sky-100 shadow-none ring-1 ring-white/15">
              IIUC CSE Resources
            </p>
            <h1 className="display-heading hero-heading-glow mt-6 text-4xl text-white sm:text-5xl lg:text-6xl">
              Find routines, rooms, and study resources faster.
            </h1>
            <div className="heading-accent-line mx-auto" aria-hidden="true" />
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Search section routines instantly, then save courses into your personal dashboard after signing in.
            </p>

            <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
              {summaryStats.map((stat, index) => (
                <HeroStatCard key={stat.label} stat={stat} index={index} />
              ))}
            </div>
          </div>

          <form
            id="routine-search"
            onSubmit={handleSearch}
            className="hero-glass-card hero-form-card animate-enter p-5 text-white shadow-2xl shadow-black/20 transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white/[0.13] hover:shadow-violet-950/30"
          >
            <div className="mb-5">
              <p className="section-kicker border-white/15 bg-white/10 text-sky-100 shadow-none">Routine lookup</p>
              <h2 className="display-heading hero-heading-glow mt-3 text-2xl text-white">
                Search a section
              </h2>
              <div className="heading-accent-line mt-2 h-0.5 w-16" aria-hidden="true" />
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

      <main className="page-wrap space-y-16 py-12 sm:py-14">
        {notice && (
          <Notice type={notice.type} onDismiss={() => setNotice(null)}>
            {notice.text}
          </Notice>
        )}

        {announcement && (
          <FeaturedAnnouncementCard announcement={announcement} />
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

        <section className="animate-enter space-y-6">
          <SectionHeading
            kicker="Navigation hub"
            title="Explore by category"
            description="Important navbar destinations are grouped into expandable sections for faster discovery."
          />

          <div className="grid items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {featureGroups.map((group) => (
              <FeatureGroupCard
                key={group.id}
                group={group}
                expanded={expandedFeatureGroups.includes(group.id)}
                onToggle={() => toggleFeatureGroup(group.id)}
              />
            ))}
          </div>
        </section>

        <div className="animate-enter">
          <ResourceHighlights
            onAdd={() => navigate(isLoggedIn ? "/edit/details?tab=resources" : "/auth/login")}
            onFind={() => navigate("/resources")}
          />
        </div>

        <HomeAnalyticsSection
          analytics={homeAnalytics}
          loading={analyticsLoading}
          error={analyticsError}
        />

        <section id="contributors" className="animate-enter">
          <div className="surface-card p-6 transition-all duration-300 ease-out hover:shadow-xl hover:shadow-violet-500/10 sm:p-8">
            <SectionHeading
              kicker="Contributors"
              title="Top routine contributors"
              description="Students with the highest number of submitted resources."
            />

            <div className="mt-6">
              {contributorsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : topContributors.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

        <SponsorSection sponsor={featuredSponsor} />
      </main>

    </div>
  );
};

function HeroStatCard({ stat, index }) {
  const tones = {
    violet: "bg-violet-400/15 text-violet-100 ring-violet-300/20",
    green: "bg-green-400/15 text-green-100 ring-green-300/20",
    amber: "bg-amber-400/15 text-amber-100 ring-amber-300/20",
    sky: "bg-sky-400/15 text-sky-100 ring-sky-300/20",
  };

  return (
    <article
      className="hero-glass-card h-full p-4 text-left shadow-lg shadow-black/10 transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white/[0.14] hover:shadow-xl hover:shadow-violet-950/25"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${tones[stat.tone] || tones.violet}`}>
        {stat.icon}
      </div>
      <p className="text-sm font-semibold text-slate-300">{stat.label}</p>
      <p className="safe-text mt-1 text-2xl font-black text-white">
        {typeof stat.value === "number" ? (
          <AnimatedNumber value={stat.value} formatter={formatCompactNumber} />
        ) : (
          stat.value
        )}
      </p>
    </article>
  );
}

/**
 * Expandable home navigation group that mirrors related navbar destinations.
 */
function FeatureGroupCard({ group, expanded, onToggle }) {
  const Icon = group.icon;
  const tones = {
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200",
    green: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-200",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
  };

  return (
    <article className="group subtle-card h-full overflow-hidden hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/10 dark:hover:border-violet-500/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-44 w-full items-start gap-4 p-5 text-left transition-colors duration-200 ease-out hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-slate-900"
        aria-expanded={expanded}
      >
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ring-1 ring-current/10 transition-transform duration-300 ease-out group-hover:scale-105 ${tones[group.tone] || tones.violet}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="safe-text text-lg font-black text-slate-950 dark:text-white">
              {group.title}
            </span>
            <FiChevronDown
              className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${expanded ? "rotate-180 text-violet-600 dark:text-violet-300" : ""}`}
              aria-hidden="true"
            />
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-400">
            {group.description}
          </span>
          <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 transition-colors group-hover:bg-violet-50 group-hover:text-violet-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-violet-500/10 dark:group-hover:text-violet-200">
            {group.items.length} option{group.items.length === 1 ? "" : "s"}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="grid animate-enter gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          {group.items.map((item) => (
            <FeatureGroupLink key={`${group.id}-${item.href}-${item.label}`} item={item} />
          ))}
        </div>
      )}
    </article>
  );
}

function FeatureGroupLink({ item }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      className="group flex min-h-12 items-center gap-3 rounded-lg border border-transparent bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition-all duration-200 ease-out hover:translate-x-1 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition group-hover:text-violet-600 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700 dark:group-hover:text-violet-200">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <FiArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-200" aria-hidden="true" />
    </Link>
  );
}

function FeaturedAnnouncementCard({ announcement }) {
  const title = announcement.title || "Featured update";
  const link = announcement.link || "/";
  const isExternal = isExternalAnnouncementLink(link);
  const actionClassName = "btn-primary w-full sm:w-fit";
  const actionContent = (
    <>
      Learn More
      <FiArrowRight aria-hidden="true" />
    </>
  );

  return (
    <section
      id="featured-announcement"
      className="surface-card group animate-enter overflow-hidden shadow-2xl shadow-slate-950/20 ring-1 ring-white/60 transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-violet-500/15 dark:shadow-black/45 dark:ring-white/10"
    >
      <div className="relative overflow-hidden bg-slate-950">
        <img
          src={announcement.image}
          alt={`${title} cover`}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/45 to-slate-950/10" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-violet-950/35 to-transparent" />
        <div className="relative flex min-h-[400px] items-end p-4 sm:min-h-[480px] sm:p-8">
          <div className="w-full max-w-5xl rounded-xl border border-white/20 bg-slate-950/45 p-5 text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition-colors duration-300 group-hover:bg-slate-950/52 sm:p-7">
            <p className="inline-flex rounded-full bg-sky-400/15 px-3 py-1 text-xs font-black uppercase text-sky-100 ring-1 ring-sky-300/20">
              Featured update
            </p>
            <h2 className="safe-text mt-3 text-3xl font-black leading-tight sm:text-4xl">
              {title}
            </h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <p className="max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-100 sm:text-base">
                {announcement.description}
              </p>
              {isExternal ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className={actionClassName}
                >
                  {actionContent}
                </a>
              ) : (
                <Link to={link} className={actionClassName}>
                  {actionContent}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function isExternalAnnouncementLink(link) {
  if (!link || link.startsWith("/")) return false;

  try {
    const parsed = new URL(link);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function HomeAnalyticsSection({ analytics, loading, error }) {
  const normalizedAnalytics = normalizeHomeAnalytics(analytics);
  const resourceGrowth = normalizedAnalytics.resources.growth;

  return (
    <section id="platform-analytics" className="animate-enter space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          kicker="Platform insights"
          title="Statistics & analytics"
          description="Resource trends and current platform totals."
        />
        <span className="status-pill w-fit border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
          {loading ? "Refreshing charts..." : formatDateRange(normalizedAnalytics.period)}
        </span>
      </div>

      {error && (
        <Notice type="error">
          {error}
        </Notice>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <HomeMetricCard
          icon={<FiBookOpen aria-hidden="true" />}
          label="Total resources"
          value={normalizedAnalytics.resources.total}
          loading={loading}
          tooltip="Total shared resources currently available on the platform."
        />
        <HomeMetricCard
          icon={<FiUsers aria-hidden="true" />}
          label="Registered users"
          value={normalizedAnalytics.users.total}
          loading={loading}
          tooltip="Current total registered users on the platform."
        />
        <HomeMetricCard
          icon={<FiActivity aria-hidden="true" />}
          label="Timeline window"
          value={resourceGrowth.length || 0}
          suffix=" days"
          loading={loading}
          tooltip="Daily cumulative resource chart points included in the analytics window."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SemesterResourceChart
          data={normalizedAnalytics.resources.semesterDistribution}
          loading={loading}
        />
        <GrowthLineChart
          title="Resource growth"
          description="Cumulative shared resources from the selected start date."
          data={resourceGrowth}
          loading={loading}
          icon={<FiTrendingUp aria-hidden="true" />}
          tone="violet"
        />
      </div>
    </section>
  );
}

function HomeMetricCard({ icon, label, value, loading, tooltip, suffix = "" }) {
  return (
    <article
      className="group relative h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/10 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-violet-500/40"
      title={tooltip}
    >
      <AnalyticsTooltip>{tooltip}</AnalyticsTooltip>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 transition-transform duration-300 group-hover:scale-105 dark:bg-violet-500/10 dark:text-violet-200">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {loading ? (
            <span className="mt-2 block h-8 w-24 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          ) : (
            <p className="safe-text mt-1 text-2xl font-black text-slate-950 dark:text-white">
              {typeof value === "number" ? (
                <AnimatedNumber value={value} formatter={formatCompactNumber} suffix={suffix} />
              ) : (
                value
              )}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function getSemesterBarClass(index) {
  const classes = [
    "bg-gradient-to-t from-violet-700 to-violet-400 dark:from-violet-500 dark:to-violet-300",
    "bg-gradient-to-t from-sky-700 to-sky-400 dark:from-sky-500 dark:to-sky-300",
    "bg-gradient-to-t from-green-700 to-green-400 dark:from-green-500 dark:to-green-300",
    "bg-gradient-to-t from-cyan-700 to-cyan-400 dark:from-cyan-500 dark:to-cyan-300",
  ];

  return classes[index % classes.length];
}

function SemesterResourceChart({ data, loading }) {
  const rows = normalizeSemesterDistribution(data);
  const maxTotal = Math.max(...rows.map((item) => item.total), 1);

  return (
    <article className="surface-card p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10">
      <ChartHeader
        icon={<FiBarChart2 aria-hidden="true" />}
        title="Semester-wise resources"
        description="Number of shared resources grouped by course semester."
      />

      <div className="mt-6 grid min-h-64 grid-cols-4 items-end gap-3 sm:grid-cols-8">
        {rows.map((item, index) => {
          const height = loading
            ? [46, 70, 52, 78, 60, 88, 56, 68][index]
            : Math.max((item.total / maxTotal) * 100, item.total > 0 ? 8 : 2);
          const tooltip = `${formatNumber(item.total)} resource${item.total === 1 ? "" : "s"} from semester ${item.semester}.`;

          return (
            <div
              key={item.semester}
              className="group/bar relative flex h-56 flex-col justify-end gap-2"
              title={loading ? `Loading semester ${item.semester} resource count.` : tooltip}
            >
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-md bg-slate-950 px-3 py-2 text-center text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover/bar:opacity-100 dark:bg-white dark:text-slate-950">
                {loading ? `Loading semester ${item.semester} resource count.` : tooltip}
              </span>
              <div className="flex h-44 items-end rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200/70 transition-colors group-hover/bar:bg-violet-50 dark:bg-slate-900 dark:ring-slate-800 dark:group-hover/bar:bg-violet-500/10">
                <div
                  className={`w-full rounded-md transition-all duration-500 ${
                    loading
                      ? "animate-pulse bg-slate-300 dark:bg-slate-700"
                      : getSemesterBarClass(index)
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Sem {item.semester}
                </p>
                <p className="text-sm font-black text-slate-950 dark:text-white">
                  {loading ? "-" : <AnimatedNumber value={item.total} formatter={formatCompactNumber} />}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function GrowthLineChart({ title, description, data, loading, icon, tone = "violet" }) {
  const rows = Array.isArray(data) ? data : [];
  const maxTotal = Math.max(...rows.map((item) => item.total), 1);
  const points = getLineChartPoints(rows, maxTotal);
  const linePath = points.length ? `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")}` : "";
  const areaPath = points.length
    ? `${linePath} L ${points.at(-1).x} 42 L ${points[0].x} 42 Z`
    : "";
  const checkpoints = getTimelineCheckpoints(points, rows);
  const toneClasses = {
    violet: {
      line: "stroke-violet-600 dark:stroke-violet-300",
      fill: "fill-violet-500/10 dark:fill-violet-300/10",
      icon: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200",
      marker: "bg-violet-600 ring-violet-100 dark:bg-violet-300 dark:ring-violet-500/20",
    },
    green: {
      line: "stroke-green-600 dark:stroke-green-300",
      fill: "fill-green-500/10 dark:fill-green-300/10",
      icon: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-200",
      marker: "bg-green-600 ring-green-100 dark:bg-green-300 dark:ring-green-500/20",
    },
  };
  const classes = toneClasses[tone] || toneClasses.violet;

  return (
    <article className="surface-card p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10">
      <ChartHeader
        icon={icon}
        iconClassName={classes.icon}
        title={title}
        description={description}
      />

      <div className="mt-6 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3">
        <div className="flex h-56 flex-col justify-between text-right text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>{loading ? "-" : formatCompactNumber(maxTotal)}</span>
          <span>{loading ? "-" : formatCompactNumber(Math.round(maxTotal / 2))}</span>
          <span>0</span>
        </div>
        <div
          className="relative h-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner shadow-slate-950/[0.02] dark:border-slate-800 dark:bg-slate-950"
          title={`${title}: daily cumulative totals over the selected resource period.`}
        >
          {loading ? (
            <div className="absolute inset-0 p-4">
              <div className="h-full w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
            </div>
          ) : (
            <>
              <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <path d={areaPath} className={classes.fill} />
                <path
                  d={linePath}
                  className={`${classes.line} transition-all duration-500`}
                  fill="none"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line x1="4" y1="36" x2="96" y2="36" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.6" />
                <line x1="4" y1="20" x2="96" y2="20" className="stroke-slate-100 dark:stroke-slate-900" strokeWidth="0.4" />
              </svg>
              {checkpoints.map((point) => (
                <span
                  key={`${title}-${point.date}`}
                  className={`group/point absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ${classes.marker}`}
                  style={{ left: `${point.left}%`, top: `${point.top}%` }}
                  title={`${formatDisplayDate(point.date)}: ${formatNumber(point.total)} total.`}
                >
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-44 -translate-x-1/2 rounded-md bg-slate-950 px-3 py-2 text-center text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover/point:opacity-100 dark:bg-white dark:text-slate-950">
                    {formatDisplayDate(point.date)}: {formatNumber(point.total)} total.
                  </span>
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="ml-[4.25rem] mt-3 grid grid-cols-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{formatDisplayDate(rows[0]?.date)}</span>
        <span className="text-center">{formatDisplayDate(rows[Math.floor(rows.length / 2)]?.date)}</span>
        <span className="text-right">{formatDisplayDate(rows.at(-1)?.date)}</span>
      </div>
    </article>
  );
}

function ChartHeader({ icon, title, description, iconClassName = "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200" }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="safe-text text-lg font-black text-slate-950 dark:text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function AnalyticsTooltip({ children }) {
  return (
    <span className="pointer-events-none absolute left-4 top-3 z-20 max-w-xs rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 dark:bg-white dark:text-slate-950">
      {children}
    </span>
  );
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
      className={`group h-full rounded-xl border p-4 transition-all duration-300 ease-out ${
        highlighted
          ? "border-amber-200 bg-amber-50/80 shadow-sm shadow-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/10"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
      } text-left hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:border-violet-500/40`}
    >
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white ring-2 ring-white transition-transform duration-300 group-hover:scale-105 dark:bg-white dark:text-slate-950 dark:ring-slate-800">
          {contributor.profilePic ? (
            <img src={contributor.profilePic} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-black uppercase ${highlighted ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200" : "bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:ring-slate-800"}`}>
            Rank #{rank}
          </span>
          <p className="safe-text mt-2 font-bold text-slate-950 dark:text-white">
            {contributor.name || "Contributor"}
          </p>
          <p className="safe-text mt-1 text-xs text-slate-500 dark:text-slate-400">
            ID: {contributor.id || "N/A"}
          </p>
        </div>
        <span className="rounded-lg bg-white px-3 py-2 text-right text-sm font-bold text-slate-950 ring-1 ring-slate-200 transition-colors group-hover:bg-violet-50 group-hover:text-violet-800 dark:bg-slate-950 dark:text-white dark:ring-slate-800 dark:group-hover:bg-violet-500/10 dark:group-hover:text-violet-100">
          <span className="block text-lg">
            <AnimatedNumber value={Number.isFinite(points) ? points : 0} formatter={formatNumber} />
          </span>
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

function normalizeHomeAnalytics(value = emptyHomeAnalytics) {
  const source = value || emptyHomeAnalytics;
  const resourceGrowth = normalizeTimeline(source.resources?.growth);
  const userGrowth = normalizeTimeline(source.users?.growth);

  return {
    period: {
      from: source.period?.from || resourceGrowth[0]?.date || userGrowth[0]?.date || "",
      to: source.period?.to || resourceGrowth.at(-1)?.date || userGrowth.at(-1)?.date || "",
    },
    resources: {
      total: sanitizeNumber(source.resources?.total, resourceGrowth.at(-1)?.total || 0),
      semesterDistribution: normalizeSemesterDistribution(source.resources?.semesterDistribution),
      growth: resourceGrowth,
    },
    users: {
      total: sanitizeNumber(source.users?.total, userGrowth.at(-1)?.total || 0),
      growth: userGrowth,
    },
  };
}

function normalizeSemesterDistribution(rows = []) {
  const totals = new Map(SEMESTER_LABELS.map((semester) => [semester, 0]));

  (Array.isArray(rows) ? rows : []).forEach((item) => {
    const semester = Number(item.semester);
    const total = sanitizeNumber(item.total);

    if (totals.has(semester)) {
      totals.set(semester, total);
    }
  });

  return SEMESTER_LABELS.map((semester) => ({
    semester,
    total: totals.get(semester) || 0,
  }));
}

function normalizeTimeline(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((item) => ({
      date: String(item.date || "").slice(0, 10),
      total: sanitizeNumber(item.total),
    }))
    .filter((item) => item.date)
    .sort((first, second) => first.date.localeCompare(second.date));
}

function getLineChartPoints(rows, maxTotal) {
  if (!rows.length) return [];

  const xStart = 4;
  const xEnd = 96;
  const yTop = 4;
  const yBottom = 36;
  const xRange = xEnd - xStart;
  const yRange = yBottom - yTop;

  return rows.map((item, index) => {
    const x = rows.length === 1 ? (xStart + xEnd) / 2 : xStart + (index / (rows.length - 1)) * xRange;
    const y = yBottom - (sanitizeNumber(item.total) / maxTotal) * yRange;

    return {
      ...item,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      left: Number(x.toFixed(2)),
      top: Number(((y / 42) * 100).toFixed(2)),
    };
  });
}

function getTimelineCheckpoints(points, rows) {
  if (!points.length) return [];

  const indexes = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => Math.round((points.length - 1) * ratio));

  return [...new Set(indexes)].map((index) => ({
    ...points[index],
    date: rows[index]?.date || points[index].date,
    total: rows[index]?.total || points[index].total,
  }));
}

function formatDateRange(period) {
  if (!period?.from || !period?.to) return "Resource timeline";

  return `${formatDisplayDate(period.from)} - ${formatDisplayDate(period.to)}`;
}

function formatDisplayDate(value) {
  if (!value) return "-";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function formatNumber(value) {
  return sanitizeNumber(value).toLocaleString();
}

function formatCompactNumber(value) {
  return sanitizeNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 1,
    notation: sanitizeNumber(value) >= 10000 ? "compact" : "standard",
  });
}

function AnimatedNumber({ value, formatter = formatNumber, suffix = "" }) {
  const targetValue = sanitizeNumber(value);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      setDisplayValue(targetValue);
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (prefersReducedMotion) {
      setDisplayValue(targetValue);
      return undefined;
    }

    let animationFrame = 0;
    const startTime = performance.now();
    const duration = 650;

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(targetValue * eased));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    setDisplayValue(0);
    animationFrame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrame);
  }, [targetValue]);

  return `${formatter(displayValue)}${suffix}`;
}

function sanitizeNumber(value, fallback = 0) {
  const numberValue = Number(value);
  const fallbackValue = Number(fallback);

  if (Number.isFinite(numberValue)) return numberValue;
  if (Number.isFinite(fallbackValue)) return fallbackValue;
  return 0;
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
      .course-cell { background: #ffffff; border-left: 4px solid #7c3aed; }
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
