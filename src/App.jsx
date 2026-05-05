"use client";

import {
  Suspense,
  createContext,
  lazy,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Cookies from "js-cookie";
import { FiAlertTriangle, FiLoader } from "react-icons/fi";
import api from "./api";
import { fetchActiveSession } from "./services/sessionService";

const Home = lazy(() => import("./pages/home"));
const LoggedHome = lazy(() => import("./pages/personal/LoggedHome"));
const LoginPage = lazy(() => import("./pages/authentication/Login"));
const RegistrationForm = lazy(() => import("./pages/authentication/RegistrationForm"));
const CourseAddDrop = lazy(() => import("./pages/personal/CourseAddDrop"));
const PersonalRoutine = lazy(() => import("./pages/personal/PersonalRoutine"));
const HomePersonal = lazy(() => import("./pages/personal/HomePersonal"));
const ShowAllCourse = lazy(() => import("./pages/personal/ShowAllCourse"));
const EditDetails = lazy(() => import("./pages/personal/EditDetails"));
const Fullroutine = lazy(() => import("./pages/teacher/Fullroutine"));
const TeacherInfo = lazy(() => import("./pages/info/TeacherInfo"));
const CourseInfo = lazy(() => import("./pages/info/CourseInfo"));
const SectionInfo = lazy(() => import("./pages/info/SectionInfo"));
const Contributor = lazy(() => import("./pages/info/Contributor"));
const BusSchedule = lazy(() => import("./pages/info/BusSchedule"));
const CR = lazy(() => import("./pages/CR/CR"));
const CrRoutine = lazy(() => import("./pages/CR/CrRoutine"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles"));
const SectionRoutine = lazy(() => import("./pages/SectionRoutine"));
const Semester = lazy(() => import("./pages/info/StudyMaterials"));
const ClassroomRoutine = lazy(() => import("./pages/room/ClassroomRoutine"));

const AuthContext = createContext(null);
const ThemeContext = createContext(null);
const SessionContext = createContext(null);

/**
 * Returns the authenticated user state shared by pages and navigation.
 */
export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Returns theme state and a toggle handler.
 */
export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Returns the active academic session loaded once from the backend.
 */
export function useActiveSession() {
  return useContext(SessionContext);
}

/**
 * Loads and caches the currently active committee/session.
 */
function SessionProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);
  const [loadingActiveSession, setLoadingActiveSession] = useState(true);
  const [activeSessionError, setActiveSessionError] = useState(null);

  const loadActiveSession = useCallback(async () => {
    setLoadingActiveSession(true);
    setActiveSessionError(null);

    try {
      const sessionData = await fetchActiveSession();
      setActiveSession(sessionData);
    } catch (error) {
      setActiveSession(null);
      setActiveSessionError(
        error.response?.data?.msg || "Active session could not be loaded.",
      );
    } finally {
      setLoadingActiveSession(false);
    }
  }, []);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  return (
    <SessionContext.Provider
      value={{
        activeSession,
        activeSessionName: activeSession?.session || "",
        activeSessionLoading: loadingActiveSession,
        activeSessionError,
        refreshActiveSession: loadActiveSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Loads the persisted session once and exposes helpers for auth refreshes.
 */
function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState(null);

  async function checkLoginStatus() {
    const token = Cookies.get("jwtToken");

    if (!token) {
      setIsLoggedIn(false);
      setUser(null);
      setLoadingAuth(false);
      return;
    }

    try {
      const response = await api.get("/api/user/profile");
      const userData = response.data?.[0] ?? null;
      setIsLoggedIn(Boolean(userData));
      setUser(userData);
    } catch {
      Cookies.remove("jwtToken");
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  }

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const refreshLoginStatus = async () => {
    setLoadingAuth(true);
    await checkLoginStatus();
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        loadingAuth,
        refreshLoginStatus,
        user,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Persists light/dark preference and mirrors it onto the document root.
 */
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Guards private pages while keeping public information pages reachable.
 */
function AppRoutes() {
  const { isLoggedIn, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <AppLoading label="Checking your session..." />;
  }

  return (
    <Suspense fallback={<AppLoading label="Preparing the interface..." />}>
      <Routes>
        <Route
          path="/auth/login"
          element={
            isLoggedIn ? <Navigate to="/homepersonal" replace /> : <LoginPage />
          }
        />
        <Route
          path="/auth/reg"
          element={
            isLoggedIn ? <Navigate to="/homepersonal" replace /> : <RegistrationForm />
          }
        />
        <Route
          path="/edit/details"
          element={isLoggedIn ? <EditDetails /> : <Navigate to="/auth/login" replace />}
        />
        <Route
          path="/home"
          element={isLoggedIn ? <LoggedHome /> : <Navigate to="/auth/login" replace />}
        />
        <Route
          path="/"
          element={<Home />}
        />
        <Route
          path="/homepersonal"
          element={isLoggedIn ? <HomePersonal /> : <Navigate to="/auth/login" replace />}
        />
        <Route
          path="/courseadddrop"
          element={isLoggedIn ? <CourseAddDrop /> : <Navigate to="/auth/login" replace />}
        />
        <Route
          path="/showall"
          element={isLoggedIn ? <ShowAllCourse /> : <Navigate to="/auth/login" replace />}
        />
        <Route
          path="/CR"
          element={isLoggedIn ? <CR /> : <Navigate to="/auth/login" replace />}
        />
        <Route
          path="/CR/routine"
          element={isLoggedIn ? <CrRoutine /> : <Navigate to="/auth/login" replace />}
        />
        <Route
          path="/admin/users"
          element={isLoggedIn ? <AdminRoles /> : <Navigate to="/auth/login" replace />}
        />
        <Route path="/routine/section" element={<SectionRoutine />} />
        <Route path="/routine/teacher" element={<Fullroutine />} />
        <Route path="/classroom/routine" element={<ClassroomRoutine />} />
        <Route path="/info/teacher" element={<TeacherInfo />} />
        <Route
          path="/info/course"
          element={isLoggedIn ? <CourseInfo /> : <Navigate to="/auth/login" replace />}
        />
        <Route path="/info/section" element={<SectionInfo />} />
        <Route path="/info/contributor" element={<Contributor />} />
        <Route
          path="/info/materials"
          element={isLoggedIn ? <Semester /> : <Navigate to="/auth/login" replace />}
        />
        <Route path="/info/bus" element={<BusSchedule />} />
        <Route
          path="/routine/personalroutine"
          element={isLoggedIn ? <PersonalRoutine /> : <Navigate to="/auth/login" replace />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

/**
 * App-wide loading panel used for auth and lazy route loading.
 */
function AppLoading({ label }) {
  return (
    <main className="app-root flex min-h-screen items-center justify-center px-4">
      <div className="surface-card flex items-center gap-3 px-6 py-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <FiLoader className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-300" aria-hidden="true" />
        {label}
      </div>
    </main>
  );
}

/**
 * Modern fallback for unknown routes.
 */
function NotFound() {
  return (
    <main className="app-root flex min-h-screen items-center justify-center px-4">
      <section className="surface-card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
          <FiAlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          The route you opened does not exist or has moved.
        </p>
      </section>
    </main>
  );
}

/**
 * Application composition with theme, router, and auth providers.
 */
function App() {
  return (
    <ThemeProvider>
      <div className="app-root text-slate-900 dark:text-slate-100">
        <BrowserRouter>
          <SessionProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </SessionProvider>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
