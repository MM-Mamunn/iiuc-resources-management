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
  FiCheckCircle,
  FiClock,
  FiCompass,
  FiDownload,
  FiExternalLink,
  FiGrid,
  FiLogIn,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiShield,
  FiCpu,
  FiTrendingUp,
  FiTrash2,
  FiUser,
  FiUserPlus,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Header from "./components/Header";
import ResourceHighlights from "./components/ResourceHighlights";
import RoutineActionToggle from "./components/RoutineActionToggle";
import RoutineTable from "./components/RoutineTable";
import RoutineDetailsModal from "./components/RoutineDetailsModal";
import { SponsorSection } from "./components/SponsorDisplay";
import {
  EmptyState,
  FormField,
  Notice,
  SectionHeading,
  SuggestionList,
  cx,
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
const POPULAR_SECTIONS = ["7BM", "7BF", "5BM", "5BF", "3BM", "1BM"];

const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: (prefersReducedMotion) => ({
    opacity: 1,
    transition: prefersReducedMotion
      ? { duration: 0.1 }
      : {
          staggerChildren: 0.08,
          delayChildren: 0.05,
        },
  }),
};

const heroItemVariants = {
  hidden: (prefersReducedMotion) => ({
    opacity: 0,
    y: prefersReducedMotion ? 0 : 16,
  }),
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const sectionScrollVariants = {
  hidden: (prefersReducedMotion) => ({
    opacity: 0,
    y: prefersReducedMotion ? 0 : 20,
  }),
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const gridStaggerVariants = {
  hidden: { opacity: 0 },
  visible: (prefersReducedMotion) => ({
    opacity: 1,
    transition: prefersReducedMotion
      ? { duration: 0.1 }
      : {
          staggerChildren: 0.07,
        },
  }),
};

const cardStaggerItemVariants = {
  hidden: (prefersReducedMotion) => ({
    opacity: 0,
    y: prefersReducedMotion ? 0 : 16,
  }),
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

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
 * Modern, elevated public landing and routine discovery portal.
 */
const Home = () => {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
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
  const [selectedClassItem, setSelectedClassItem] = useState(null);
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
        label: "Active Session",
        value: sessionLabel,
        icon: <FiCalendar className="h-5 w-5" aria-hidden="true" />,
        tone: "violet",
        subtext: "Current Academic Term",
      },
      {
        label: "Weekly Days",
        value: `${DISPLAY_DAYS.length} Days`,
        icon: <FiGrid className="h-5 w-5" aria-hidden="true" />,
        tone: "emerald",
        subtext: "Saturday – Wednesday",
      },
      {
        label: "Top Contributors",
        value: topContributors.length || "10+",
        icon: <FiAward className="h-5 w-5" aria-hidden="true" />,
        tone: "amber",
        subtext: "Community Curators",
      },
    ],
    [sessionLabel, topContributors.length],
  );

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

      const targetElement = document.getElementById("routine-results");
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {
      setSchedule([]);
      setShift(1);
      setHasSearched(true);
      setNotice({
        type: "error",
        text: "Could not load this routine. Please verify the section code and session name.",
      });
    } finally {
      setRoutineLoading(false);
    }
  };

  const handleQuickPreset = (presetSection) => {
    setSection(presetSection);
    setSectionSuggestions([]);
    setHasSearched(false);
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
            ? `${courseData.code} was added to your personal routine.`
            : `${courseData.code} was removed from your personal routine.`,
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

  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setNotice({
        type: "error",
        text: "Your browser blocked the print window. Please allow popups and try again.",
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
      }),
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

  const academicHubCategories = [
    {
      id: "routine",
      title: "Routines & Timetables",
      description: "Fast access to class schedules across sections, rooms, teachers, and student profiles.",
      icon: FiCalendar,
      tone: "violet",
      links: [
        { label: "Section Routine", href: "/routine/section", icon: FiGrid, tag: "Public" },
        { label: "Teacher Routine", href: "/routine/teacher", icon: FiUsers, tag: "Public" },
        { label: "Classroom Routine", href: "/classroom/routine", icon: FiMapPin, tag: "Public" },
        {
          label: "Personal Routine",
          href: isLoggedIn ? "/routine/personalroutine" : "/auth/login",
          icon: FiUser,
          tag: "Student",
        },
      ],
    },
    {
      id: "resources",
      title: "Academic Resources",
      description: "Crowdsourced course drives, lecture slides, question banks, and shared materials.",
      icon: FiBookOpen,
      tone: "emerald",
      links: [
        { label: "Resource Library", href: "/resources", icon: FiBookOpen, tag: "All Courses" },
        { label: "Semester Materials", href: "/info/materials", icon: FiGrid, tag: "Syllabus" },
        {
          label: "Share Notes & Files",
          href: isLoggedIn ? "/edit/details?tab=resources" : "/auth/login",
          icon: FiPlus,
          tag: "Contribute",
        },
      ],
    },
    {
      id: "directory",
      title: "Campus Directory",
      description: "Important faculty contact info, syllabus structures, batch details, and transit routes.",
      icon: FiCompass,
      tone: "sky",
      links: [
        { label: "Faculty Directory", href: "/info/teacher", icon: FiUsers, tag: "Contacts" },
        { label: "Course Curriculum", href: "/info/course", icon: FiBookOpen, tag: "Credits" },
        { label: "Section Information", href: "/info/section", icon: FiGrid, tag: "Batches" },
        { label: "Bus Transit Schedules", href: "/info/bus", icon: FiMapPin, tag: "Routes" },
      ],
    },
    {
      id: "community",
      title: "Student Community",
      description: "Search peer profiles, discover top academic contributors, and view student achievements.",
      icon: FiUsers,
      tone: "amber",
      links: [
        { label: "Student Community", href: "/info/community", icon: FiUsers, tag: "Directory" },
        { label: "Top Contributors", href: "#contributors", icon: FiAward, tag: "Hall of Fame" },
        { label: "Project Contributors", href: "/info/contributor", icon: FiCheckCircle, tag: "Credits" },
      ],
    },
    {
      id: "portal",
      title: isLoggedIn ? "My Academic Portal" : "Student Account",
      description: isLoggedIn
        ? "Access your personal routine, course add/drop, and saved university profile."
        : "Sign in to customize your timetable, rate course notes, and save personal routines.",
      icon: isLoggedIn ? FiUser : FiLogIn,
      tone: isLoggedIn ? "emerald" : "violet",
      links: isLoggedIn
        ? [
            { label: "Personal Dashboard", href: "/homepersonal", icon: FiGrid, tag: "Overview" },
            { label: "Add or Drop Courses", href: "/courseadddrop", icon: FiPlus, tag: "Routine" },
            { label: "Registered Courses", href: "/showall", icon: FiBookOpen, tag: "Enrolled" },
            { label: "Profile & Settings", href: "/edit/details", icon: FiUser, tag: "Account" },
          ]
        : [
            { label: "Sign In to Account", href: "/auth/login", icon: FiLogIn, tag: "Existing User" },
            { label: "Create Student Profile", href: "/auth/reg", icon: FiUserPlus, tag: "New Student" },
          ],
    },
    {
      id: "management",
      title: "Roles & Administration",
      description: "Specialized tools and administration workspaces for Class Representatives and Admins.",
      icon: FiShield,
      tone: "rose",
      links: [
        isCrOrAdmin && { label: "CR Workspace", href: "/CR", icon: FiUsers, tag: "CR Portal" },
        isCrOrAdmin && { label: "Routine Grid Editor", href: "/CR/routine", icon: FiGrid, tag: "Schedule" },
        isAdmin && { label: "Admin Console", href: "/admin/users", icon: FiShield, tag: "System" },
        { label: "AI Academic Assistant", href: isLoggedIn ? "/ai" : "/auth/login", icon: FiCpu, tag: "AI Beta" },
      ].filter(Boolean),
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      {/* ─── HERO SECTION ─── */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <img
          src={routineImage}
          alt="IIUC Campus Backdrop"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35"
        />
        {/* Multi-layered cinematic gradient overlays */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/85 via-slate-950/75 to-slate-950" />
        <div className="absolute -left-48 top-0 -z-10 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -right-48 bottom-0 -z-10 h-96 w-96 rounded-full bg-emerald-600/15 blur-[120px]" />

        <div className="page-wrap grid gap-12 py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(380px,440px)] lg:items-center lg:py-20">
          {/* Left Column: Heading & Value Proposition */}
          <motion.div
            custom={prefersReducedMotion}
            variants={heroContainerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-start text-left"
          >
            <motion.div
              custom={prefersReducedMotion}
              variants={heroItemVariants}
              className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-3.5 py-1 text-xs font-bold text-violet-200 backdrop-blur-md"
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-soft-pulse" />
              <span>IIUC CSE Academic Routine Management</span>
            </motion.div>

            <motion.h1
              custom={prefersReducedMotion}
              variants={heroItemVariants}
              className="display-heading hero-heading-glow mt-6 text-3xl text-white sm:text-5xl lg:text-6xl"
            >
              Academic schedules, class routines & resources,{" "}
              <span className="bg-gradient-to-r from-violet-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                simplified.
              </span>
            </motion.h1>

            <motion.p
              custom={prefersReducedMotion}
              variants={heroItemVariants}
              className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg"
            >
              Check daily class routines by section, room, or faculty member. Sign in to customize your personal routine, add/drop courses, and explore peer-shared notes.
            </motion.p>

            {/* Quick action buttons */}
            <motion.div
              custom={prefersReducedMotion}
              variants={heroItemVariants}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <motion.a
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                href="#routine-search"
                className="btn-primary"
              >
                <FiSearch aria-hidden="true" />
                Find Section Routine
              </motion.a>
              <motion.div
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              >
                <Link
                  to="/resources"
                  className="btn-secondary !border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
                >
                  <FiBookOpen aria-hidden="true" />
                  Browse Resources
                </Link>
              </motion.div>
              {isLoggedIn ? (
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  <Link
                    to="/homepersonal"
                    className="btn-secondary !border-emerald-400/30 !bg-emerald-500/15 !text-emerald-200 hover:!bg-emerald-500/25"
                  >
                    <FiGrid aria-hidden="true" />
                    My Dashboard
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  <Link
                    to="/auth/login"
                    className="btn-secondary !border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
                  >
                    <FiLogIn aria-hidden="true" />
                    Sign In
                  </Link>
                </motion.div>
              )}
            </motion.div>

            {/* Quick Hero Stat Cards */}
            <motion.div
              custom={prefersReducedMotion}
              variants={heroItemVariants}
              className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {summaryStats.map((stat, index) => (
                <HeroStatCard key={stat.label} stat={stat} index={index} prefersReducedMotion={prefersReducedMotion} />
              ))}
            </motion.div>
          </motion.div>

          {/* Right Column: Routine Search Box */}
          <div className="w-full">
            <motion.form
              id="routine-search"
              onSubmit={handleSearch}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hero-glass-card hero-form-card overflow-hidden border border-white/20 bg-slate-900/65 p-6 shadow-2xl shadow-slate-950/50 backdrop-blur-2xl transition-all duration-300 hover:border-violet-400/40 sm:p-7"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                    Instant Schedule Finder
                  </span>
                  <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                    Section Routine Lookup
                  </h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30">
                  <FiSearch className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              {/* Popular section quick pills */}
              <div className="mt-5">
                <label className="text-xs font-semibold text-slate-300">
                  Quick Select Section:
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {POPULAR_SECTIONS.map((sec) => (
                    <motion.button
                      key={sec}
                      type="button"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                      onClick={() => handleQuickPreset(sec)}
                      className={cx(
                        "rounded-md px-2.5 py-1 text-xs font-bold transition",
                        normalizedSection === sec
                          ? "bg-violet-500 text-white shadow-md shadow-violet-500/30"
                          : "bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white",
                      )}
                    >
                      {sec}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <FormField
                  id="section-input"
                  label="Section Code"
                  helper={sectionLoading ? "Looking for matching sections..." : "e.g. 7BM, 7BF, 5BM"}
                  labelClassName="!text-slate-100"
                  helperClassName="!text-slate-300"
                >
                  <div className="relative">
                    <FiGrid
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="section-input"
                      type="text"
                      value={section}
                      onChange={handleSectionChange}
                      placeholder="e.g. 7BM"
                      className="form-field pl-12 uppercase"
                      autoComplete="off"
                    />
                    {section && (
                      <button
                        type="button"
                        onClick={() => {
                          setSection("");
                          setSectionSuggestions([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        aria-label="Clear section input"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    )}
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
                  id="session-input"
                  label="Academic Session"
                  helper={sessionLoading ? "Looking up sessions..." : sessionHelper}
                  labelClassName="!text-slate-100"
                  helperClassName="!text-slate-300"
                >
                  <div className="relative">
                    <FiCalendar
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="session-input"
                      type="text"
                      value={session}
                      onChange={handleSessionChange}
                      placeholder={activeSessionName || "e.g. Autumn 2026"}
                      className="form-field pl-12"
                      autoComplete="off"
                    />
                    {session && (
                      <button
                        type="button"
                        onClick={() => {
                          setSession("");
                          setSessionSuggestions([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        aria-label="Clear session input"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    )}
                    <SuggestionList
                      suggestions={sessionSuggestions}
                      onSelect={(suggestion) => {
                        setSession(suggestion);
                        setSessionSuggestions([]);
                      }}
                    />
                  </div>
                </FormField>

                <motion.button
                  type="submit"
                  whileHover={prefersReducedMotion || !canSearch || routineLoading ? {} : { scale: 1.01 }}
                  whileTap={prefersReducedMotion || !canSearch || routineLoading ? {} : { scale: 0.98 }}
                  className="btn-primary mt-2 w-full shadow-lg shadow-violet-600/30"
                  disabled={!canSearch || routineLoading}
                >
                  {routineLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      <span>Loading Routine...</span>
                    </>
                  ) : (
                    <>
                      <FiSearch className="h-4 w-4" aria-hidden="true" />
                      <span>View Section Schedule</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.form>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT BODY ─── */}
      <main className="page-wrap space-y-20 py-12 sm:space-y-24 sm:py-16">
        {/* Global Feedback Notice */}
        <AnimatePresence mode="wait">
          {notice && (
            <motion.div
              key="global-notice"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Notice type={notice.type} onDismiss={() => setNotice(null)}>
                {notice.text}
              </Notice>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Featured Campus Announcement */}
        {announcement && (
          <FeaturedAnnouncementCard announcement={announcement} prefersReducedMotion={prefersReducedMotion} />
        )}

        {/* ─── ROUTINE RESULTS SECTION ─── */}
        <AnimatePresence mode="wait">
          {hasSearched && (
            <motion.section
              id="routine-results"
              key="routine-results"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="scroll-mt-24 space-y-4"
            >
              <RoutineTable
                title={`${normalizedSection || "Section"} Routine Matrix`}
                subtitle={`Academic Session: ${normalizedSession || activeSessionName || "Selected"} • Shift: ${shift === 1 ? "Male (Morning)" : "Female (Day)"}`}
                timeSlots={timeSlots}
                displayDays={schedule.length ? DISPLAY_DAYS : []}
                getItemsForDay={generateDaySchedule}
                onCellClick={(item) => {
                  if (item?.details && item.details.length > 0) {
                    setSelectedClassItem(item);
                  }
                }}
                actions={
                  schedule.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-pill border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <FiClock className="h-3.5 w-3.5 text-violet-500" />
                        {shift === 1 ? "Male Shift" : "Female Shift"}
                      </span>
                      {isLoggedIn && (
                        <RoutineActionToggle
                          visible={showRoutineActions}
                          onToggle={() => setShowRoutineActions((current) => !current)}
                        />
                      )}
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="btn-secondary"
                      >
                        <FiDownload aria-hidden="true" />
                        <span>Print Timetable</span>
                      </button>
                    </div>
                  )
                }
                renderCourseActions={(item) =>
                  isLoggedIn &&
                  showRoutineActions &&
                  item.courseData && (
                    <div className="mt-1 flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updatePersonalCourse("add", item.courseData)}
                        disabled={
                          busyCourses[
                            `add-${item.courseData.code}-${item.courseData.section}-${item.courseData.session}`
                          ]
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                        aria-label={`Add ${item.courseData.code} to personal routine`}
                        title="Add to personal routine"
                      >
                        <FiPlus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePersonalCourse("remove", item.courseData)}
                        disabled={
                          busyCourses[
                            `remove-${item.courseData.code}-${item.courseData.section}-${item.courseData.session}`
                          ]
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-60"
                        aria-label={`Remove ${item.courseData.code} from personal routine`}
                        title="Remove from personal routine"
                      >
                        <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )
                }
                emptyTitle="No schedule found"
                emptyDescription="We couldn't find any classes for this section and session combination. Please verify the section code."
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Selected Class Details Modal */}
        {selectedClassItem && (
          <RoutineDetailsModal
            item={selectedClassItem}
            title={`${selectedClassItem.subject || "Course"} Details`}
            onClose={() => setSelectedClassItem(null)}
          />
        )}

        {/* ─── ACADEMIC NAVIGATION HUB (BENTO GRID) ─── */}
        <motion.section
          id="academic-hub"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          custom={prefersReducedMotion}
          variants={sectionScrollVariants}
          className="space-y-8"
        >
          <SectionHeading
            kicker="Academic Hub"
            title="Explore RMS Portals & Services"
            description="Quick access to routine lookup, course notes, department contacts, transit schedules, and student management workspaces."
          />

          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={gridStaggerVariants}
            custom={prefersReducedMotion}
          >
            {academicHubCategories.map((category) => (
              <AcademicHubCard
                key={category.id}
                category={category}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))}
          </motion.div>
        </motion.section>

        {/* ─── STUDY MATERIALS & RESOURCE HIGHLIGHTS ─── */}
        <motion.section
          id="resource-highlights"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          custom={prefersReducedMotion}
          variants={sectionScrollVariants}
          className="space-y-6"
        >
          <SectionHeading
            kicker="Peer Knowledge"
            title="Featured Academic Resources"
            description="Top-rated study materials, question papers, and course notes shared by fellow students."
          />
          <ResourceHighlights
            onAdd={() => navigate(isLoggedIn ? "/edit/details?tab=resources" : "/auth/login")}
            onFind={() => navigate("/resources")}
          />
        </motion.section>

        {/* ─── PLATFORM INSIGHTS & ANALYTICS ─── */}
        <HomeAnalyticsSection
          analytics={homeAnalytics}
          loading={analyticsLoading}
          error={analyticsError}
          prefersReducedMotion={prefersReducedMotion}
        />

        {/* ─── TOP CONTRIBUTORS / HALL OF FAME ─── */}
        <motion.section
          id="contributors"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          custom={prefersReducedMotion}
          variants={sectionScrollVariants}
        >
          <div className="surface-card overflow-hidden p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="section-kicker">Hall of Fame</span>
                <h2 className="display-heading heading-gradient-text mt-3 text-2xl sm:text-3xl">
                  Top Resource Contributors
                </h2>
                <div className="heading-accent-line" aria-hidden="true" />
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  Recognizing the students who help peers succeed by sharing course materials and notes.
                </p>
              </div>
              <motion.div
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                className="w-fit shrink-0"
              >
                <Link
                  to="/info/community"
                  className="btn-secondary w-fit shrink-0"
                >
                  <FiUsers aria-hidden="true" />
                  <span>View Full Directory</span>
                </Link>
              </motion.div>
            </div>

            <div className="mt-8">
              {contributorsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div
                      key={item}
                      className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60"
                    />
                  ))}
                </div>
              ) : topContributors.length ? (
                <motion.div
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  variants={gridStaggerVariants}
                  custom={prefersReducedMotion}
                >
                  {topContributors.slice(0, 6).map((contributor, index) => (
                    <ContributorCard
                      key={contributor.id || index}
                      contributor={contributor}
                      rank={index + 1}
                      onOpenProfile={openCommunityProfile}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                  ))}
                </motion.div>
              ) : (
                <EmptyState
                  icon={<FiAward className="h-8 w-8 text-amber-500" aria-hidden="true" />}
                  title="No contributors yet"
                  description="Be the first to upload lecture notes or past papers and earn your spot here!"
                  action={
                    <motion.button
                      type="button"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      onClick={() => navigate(isLoggedIn ? "/edit/details?tab=resources" : "/auth/login")}
                      className="btn-primary"
                    >
                      <FiPlus aria-hidden="true" />
                      <span>Contribute Material</span>
                    </motion.button>
                  }
                />
              )}
            </div>
          </div>
        </motion.section>

        {/* ─── FEATURED PARTNER SPONSOR ─── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          custom={prefersReducedMotion}
          variants={sectionScrollVariants}
        >
          <SponsorSection sponsor={featuredSponsor} />
        </motion.div>
      </main>
    </div>
  );
};

/* ─── SUB-COMPONENTS ─── */

function HeroStatCard({ stat, index, prefersReducedMotion }) {
  const tones = {
    violet: "bg-violet-500/20 text-violet-200 border-violet-400/30",
    emerald: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    amber: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  };

  return (
    <motion.div
      variants={cardStaggerItemVariants}
      custom={prefersReducedMotion}
      whileHover={prefersReducedMotion ? {} : { y: -3, transition: { duration: 0.2 } }}
      className="hero-glass-card border border-white/10 bg-white/5 p-4 text-left shadow-lg backdrop-blur-md transition-colors hover:border-white/25 hover:bg-white/10"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${tones[stat.tone] || tones.violet}`}>
          {stat.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-300">{stat.label}</p>
          <p className="truncate text-lg font-black text-white">{stat.value}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">{stat.subtext}</p>
    </motion.div>
  );
}

function AcademicHubCard({ category, prefersReducedMotion }) {
  const Icon = category.icon;
  const tones = {
    violet: {
      icon: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
      accent: "hover:border-violet-300 dark:hover:border-violet-500/40",
      tag: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
      accent: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
      tag: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    sky: {
      icon: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
      accent: "hover:border-sky-300 dark:hover:border-sky-500/40",
      tag: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      accent: "hover:border-amber-300 dark:hover:border-amber-500/40",
      tag: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    },
    rose: {
      icon: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
      accent: "hover:border-rose-300 dark:hover:border-rose-500/40",
      tag: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    },
  };

  const currentTone = tones[category.tone] || tones.violet;

  return (
    <motion.article
      variants={cardStaggerItemVariants}
      custom={prefersReducedMotion}
      whileHover={prefersReducedMotion ? {} : { y: -4, transition: { duration: 0.2 } }}
      className={cx(
        "surface-card flex h-full flex-col justify-between p-6 transition-colors duration-300 hover:shadow-xl",
        currentTone.accent,
      )}
    >
      <div>
        <div className="flex items-center gap-3">
          <div className={cx("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", currentTone.icon)}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              {category.title}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {category.links.length} destination{category.links.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {category.description}
        </p>
      </div>

      <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        {category.links.map((link) => {
          const LinkIcon = link.icon;
          return (
            <Link
              key={link.label}
              to={link.href}
              className="group flex items-center justify-between rounded-lg p-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <span className="flex items-center gap-2.5 truncate">
                <LinkIcon className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-violet-600 dark:text-slate-500 dark:group-hover:text-violet-400" />
                <span className="truncate">{link.label}</span>
              </span>
              <span className="flex items-center gap-1.5">
                {link.tag && (
                  <span className={cx("rounded px-2 py-0.5 text-[10px] font-bold uppercase", currentTone.tag)}>
                    {link.tag}
                  </span>
                )}
                <FiArrowRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
              </span>
            </Link>
          );
        })}
      </div>
    </motion.article>
  );
}

function FeaturedAnnouncementCard({ announcement, prefersReducedMotion }) {
  const title = announcement.title || "Featured Campus Notice";
  const link = announcement.link || "/";
  const isExternal = isExternalAnnouncementLink(link);

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      custom={prefersReducedMotion}
      variants={sectionScrollVariants}
      className="surface-card group overflow-hidden border border-violet-200/60 shadow-xl transition-all duration-300 hover:shadow-2xl dark:border-violet-500/20"
    >
      <div className="relative min-h-[320px] overflow-hidden bg-slate-950 sm:min-h-[380px]">
        {announcement.image && (
          <img
            src={announcement.image}
            alt={`${title} cover`}
            className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />

        <div className="relative flex h-full flex-col justify-end p-6 sm:p-10">
          <div className="max-w-4xl space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/20 px-3 py-1 text-xs font-bold uppercase text-sky-200 backdrop-blur-md">
              <FiZap className="h-3.5 w-3.5 text-sky-300" />
              Featured Campus Announcement
            </span>
            <h2 className="text-2xl font-black text-white sm:text-4xl">
              {title}
            </h2>
            <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-slate-200 sm:text-base">
              {announcement.description}
            </p>

            <div className="pt-2">
              {isExternal ? (
                <motion.a
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                >
                  <span>Learn More</span>
                  <FiExternalLink aria-hidden="true" />
                </motion.a>
              ) : (
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  className="inline-block"
                >
                  <Link to={link} className="btn-primary">
                    <span>Learn More</span>
                    <FiArrowRight aria-hidden="true" />
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
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

function HomeAnalyticsSection({ analytics, loading, error, prefersReducedMotion }) {
  const normalizedAnalytics = normalizeHomeAnalytics(analytics);
  const resourceGrowth = normalizedAnalytics.resources.growth;

  return (
    <motion.section
      id="platform-analytics"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      custom={prefersReducedMotion}
      variants={sectionScrollVariants}
      className="space-y-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          kicker="Live Platform Trends"
          title="Curriculum & Resource Insights"
          description="Real-time counts of academic notes, registered users, and semester distributions across IIUC CSE."
        />
        <span className="status-pill border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <FiActivity className="h-3.5 w-3.5 text-emerald-500" />
          {loading ? "Refreshing..." : formatDateRange(normalizedAnalytics.period)}
        </span>
      </div>

      {error && <Notice type="error">{error}</Notice>}

      <motion.div
        className="grid gap-4 sm:grid-cols-3"
        variants={gridStaggerVariants}
        custom={prefersReducedMotion}
      >
        <HomeMetricCard
          icon={<FiBookOpen className="h-5 w-5" aria-hidden="true" />}
          label="Shared Resources"
          value={normalizedAnalytics.resources.total}
          loading={loading}
          tone="violet"
          subtext="Course files & study materials"
          prefersReducedMotion={prefersReducedMotion}
        />
        <HomeMetricCard
          icon={<FiUsers className="h-5 w-5" aria-hidden="true" />}
          label="Registered Students"
          value={normalizedAnalytics.users.total}
          loading={loading}
          tone="emerald"
          subtext="Active platform accounts"
          prefersReducedMotion={prefersReducedMotion}
        />
        <HomeMetricCard
          icon={<FiTrendingUp className="h-5 w-5" aria-hidden="true" />}
          label="Tracking Window"
          value={resourceGrowth.length || 0}
          suffix=" Days"
          loading={loading}
          tone="sky"
          subtext="Continuous timeline history"
          prefersReducedMotion={prefersReducedMotion}
        />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SemesterResourceChart
          data={normalizedAnalytics.resources.semesterDistribution}
          loading={loading}
          prefersReducedMotion={prefersReducedMotion}
        />
        <GrowthLineChart
          title="Resource Upload Trend"
          description="Cumulative study materials added over recent weeks."
          data={resourceGrowth}
          loading={loading}
          icon={<FiTrendingUp aria-hidden="true" />}
          tone="violet"
          prefersReducedMotion={prefersReducedMotion}
        />
      </div>
    </motion.section>
  );
}

function HomeMetricCard({ icon, label, value, loading, tone = "violet", subtext, suffix = "", prefersReducedMotion }) {
  const tones = {
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  };

  return (
    <motion.article
      variants={cardStaggerItemVariants}
      custom={prefersReducedMotion}
      whileHover={prefersReducedMotion ? {} : { y: -3, transition: { duration: 0.2 } }}
      className="surface-card p-5 transition-colors duration-300 hover:shadow-lg"
    >
      <div className="flex items-center gap-4">
        <div className={cx("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tones[tone] || tones.violet)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {loading ? (
            <span className="mt-1 block h-7 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ) : (
            <p className="safe-text mt-1 text-2xl font-black text-slate-950 dark:text-white">
              {typeof value === "number" ? (
                <AnimatedNumber value={value} formatter={formatCompactNumber} suffix={suffix} />
              ) : (
                value
              )}
            </p>
          )}
          {subtext && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 truncate">
              {subtext}
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function SemesterResourceChart({ data, loading, prefersReducedMotion }) {
  const rows = normalizeSemesterDistribution(data);
  const maxTotal = Math.max(...rows.map((item) => item.total), 1);

  return (
    <motion.article
      whileHover={prefersReducedMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
      className="surface-card p-6 transition-colors duration-300 hover:shadow-xl"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
          <FiBarChart2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">
            Semester-Wise Notes Distribution
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Number of uploaded resources by engineering semester (1st through 8th).
          </p>
        </div>
      </div>

      <div className="mt-6 grid min-h-60 grid-cols-4 items-end gap-3 sm:grid-cols-8">
        {rows.map((item, index) => {
          const height = loading
            ? [40, 65, 50, 75, 55, 85, 60, 70][index]
            : Math.max((item.total / maxTotal) * 100, item.total > 0 ? 8 : 4);

          return (
            <div
              key={item.semester}
              className="group/bar relative flex h-52 flex-col justify-end gap-2"
            >
              <div className="flex h-40 items-end rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                <motion.div
                  initial={prefersReducedMotion ? false : { height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: index * 0.04 }}
                  className={cx(
                    "w-full rounded-md transition-colors duration-300",
                    loading
                      ? "animate-pulse bg-slate-300 dark:bg-slate-700"
                      : "bg-gradient-to-t from-violet-600 to-violet-400 dark:from-violet-500 dark:to-violet-300 group-hover/bar:from-violet-500 group-hover/bar:to-emerald-400",
                  )}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Sem {item.semester}
                </p>
                <p className="text-xs font-black text-slate-950 dark:text-white">
                  {loading ? "-" : <AnimatedNumber value={item.total} formatter={formatCompactNumber} />}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.article>
  );
}

function GrowthLineChart({ title, description, data, loading, icon, tone: _tone = "violet", prefersReducedMotion }) {
  const rows = Array.isArray(data) ? data : [];
  const maxTotal = Math.max(...rows.map((item) => item.total), 1);
  const points = getLineChartPoints(rows, maxTotal);
  const linePath = points.length
    ? `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")}`
    : "";
  const areaPath = points.length
    ? `${linePath} L ${points.at(-1).x} 42 L ${points[0].x} 42 Z`
    : "";
  const checkpoints = getTimelineCheckpoints(points, rows);

  return (
    <motion.article
      whileHover={prefersReducedMotion ? {} : { y: -2, transition: { duration: 0.2 } }}
      className="surface-card p-6 transition-colors duration-300 hover:shadow-xl"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[3rem_minmax(0,1fr)] gap-3">
        <div className="flex h-52 flex-col justify-between text-right text-xs font-bold text-slate-400">
          <span>{loading ? "-" : formatCompactNumber(maxTotal)}</span>
          <span>{loading ? "-" : formatCompactNumber(Math.round(maxTotal / 2))}</span>
          <span>0</span>
        </div>
        <div className="relative h-52 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 p-1 dark:border-slate-800 dark:bg-slate-900/40">
          {loading ? (
            <div className="h-full w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ) : (
            <>
              <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="growthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#growthAreaGradient)" />
                <path
                  d={linePath}
                  className="stroke-violet-600 transition-all duration-500 dark:stroke-violet-400"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {checkpoints.map((point) => (
                <span
                  key={`${title}-${point.date}`}
                  className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600 ring-4 ring-violet-200 dark:bg-violet-300 dark:ring-violet-800/40"
                  style={{ left: `${point.left}%`, top: `${point.top}%` }}
                  title={`${formatDisplayDate(point.date)}: ${formatNumber(point.total)} total`}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <div className="ml-12 mt-3 flex justify-between text-[11px] font-semibold text-slate-400">
        <span>{formatDisplayDate(rows[0]?.date)}</span>
        <span>{formatDisplayDate(rows[Math.floor(rows.length / 2)]?.date)}</span>
        <span>{formatDisplayDate(rows.at(-1)?.date)}</span>
      </div>
    </motion.article>
  );
}

function ContributorCard({ contributor, rank, onOpenProfile, prefersReducedMotion }) {
  const points = Number(contributor.resourceCount || contributor.point || contributor.points || 0);
  const isTopThree = rank <= 3;
  const initials = getContributorInitials(contributor);

  const rankBadgeStyles = {
    1: "bg-amber-400 text-slate-950 ring-2 ring-amber-300/60 font-black",
    2: "bg-slate-300 text-slate-900 ring-2 ring-slate-200 font-bold",
    3: "bg-amber-700 text-amber-100 ring-2 ring-amber-600 font-bold",
  };

  return (
    <motion.button
      type="button"
      variants={cardStaggerItemVariants}
      custom={prefersReducedMotion}
      whileHover={prefersReducedMotion ? {} : { y: -3, transition: { duration: 0.2 } }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
      onClick={() => onOpenProfile(contributor.id)}
      className={cx(
        "group flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors duration-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
        isTopThree
          ? "border-amber-300/60 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent dark:border-amber-500/30 dark:bg-amber-500/5"
          : "border-slate-200 bg-white hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-violet-500/40",
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="relative">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-sm font-black text-white ring-2 ring-white dark:bg-white dark:text-slate-950 dark:ring-slate-800">
            {contributor.profilePic ? (
              <img src={contributor.profilePic} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <span
            className={cx(
              "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
              rankBadgeStyles[rank] || "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            )}
          >
            {rank}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
            {contributor.name || "Contributor"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ID: {contributor.id || "N/A"}
          </p>
        </div>
      </div>

      <div className="text-right pl-3">
        <span className="block text-base font-black text-slate-950 dark:text-white">
          <AnimatedNumber value={Number.isFinite(points) ? points : 0} formatter={formatNumber} />
        </span>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Files
        </span>
      </div>
    </motion.button>
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

  const indexes = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    Math.round((points.length - 1) * ratio),
  );

  return [...new Set(indexes)].map((index) => ({
    ...points[index],
    date: rows[index]?.date || points[index].date,
    total: rows[index]?.total || points[index].total,
  }));
}

function formatDateRange(period) {
  if (!period?.from || !period?.to) return "Active term timeline";
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

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;

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

function getCourseActionError(error, action) {
  const status = error.response?.status;
  const apiMessage = getApiErrorMessage(error);

  if (apiMessage) return apiMessage;

  if (action === "add") {
    if (status === 409) return "This course already exists in your routine.";
    if (status === 422) return "You cannot add more than three courses in this slot.";
    if (status === 402 || status === 403 || status === 404)
      return "This class is not available for your personal routine.";
  }

  if (action === "remove") {
    if (status === 404) return "This course was not found in your routine.";
    if (status === 402 || status === 403)
      return "This class is not available in your personal routine.";
  }

  if (status === 500) return "The server could not complete the request. Please try again later.";
  return "The request could not be completed.";
}

function getApiErrorMessage(error) {
  const data = error.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  return data?.message || data?.msg || "";
}

function buildPrintableRoutine({
  title,
  subtitle,
  timeSlots,
  displayDays,
  getItemsForDay,
}) {
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
