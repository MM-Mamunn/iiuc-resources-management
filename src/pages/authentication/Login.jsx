"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { FiEye, FiEyeOff, FiLock, FiLogIn, FiUser } from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
import Header from "../components/Header";
import { FormField, Notice } from "../components/ui";

/**
 * Sign-in page with accessible labels, inline errors, and session refresh.
 */
const LoginPage = () => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { refreshLoginStatus } = useAuth();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!id.trim() || !password.trim()) {
      setError("Please enter both your ID and password.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/api/login", {
        id: id.trim(),
        password,
      });
      const { jwtToken } = response.data;

      Cookies.set("jwtToken", jwtToken, { expires: 7 });
      await refreshLoginStatus();
      navigate("/homepersonal");
    } catch (loginError) {
      const message =
        loginError.response?.data ||
        loginError.message ||
        "Invalid credentials. Please try again.";
      setError(String(message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="page-wrap grid min-h-[calc(100vh-112px)] items-center py-12">
        <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 lg:grid-cols-[1fr_420px] dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/20">
          <div className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <span className="inline-flex rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-950">
                RMS
              </span>
              <h1 className="mt-8 text-4xl font-bold leading-tight">
                Your routine, resources, and courses in one place.
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Sign in to view your personal dashboard, manage courses, and keep your academic day organized.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm text-slate-300">
              <div className="rounded-lg border border-white/10 p-3">
                <p className="font-bold text-white">Fast</p>
                <p className="mt-1">Quick schedule lookup</p>
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <p className="font-bold text-white">Clear</p>
                <p className="mt-1">Readable class slots</p>
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <p className="font-bold text-white">Live</p>
                <p className="mt-1">Session-aware data</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <p className="section-kicker">Welcome back</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
                Sign in
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Use your metric ID and password to continue.
              </p>
            </div>

            {error && (
              <div className="mb-5">
                <Notice type="error" onDismiss={() => setError("")}>
                  {error}
                </Notice>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
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

              <FormField id="password" label="Password">
                <div className="relative">
                  <FiLock
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="form-field pl-12 pr-12"
                    autoComplete="current-password"
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

              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <FiLogIn aria-hidden="true" />
                    Sign in
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Need an account?{" "}
              <Link
                to="/auth/reg"
                className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
              >
                Create one
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
