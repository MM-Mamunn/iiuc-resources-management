"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import {
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiGrid,
  FiHome,
  FiInfo,
  FiLogIn,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiSend,
  FiSettings,
  FiShield,
  FiSun,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useActiveSession, useAuth, useTheme } from "../../App";
import { cx } from "./ui";

/**
 * Central navigation for every route.
 * It owns responsive menus, active route state, theme switching, and auth actions.
 */
function Header() {
  const [openMenu, setOpenMenu] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navRef = useRef(null);
  const location = useLocation();
  const { user, isLoggedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
          },
          { label: "Section Routine", to: "/routine/section", icon: FiGrid },
          { label: "Teacher Routine", to: "/routine/teacher", icon: FiUsers },
        ].filter(Boolean),
      },
      {
        id: "manage",
        label: "Manage",
        icon: FiSettings,
        hidden: !isLoggedIn,
        paths: ["/courseadddrop", "/showall"],
        items: [
          { label: "Add or Drop", to: "/courseadddrop", icon: FiBookOpen },
          { label: "My Courses", to: "/showall", icon: FiGrid },
        ],
      },
      {
        id: "rooms",
        label: "Rooms",
        icon: FiGrid,
        paths: ["/classroom"],
        items: [
          { label: "Room Routine", to: "/classroom/routine", icon: FiGrid },
        ],
      },
      {
        id: "info",
        label: "Info",
        icon: FiInfo,
        paths: ["/info"],
        items: [
          { label: "Teacher Info", to: "/info/teacher", icon: FiUsers },
          { label: "Course Info", to: "/info/course", icon: FiBookOpen },
          { label: "Section Info", to: "/info/section", icon: FiGrid },
          { label: "Study Materials", to: "/info/materials", icon: FiBookOpen },
          { label: "Bus Schedule", to: "/info/bus", icon: FiCalendar },
          { label: "Contributors", to: "/info/contributor", icon: FiUsers },
        ],
      },
    ],
    [isLoggedIn]
  );

  const topLinks = [
    { label: "Home", to: "/", icon: FiHome },
    isLoggedIn && { label: "Dashboard", to: "/homepersonal", icon: FiGrid },
    isCrOrAdmin && { label: "CR", to: "/CR", icon: FiUsers },
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/88 text-slate-900 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/86 dark:text-white">
      <div ref={navRef} className="page-wrap">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className="group inline-flex items-center gap-3 rounded-lg py-2 pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={closeMenus}
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-950 shadow-md ring-1 ring-white/20 transition group-hover:-translate-y-0.5 dark:bg-slate-900 dark:ring-slate-700">
              <span className="absolute inset-0 bg-gradient-to-br from-blue-600 via-teal-500 to-amber-400" />
              <span className="absolute left-2 top-2 h-6 w-5 rounded-md bg-white/20 ring-1 ring-white/30" />
              <span className="absolute right-2 bottom-2 h-6 w-5 rounded-md bg-slate-950/25 ring-1 ring-white/25" />
              <span className="relative text-[11px] font-black tracking-normal text-white drop-shadow-sm">
                RMS
              </span>
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-black text-slate-950 dark:text-white">
                IIUC RMS
              </span>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Resources Management
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
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

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeButton theme={theme} onClick={toggleTheme} />
            {isLoggedIn ? (
              <>
                <Link
                  to="/edit/details"
                  onClick={closeMenus}
                  className="inline-flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Avatar image={avatarUrl} initials={avatarInitials} />
                  <span className="max-w-32 truncate">{user?.name || user?.id || "Profile"}</span>
                </Link>
                <button type="button" onClick={handleLogout} className="btn-secondary">
                  <FiLogOut aria-hidden="true" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/reg" onClick={closeMenus} className="btn-secondary">
                  Register
                </Link>
                <Link to="/auth/login" onClick={closeMenus} className="btn-primary">
                  <FiLogIn aria-hidden="true" />
                  Login
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeButton theme={theme} onClick={toggleTheme} />
            <button
              type="button"
              onClick={() => setIsMobileOpen((current) => !current)}
              className="btn-secondary px-3"
              aria-controls="mobile-navigation"
              aria-expanded={isMobileOpen}
              aria-label="Toggle navigation"
            >
              {isMobileOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
            </button>
          </div>
        </div>

        {isMobileOpen && (
          <div
            id="mobile-navigation"
            className="lg:hidden animate-enter border-t border-slate-200 py-4 dark:border-slate-800"
          >
            <nav className="grid gap-4" aria-label="Mobile navigation">
              <div className="grid gap-2">
                {topLinks.map((item) => (
                  <MobileLink key={item.to} item={item} onClick={closeMenus} />
                ))}
              </div>

              {navGroups
                .filter((group) => !group.hidden)
                .map((group) => (
                  <div key={group.id}>
                    <p className="mb-2 px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {group.label}
                    </p>
                    <div className="grid gap-1">
                      {group.items.map((item) => (
                        <MobileLink key={item.to} item={item} onClick={closeMenus} />
                      ))}
                    </div>
                  </div>
                ))}

              <div className="grid gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                {isLoggedIn ? (
                  <>
                    <MobileLink
                      item={{ label: user?.name || user?.id || "Profile", to: "/edit/details", icon: FiUser }}
                      onClick={closeMenus}
                    />
                    <button type="button" onClick={handleLogout} className="btn-danger justify-start">
                      <FiLogOut aria-hidden="true" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <MobileLink item={{ label: "Register", to: "/auth/reg", icon: FiUser }} onClick={closeMenus} />
                    <Link to="/auth/login" onClick={closeMenus} className="btn-primary justify-start">
                      <FiLogIn aria-hidden="true" />
                      Login
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>

      <ContributionStrip />
    </header>
  );
}

/**
 * Desktop dropdown with active route styling and accessible menu semantics.
 */
function DesktopDropdown({ group, isOpen, isActive, onToggle, onClose }) {
  const Icon = group.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cx(
          "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          isActive
            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Icon aria-hidden="true" />
        {group.label}
        <FiChevronDown
          className={cx("transition", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-2 w-56 animate-enter rounded-lg border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        >
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
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    itemActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  )
                }
              >
                <ItemIcon aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Shared single-link navigation item.
 */
function NavItem({ item, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        cx(
          "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          isActive
            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
        )
      }
    >
      <Icon aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

/**
 * Mobile nav link with icon support and large touch target.
 */
function MobileLink({ item, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        cx(
          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          isActive
            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
        )
      }
    >
      <Icon aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

/**
 * Theme switcher icon button.
 */
function ThemeButton({ theme, onClick }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-secondary px-3"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
    >
      {isDark ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
    </button>
  );
}

/**
 * Profile avatar with image fallback.
 */
function Avatar({ image, initials }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

/**
 * Small announcement strip kept separate from the main nav for readability.
 */
function ContributionStrip() {
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const sessionLabel = activeSessionLoading
    ? "the active session"
    : activeSessionError
      ? "current routines"
      : `${activeSessionName || "current"} routines`;

  return (
    <div className="border-t border-slate-200 bg-slate-950 text-white dark:border-slate-800">
      <div className="page-wrap overflow-hidden py-2">
        <div className="animate-marquee hover:pause-animation whitespace-nowrap text-sm">
          <span className="inline-flex items-center gap-3">
            <FiSend className="text-teal-300" aria-hidden="true" />
            Want to contribute to {sessionLabel} or resources?
            <a
              href="https://t.me/+eMiAC0y7sMM4ZjM1"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-teal-200 underline-offset-4 hover:underline"
            >
              Contributor Telegram
            </a>
            <a
              href="https://t.me/+LZjateG9aLA0ZWE1"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white px-3 py-1 font-semibold text-slate-950 transition hover:bg-teal-100"
            >
              Join Community
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

export { Header };
export default Header;
