"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import {
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiCpu,
  FiExternalLink,
  FiFolder,
  FiGrid,
  FiHome,
  FiInfo,
  FiLogIn,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiMessageSquare,
  FiMoon,
  FiRadio,
  FiShield,
  FiSun,
  FiUser,
  FiUserPlus,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";
import { useActiveSession, useAuth, useTheme, useFeatureSettings } from "../../App";
import { cx } from "./ui";

/**
 * Precision SaaS Navigation Header for IIUC RMS.
 * Balanced 56px (h-14) bar with disciplined typography, slim dimensions,
 * frictionless popover dropdowns, user profile pill, and compact announcement strip.
 */
function Header() {
  const [openMenu, setOpenMenu] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navRef = useRef(null);
  const location = useLocation();
  const { user, isLoggedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { aiFeatureEnabled } = useFeatureSettings();

  const userType = String(user?.type || "").toLowerCase();
  const isAdmin = isLoggedIn && userType === "admin";
  const isCrOrAdmin = isLoggedIn && ["cr", "admin"].includes(userType);
  const avatarUrl = user?.profilePic || user?.profilePicUrl || user?.profile_pic;
  const avatarInitials = (user?.name || user?.id || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleLabels = {
    admin: "Admin",
    cr: "Class Representative",
    student: "Student",
  };
  const accountName = user?.name || user?.id || "Student";
  const accountId = user?.id ? String(user.id) : "";
  const accountRole = roleLabels[userType] || (userType ? userType.toUpperCase() : "Student");

  const navGroups = useMemo(
    () => [
      {
        id: "routine",
        label: "Routine",
        icon: FiCalendar,
        paths: ["/routine"],
        items: [
          isLoggedIn && {
            label: "Personal Routine",
            to: "/routine/personalroutine",
            icon: FiUser,
            sub: "My customized class timetable",
          },
          {
            label: "Section Routine",
            to: "/routine/section",
            icon: FiGrid,
            sub: "Batch & section schedules",
          },
          {
            label: "Teacher Routine",
            to: "/routine/teacher",
            icon: FiUsers,
            sub: "Faculty slots & availability",
          },
        ].filter(Boolean),
      },
      {
        id: "info",
        label: "Info",
        icon: FiInfo,
        paths: ["/info", "/classroom"],
        items: [
          {
            label: "Teacher Info",
            to: "/info/teacher",
            icon: FiUsers,
            sub: "Faculty directory & designations",
          },
          {
            label: "Course Info",
            to: "/info/course",
            icon: FiBookOpen,
            sub: "Curriculum, credits & codes",
          },
          {
            label: "Section Info",
            to: "/info/section",
            icon: FiGrid,
            sub: "Advisors & enrolled sections",
          },
          {
            label: "Room Routine",
            to: "/classroom/routine",
            icon: FiMapPin,
            sub: "Vacant rooms & allocations",
          },
          {
            label: "Community",
            to: "/info/community",
            icon: FiMessageSquare,
            sub: "Student clubs & announcements",
          },
          {
            label: "Study Materials",
            to: "/info/materials",
            icon: FiFolder,
            sub: "Handouts, slides & question banks",
          },
        ],
      },
    ],
    [isLoggedIn]
  );

  const profileItems = [
    {
      label: "Profile Settings",
      to: "/edit/details",
      icon: FiUser,
      sub: "Personal info & account security",
    },
    {
      label: "Course Add / Drop",
      to: "/courseadddrop",
      icon: FiBookOpen,
      sub: "Adjust term course registration",
    },
    {
      label: "Enrolled Courses",
      to: "/showall",
      icon: FiGrid,
      sub: "View enrolled subjects & sections",
    },
  ];

  const topLinks = [
    { label: "Home", to: "/", icon: FiHome },
    isLoggedIn && { label: "Dashboard", to: "/homepersonal", icon: FiGrid },
    { label: "Resources", to: "/resources", icon: FiBookOpen },
    aiFeatureEnabled && {
      label: "AI",
      to: "/ai",
      icon: FiCpu,
      isAi: true,
    },
    isCrOrAdmin && { label: "CR Portal", to: "/CR", icon: FiUsers },
    isAdmin && { label: "Admin", to: "/admin/users", icon: FiShield },
  ].filter(Boolean);

  const isActivePath = (paths) =>
    paths.some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
    );

  const closeMenus = () => {
    setOpenMenu(null);
    setIsMobileOpen(false);
  };

  const handleLogout = () => {
    Cookies.remove("jwtToken");
    closeMenus();
    window.location.replace("/");
  };

  useEffect(() => {
    function handlePointerDown(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeMenus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-md transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-white dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <div ref={navRef} className="page-wrap">
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Brand Logo */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 rounded-lg py-1 pr-2 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            onClick={closeMenus}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xs ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-105">
              <span className="text-[11px] font-black tracking-wider">RMS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                IIUC RMS
              </span>
              <span className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400 sm:inline-block">
                Hub
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links & Dropdowns */}
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
            {topLinks.map((item) => (
              <NavItem key={item.to} item={item} onClick={closeMenus} />
            ))}

            {navGroups
              .filter((group) => !group.hidden)
              .map((group) => (
                <DesktopDropdown
                  key={group.id}
                  group={group}
                  isOpen={openMenu === group.id}
                  isActive={isActivePath(group.paths)}
                  onToggle={() =>
                    setOpenMenu((current) => (current === group.id ? null : group.id))
                  }
                  onClose={closeMenus}
                />
              ))}
          </nav>

          {/* Desktop Controls (Theme, User Profile, Guest Auth) */}
          <div className="hidden items-center gap-2 lg:flex">
            <ThemeButton theme={theme} onClick={toggleTheme} />

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            {isLoggedIn ? (
              <div className="flex items-center gap-1.5">
                <ProfileDropdown
                  label={accountName}
                  accountId={accountId}
                  role={accountRole}
                  userType={userType}
                  image={avatarUrl}
                  initials={avatarInitials}
                  items={profileItems}
                  isOpen={openMenu === "profile"}
                  isActive={isActivePath(["/edit/details", "/courseadddrop", "/showall"])}
                  onToggle={() =>
                    setOpenMenu((current) => (current === "profile" ? null : "profile"))
                  }
                  onClose={closeMenus}
                  onLogout={handleLogout}
                />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  title="Sign out"
                  aria-label="Logout"
                >
                  <FiLogOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/auth/reg"
                  onClick={closeMenus}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <FiUserPlus className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span>Register</span>
                </Link>
                <Link
                  to="/auth/login"
                  onClick={closeMenus}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <FiLogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Login</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <ThemeButton theme={theme} onClick={toggleTheme} />
            <button
              type="button"
              onClick={() => setIsMobileOpen((current) => !current)}
              className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-controls="mobile-navigation"
              aria-expanded={isMobileOpen}
              aria-label="Toggle navigation menu"
            >
              {isMobileOpen ? (
                <FiX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <FiMenu className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {isMobileOpen && (
          <div
            id="mobile-navigation"
            className="animate-enter border-t border-slate-200/80 bg-white/95 pb-5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/95 lg:hidden"
          >
            <div className="max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain px-2 py-3">
              <nav className="grid gap-3" aria-label="Mobile navigation">
                <MobileAccountPanel
                  isLoggedIn={isLoggedIn}
                  name={accountName}
                  userId={accountId}
                  role={accountRole}
                  image={avatarUrl}
                  initials={avatarInitials}
                  onClose={closeMenus}
                />

                <MobileSection title="Quick Access" icon={FiHome}>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {topLinks.map((item) => (
                      <MobileLink key={item.to} item={item} onClick={closeMenus} />
                    ))}
                  </div>
                </MobileSection>

                {navGroups
                  .filter((group) => !group.hidden)
                  .map((group) => (
                    <MobileSection key={group.id} title={group.label} icon={group.icon}>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {group.items.map((item) => (
                          <MobileLink key={item.to} item={item} onClick={closeMenus} />
                        ))}
                      </div>
                    </MobileSection>
                  ))}

                {isLoggedIn && (
                  <MobileSection title="Account & Registration" icon={FiUser}>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {profileItems.map((item) => (
                        <MobileLink key={item.to} item={item} onClick={closeMenus} />
                      ))}
                      <MobileLogoutButton onClick={handleLogout} />
                    </div>
                  </MobileSection>
                )}
              </nav>
            </div>
          </div>
        )}
      </div>

      <ContributionStrip />
    </header>
  );
}

/**
 * Desktop dropdown with compact trigger button and precision popover card.
 */
function DesktopDropdown({ group, isOpen, isActive, onToggle, onClose }) {
  const Icon = group.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cx(
          "inline-flex h-8.5 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          isActive || isOpen
            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
            : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <span>{group.label}</span>
        <FiChevronDown
          className={cx(
            "h-3 w-3 text-slate-400 transition-transform duration-200 dark:text-slate-500",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="animate-enter absolute left-0 top-full z-40 mt-1.5 w-64 rounded-xl border border-slate-200/90 bg-white/95 p-1.5 shadow-lg shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-slate-950/30"
        >
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  role="menuitem"
                  className={({ isActive: itemActive }) =>
                    cx(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                      itemActive
                        ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 font-medium"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    )
                  }
                >
                  {({ isActive: itemActive }) => (
                    <>
                      <span
                        className={cx(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                          itemActive
                            ? "bg-violet-600 text-white dark:bg-violet-500"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-slate-200"
                        )}
                      >
                        <ItemIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-none">{item.label}</p>
                        {item.sub && (
                          <p className="mt-1 line-clamp-1 text-[11px] text-slate-400 dark:text-slate-500">
                            {item.sub}
                          </p>
                        )}
                      </div>
                      <FiChevronRight
                        className={cx(
                          "h-3 w-3 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400",
                          itemActive && "text-violet-500 dark:text-violet-400"
                        )}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Authenticated user profile trigger and compact dropdown menu.
 */
function ProfileDropdown({
  label,
  accountId,
  role,
  userType,
  image,
  initials,
  items,
  isOpen,
  isActive,
  onToggle,
  onClose,
  onLogout,
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cx(
          "inline-flex h-8 items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          isActive || isOpen
            ? "border-violet-300 bg-violet-50/80 text-violet-700 dark:border-violet-600/40 dark:bg-violet-950/40 dark:text-violet-200"
            : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Avatar image={image} initials={initials} className="h-6 w-6 text-[10px]" />
        <span className="max-w-24 truncate">{label}</span>
        {userType === "admin" && (
          <span className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
            ADMIN
          </span>
        )}
        {userType === "cr" && (
          <span className="rounded bg-violet-100 px-1 py-0.2 text-[9px] font-bold text-violet-700 dark:bg-violet-950/70 dark:text-violet-300">
            CR
          </span>
        )}
        <FiChevronDown
          className={cx(
            "h-3 w-3 text-slate-400 transition-transform duration-200 dark:text-slate-500",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="animate-enter absolute right-0 top-full z-40 mt-1.5 w-60 rounded-xl border border-slate-200/90 bg-white/95 p-1.5 shadow-lg shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-slate-950/30"
        >
          {/* Identity Header */}
          <div className="flex items-center gap-2.5 rounded-lg bg-slate-50/90 p-2 dark:bg-slate-800/60">
            <Avatar image={image} initials={initials} className="h-8 w-8 text-[11px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                {label}
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {role} {accountId ? `• ${accountId}` : ""}
              </p>
            </div>
          </div>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          {/* Menu Items */}
          <div className="space-y-0.5">
            {items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  role="menuitem"
                  className={({ isActive: itemActive }) =>
                    cx(
                      "group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                      itemActive
                        ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    )
                  }
                >
                  <ItemIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="leading-none">{item.label}</p>
                  </div>
                  <FiChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                </NavLink>
              );
            })}
          </div>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          {/* Logout in Dropdown */}
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
          >
            <FiLogOut className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" aria-hidden="true" />
            <span className="flex-1 text-left">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Shared single-link navigation item with optical sizing and active indicator.
 */
function NavItem({ item, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        cx(
          "inline-flex h-8.5 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          isActive
            ? "bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white"
            : item.isAi
              ? "text-slate-700 hover:bg-violet-50/70 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
              : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
        )
      }
    >
      <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      <span>{item.label}</span>
      {item.isAi && (
        <span className="ml-0.5 inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 py-0.2 text-[9px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          <FiZap className="h-2.5 w-2.5" />
          AI
        </span>
      )}
    </NavLink>
  );
}

/**
 * Mobile account profile banner or login/register CTA.
 */
function MobileAccountPanel({
  isLoggedIn,
  name,
  userId,
  role,
  image,
  initials,
  onClose,
}) {
  if (!isLoggedIn) {
    return (
      <section className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
            <FiUserPlus className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Welcome to IIUC RMS
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sign in to manage routines & resources
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/auth/reg"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <FiUserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Register</span>
          </Link>
          <Link
            to="/auth/login"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-violet-600 text-xs font-semibold text-white hover:bg-violet-700"
          >
            <FiLogIn className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Login</span>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2.5">
        <Avatar
          image={image}
          initials={initials}
          className="h-9 w-9 text-xs"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
            {name}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-medium">{role}</span>
            {userId && (
              <>
                <span>•</span>
                <span className="font-mono text-[10px]">{userId}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileSection({ title, icon: Icon, children }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-2 flex items-center gap-1.5 px-0.5 text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <h2 className="text-[11px] font-bold uppercase tracking-wider">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function MobileLogoutButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2 rounded-lg border border-rose-200/80 bg-rose-50/60 px-2.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
    >
      <FiLogOut className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Sign Out</span>
    </button>
  );
}

function MobileLink({ item, onClick }) {
  const Icon = item.icon || FiChevronRight;

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        cx(
          "flex h-9 items-center justify-between rounded-lg px-2.5 text-xs font-medium transition-colors",
          isActive
            ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 font-semibold"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        )
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
        <span className="truncate">{item.label}</span>
        {item.isAi && (
          <span className="rounded bg-violet-100 px-1 py-0.2 text-[8px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            AI
          </span>
        )}
      </div>
      <FiChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" aria-hidden="true" />
    </NavLink>
  );
}

/**
 * Compact theme switcher icon button.
 */
function ThemeButton({ theme, onClick }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <FiSun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
      ) : (
        <FiMoon className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * Profile avatar with fallback initials.
 */
function Avatar({ image, initials, className = "" }) {
  return (
    <span
      className={cx(
        "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
        className
      )}
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

/**
 * Slim, integrated announcement & contribution ribbon.
 */
function ContributionStrip() {
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const sessionLabel = activeSessionLoading
    ? "active session"
    : activeSessionError
      ? "current"
      : `${activeSessionName || "current"}`;

  return (
    <div className="border-b border-slate-200/60 bg-slate-50/70 text-slate-600 dark:border-slate-800/60 dark:bg-slate-950/60 dark:text-slate-400">
      <div className="page-wrap overflow-hidden py-1">
        <div className="animate-marquee hover:pause-animation whitespace-nowrap text-[11px] font-medium leading-none">
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-400 animate-pulse" />
              <FiRadio className="h-3 w-3" aria-hidden="true" />
              <span>NOTE</span>
            </span>

            <span>
              Contribute to <strong className="font-semibold text-slate-800 dark:text-slate-200">{sessionLabel}</strong> routines & study materials:
            </span>

            <a
              href="https://t.me/+eMiAC0y7sMM4ZjM1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-sky-600 hover:underline dark:text-sky-400"
            >
              <span>Telegram</span>
              <FiExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
            </a>

            <a
              href="https://t.me/+LZjateG9aLA0ZWE1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-700"
            >
              <FiUsers className="h-2.5 w-2.5" aria-hidden="true" />
              <span>Join Community</span>
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

export { Header };
export default Header;
