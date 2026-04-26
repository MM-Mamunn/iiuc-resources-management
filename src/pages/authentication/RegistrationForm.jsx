"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { FiEye, FiEyeOff, FiLock, FiUser, FiUsers } from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
import Header from "../components/Header";
import { FormField, Notice, SuggestionList } from "../components/ui";

/**
 * Registration flow with section autocomplete and immediate auth refresh.
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
      setError("Please complete every field before creating your account.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/api/register/new", {
        id: id.trim(),
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
        "Registration failed. Please try again.";
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
      <main className="page-wrap grid min-h-[calc(100vh-112px)] items-center py-12">
        <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 lg:grid-cols-[420px_1fr] dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/20">
          <div className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <span className="inline-flex rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-950">
                RMS
              </span>
              <h1 className="mt-8 text-4xl font-bold leading-tight">
                Start with a clean academic dashboard.
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Create your profile, connect your section, and keep routine data within reach.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 p-4 text-sm text-slate-300">
              <p className="font-bold text-white">Section-aware setup</p>
              <p className="mt-2">
                The app uses your section to personalize routine and course management views after sign-up.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <p className="section-kicker">Create account</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
                Join RMS
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Use your university details to activate your personal dashboard.
              </p>
            </div>

            {error && (
              <div className="mb-5">
                <Notice type="error" onDismiss={() => setError("")}>
                  {error}
                </Notice>
              </div>
            )}

            <form onSubmit={handleRegister} className="grid gap-5">
              <FormField id="id" label="Metric ID">
                <div className="relative">
                  <FiUser
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="id"
                    type="text"
                    placeholder="C221046"
                    value={id}
                    onChange={(event) => setId(event.target.value)}
                    className="form-field pl-12"
                    autoComplete="username"
                    disabled={isLoading}
                  />
                </div>
              </FormField>

              <FormField id="name" label="Full name">
                <div className="relative">
                  <FiUser
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="form-field pl-12"
                    autoComplete="name"
                    disabled={isLoading}
                  />
                </div>
              </FormField>

              <FormField
                id="section"
                label="Section"
                helper={sectionLoading ? "Searching sections..." : "Use the official section code."}
              >
                <div className="relative">
                  <FiUsers
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="section"
                    type="text"
                    placeholder="7BM"
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

              <FormField id="password" label="Password">
                <div className="relative">
                  <FiLock
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="form-field pl-12 pr-12"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 rounded-md p-2 -translate-y-1/2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                  </button>
                </div>
              </FormField>

              <button type="submit" disabled={isLoading || !canSubmit} className="btn-primary w-full">
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Already registered?{" "}
              <Link
                to="/auth/login"
                className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default RegisterPage;
