"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import {
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiGrid,
  FiHome,
  FiInfo,
  FiLogIn,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiSend,
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
          },
          { label: "Section Routine", to: "/routine/section", icon: FiGrid },
          { label: "Teacher Routine", to: "/routine/teacher", icon: FiUsers },
        ].filter(Boolean),
      },
      {
        id: "info",
        label: "Info",
        icon: FiInfo,
        paths: ["/info", "/classroom"],
        items: [
          { label: "Teacher Info", to: "/info/teacher", icon: FiUsers },
          { label: "Course Info", to: "/info/course", icon: FiBookOpen },
          { label: "Section Info", to: "/info/section", icon: FiGrid },
          { label: "Room Routine", to: "/classroom/routine", icon: FiGrid },
          { label: "Community", to: "/info/community", icon: FiUsers },
          { label: "Study Materials", to: "/info/materials", icon: FiBookOpen },
        ],
      },
    ],
    [isLoggedIn]
  );

  const profileItems = [
    { label: "Profile", to: "/edit/details", icon: FiUser },
    { label: "Add or Drop", to: "/courseadddrop", icon: FiBookOpen },
    { label: "My Courses", to: "/showall", icon: FiGrid },
  ];

  const topLinks = [
    { label: "Home", to: "/", icon: FiHome },
    isLoggedIn && { label: "Dashboard", to: "/homepersonal", icon: FiGrid },
    { label: "Resources", to: "/resources", icon: FiBookOpen },
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
                <ProfileDropdown
                  label={user?.name || user?.id || "Profile"}
                  image={avatarUrl}
                  initials={avatarInitials}
                  items={profileItems}
                  isOpen={openMenu === "profile"}
                  isActive={isActivePath(["/edit/details", "/courseadddrop", "/showall"])}
                  onToggle={() =>
                    setOpenMenu((current) => (current === "profile" ? null : "profile"))
                  }
                  onClose={closeMenus}
                />
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
            className="lg:hidden animate-enter border-t border-slate-200 bg-slate-50/95 dark:border-slate-800 dark:bg-slate-950/95"
          >
            <div className="-mx-1 max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain px-1 py-4">
              <nav className="grid gap-3 pb-2" aria-label="Mobile navigation">
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    {topLinks.map((item) => (
                      <MobileLink key={item.to} item={item} onClick={closeMenus} />
                    ))}
                  </div>
                </MobileSection>

                {navGroups
                  .filter((group) => !group.hidden)
                  .map((group) => (
                    <MobileSection key={group.id} title={group.label} icon={group.icon}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.items.map((item) => (
                          <MobileLink key={item.to} item={item} onClick={closeMenus} />
                        ))}
                      </div>
                    </MobileSection>
                  ))}

                {isLoggedIn && (
                  <MobileSection title="Account" icon={FiUser}>
                    <div className="grid gap-2 sm:grid-cols-2">
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
 * Authenticated profile menu that owns account and course-management actions.
 */
function ProfileDropdown({
  label,
  image,
  initials,
  items,
  isOpen,
  isActive,
  onToggle,
  onClose,
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cx(
          "inline-flex min-h-11 items-center gap-3 rounded-lg border px-2 py-1 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          isActive
            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Avatar image={image} initials={initials} />
        <span className="max-w-32 truncate">{label}</span>
        <FiChevronDown
          className={cx("transition", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 animate-enter rounded-lg border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        >
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
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
            <FiUser className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-950 dark:text-white">
              Welcome
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Login or create an account
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to="/auth/reg" onClick={onClose} className="btn-secondary w-full px-3">
            Register
          </Link>
          <Link to="/auth/login" onClick={onClose} className="btn-primary w-full px-3">
            <FiLogIn aria-hidden="true" />
            Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <Avatar
          image={image}
          initials={initials}
          className="h-12 w-12 bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-100 dark:ring-blue-500/30"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-slate-950 dark:text-white">
            {name}
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{role}</span>
            {userId && (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="truncate">{userId}</span>
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
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
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
      className="group flex min-h-14 min-w-0 items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-left text-sm font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-500/20">
        <FiLogOut className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate">Logout</span>
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
          "group flex min-h-14 min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          isActive
            ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm shadow-blue-600/5 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
            : "border-transparent bg-slate-50/70 text-slate-700 hover:border-slate-200 hover:bg-white hover:text-slate-950 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition",
              isActive
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-white text-slate-500 ring-1 ring-slate-200 group-hover:text-blue-600 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:group-hover:text-blue-200"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <FiChevronRight
            className={cx(
              "h-4 w-4 shrink-0 transition",
              isActive
                ? "text-blue-500 dark:text-blue-200"
                : "text-slate-400 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
            )}
            aria-hidden="true"
          />
        </>
      )}
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
function Avatar({ image, initials, className = "" }) {
  return (
    <span
      className={cx(
        "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700",
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
