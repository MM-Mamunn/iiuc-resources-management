"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import {
  FiBookOpen,
  FiEye,
  FiEyeOff,
  FiGrid,
  FiLock,
  FiShield,
  FiUser,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
import Header from "../components/Header";
import { FormField, Notice, SuggestionList, cx } from "../components/ui";
import campusImage from "../../assets/iiuc.webp";

const POPULAR_SECTIONS = ["7BM", "7BF", "5BM", "5BF", "3BM", "1BM"];

/**
 * Modern student registration portal with section suggestions and instant session initialization.
 */
const RegisterPage = () => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sectionSuggestions, setSectionSuggestions] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { refreshLoginStatus } = useAuth();

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");

    if (!id.trim() || !password.trim() || !name.trim() || !section.trim()) {
      setError("Please complete all registration fields.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/api/register/new", {
        id: id.trim().toUpperCase(),
        password,
        name: name.trim(),
        section: section.toUpperCase().trim(),
      });

      const { jwtToken } = response.data;
      Cookies.set("jwtToken", jwtToken, { expires: 7 });
      await refreshLoginStatus();
      navigate("/homepersonal");
    } catch (registerError) {
      const message =
        registerError.response?.data ||
        registerError.message ||
        "Registration failed. Please verify your student details and try again.";
      setError(String(message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSectionChange = async (event) => {
    const value = event.target.value;
    setSection(value);

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

  const canSubmit = id.trim() && name.trim() && section.trim() && password.trim();

  return (
    <div className="min-h-screen">
      <Header />

      <main className="page-wrap flex min-h-[calc(100vh-140px)] items-center justify-center py-10 sm:py-16">
        <div className="surface-card w-full max-w-5xl overflow-hidden shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200/80 transition-all duration-300 dark:ring-slate-800">
          <div className="grid lg:grid-cols-[1fr_1.2fr]">
            {/* ─── LEFT HERO BRANDING PANEL ─── */}
            <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
              <img
                src={campusImage}
                alt="IIUC Campus"
                className="absolute inset-0 h-full w-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-sky-950/70 to-slate-950" />
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-sky-600/25 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/15 px-3.5 py-1 text-xs font-bold text-sky-200 backdrop-blur-md">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-soft-pulse" />
                  <span>New Student Onboarding</span>
                </div>

                <h1 className="display-heading hero-heading-glow mt-6 text-3xl font-black text-white sm:text-4xl">
                  Connect to your section and personalize your classes.
                </h1>

                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  Join hundreds of students using RMS to track daily schedules, organize semester coursework, and access peer-shared lecture notes.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="relative z-10 mt-8 space-y-3.5">
                <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md transition hover:bg-white/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30">
                    <FiGrid className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Automated Section Link</p>
                    <p className="text-xs text-slate-400">Your section routine connects directly to your dashboard.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md transition hover:bg-white/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
                    <FiBookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Course Notes & Drives</p>
                    <p className="text-xs text-slate-400">Access curated slides, question banks, and lab manuals.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md transition hover:bg-white/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30">
                    <FiShield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Official CSE Directory</p>
                    <p className="text-xs text-slate-400">Verified student profile with role privileges.</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-8 border-t border-white/10 pt-4 text-xs text-slate-400">
                Department of Computer Science & Engineering • IIUC
              </div>
            </div>

            {/* ─── RIGHT REGISTRATION FORM ─── */}
            <div className="flex flex-col justify-between p-6 sm:p-10">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="section-kicker">Registration</span>
                    <h2 className="display-heading heading-gradient-text mt-2 text-2xl font-black sm:text-3xl">
                      Create Your Account
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      Fill in your university matriculation details to activate your student profile.
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                    <FiUserPlus className="h-6 w-6" />
                  </div>
                </div>

                {error && (
                  <div className="mt-5">
                    <Notice type="error" onDismiss={() => setError("")}>
                      {error}
                    </Notice>
                  </div>
                )}

                <form onSubmit={handleRegister} className="mt-7 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id="reg-id" label="Metric ID">
                      <div className="relative">
                        <FiUser
                          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id="reg-id"
                          type="text"
                          placeholder="e.g. C221046"
                          value={id}
                          onChange={(e) => setId(e.target.value)}
                          className="form-field pl-12 uppercase"
                          autoComplete="username"
                          disabled={isLoading}
                        />
                      </div>
                    </FormField>

                    <FormField id="reg-name" label="Full Name">
                      <div className="relative">
                        <FiUser
                          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id="reg-name"
                          type="text"
                          placeholder="e.g. Tanzim Hossain"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="form-field pl-12"
                          autoComplete="name"
                          disabled={isLoading}
                        />
                      </div>
                    </FormField>
                  </div>

                  <FormField
                    id="reg-section"
                    label="Section Code"
                    helper={sectionLoading ? "Looking for matching sections..." : "Official batch section code (e.g. 7BM, 5BF)."}
                  >
                    <div className="relative">
                      <FiUsers
                        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        id="reg-section"
                        type="text"
                        placeholder="e.g. 7BM"
                        value={section}
                        onChange={handleSectionChange}
                        className="form-field pl-12 uppercase"
                        autoComplete="off"
                        disabled={isLoading}
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

                  {/* Quick Select Section Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Quick select:
                    </span>
                    {POPULAR_SECTIONS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setSection(sec);
                          setSectionSuggestions([]);
                        }}
                        className={cx(
                          "rounded px-2 py-0.5 text-xs font-semibold transition",
                          section.toUpperCase() === sec
                            ? "bg-sky-500 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                        )}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>

                  <FormField id="reg-password" label="Password">
                    <div className="relative">
                      <FiLock
                        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-field pl-12 pr-12"
                        autoComplete="new-password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((curr) => !curr)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:text-slate-200"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={isLoading}
                      >
                        {showPassword ? <FiEyeOff className="h-4 w-4" aria-hidden="true" /> : <FiEye className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </FormField>

                  <button
                    type="submit"
                    disabled={isLoading || !canSubmit}
                    className="btn-primary mt-2 w-full shadow-lg shadow-violet-600/25"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        <span>Creating Student Profile...</span>
                      </>
                    ) : (
                      <>
                        <FiUserPlus className="h-4 w-4" aria-hidden="true" />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Footer Switcher */}
              <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <p>
                  Already registered?{" "}
                  <Link
                    to="/auth/login"
                    className="font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    Sign in to your account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
