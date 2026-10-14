"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import {
  FiClock,
  FiEye,
  FiEyeOff,
  FiGrid,
  FiKey,
  FiLock,
  FiLogIn,
  FiSend,
  FiShield,
  FiUser,
} from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
import Header from "../components/Header";
import { FormField, Notice } from "../components/ui";
import campusImage from "../../assets/iiuc.webp";

/**
 * Modern, elevated student and faculty sign-in & password recovery portal.
 */
const LoginPage = () => {
  const [mode, setMode] = useState("login");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forgotForm, setForgotForm] = useState({
    studentId: "",
    confirmStudentId: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const navigate = useNavigate();
  const { refreshLoginStatus } = useAuth();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!id.trim() || !password.trim()) {
      setError("Please enter both your Metric ID and password.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/api/login", {
        id: id.trim().toUpperCase(),
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
        "Invalid credentials. Please verify your ID and password.";
      setError(String(message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotChange = (field, value) => {
    setForgotForm((current) => ({
      ...current,
      [field]: field.toLowerCase().includes("studentid")
        ? value.toUpperCase()
        : value,
    }));
    setError("");
    setSuccess("");
  };

  const showForgotFlow = () => {
    setMode("forgot");
    setError("");
    setSuccess("");
  };

  const showLoginFlow = () => {
    setMode("login");
    setError("");
    setSuccess("");
  };

  const handleForgotSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !forgotForm.studentId.trim() ||
      !forgotForm.confirmStudentId.trim() ||
      !forgotForm.newPassword ||
      !forgotForm.confirmNewPassword
    ) {
      setError("Please complete all password recovery fields.");
      return;
    }

    if (forgotForm.studentId.trim() !== forgotForm.confirmStudentId.trim()) {
      setError("Student ID and Confirmation ID do not match.");
      return;
    }

    if (forgotForm.newPassword !== forgotForm.confirmNewPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    setForgotSubmitting(true);
    try {
      const response = await api.post("/api/submissions/password-change", {
        studentId: forgotForm.studentId.trim(),
        confirmStudentId: forgotForm.confirmStudentId.trim(),
        newPassword: forgotForm.newPassword,
        confirmNewPassword: forgotForm.confirmNewPassword,
      });

      setForgotForm({
        studentId: "",
        confirmStudentId: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setSuccess(
        response.data?.message ||
          "Password change request submitted successfully. Please await admin review.",
      );
    } catch (forgotError) {
      setError(getForgotPasswordError(forgotError));
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="page-wrap flex min-h-[calc(100vh-140px)] items-center justify-center py-10 sm:py-16">
        <div className="surface-card w-full max-w-5xl overflow-hidden shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200/80 transition-all duration-300 dark:ring-slate-800">
          <div className="grid lg:grid-cols-[1.15fr_1fr]">
            {/* ─── LEFT HERO BRANDING PANEL ─── */}
            <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
              <img
                src={campusImage}
                alt="IIUC Campus"
                className="absolute inset-0 h-full w-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-violet-950/70 to-slate-950" />
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-violet-600/25 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-emerald-600/20 blur-3xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-3.5 py-1 text-xs font-bold text-violet-200 backdrop-blur-md">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-soft-pulse" />
                  <span>IIUC CSE Student & Faculty Portal</span>
                </div>

                <h1 className="display-heading hero-heading-glow mt-6 text-3xl font-black text-white sm:text-4xl">
                  Your academic routine & course materials, all in one place.
                </h1>

                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  Sign in to access your personal timetable, manage course add/drops, rate study materials, and access Class Representative tools.
                </p>
              </div>

              {/* Value Highlight Cards */}
              <div className="relative z-10 mt-8 space-y-3">
                <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md transition hover:bg-white/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30">
                    <FiClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Live Class Schedules</p>
                    <p className="text-xs text-slate-400">Timetable slots, rooms, and teacher assignments.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md transition hover:bg-white/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
                    <FiGrid className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Course Add & Drop</p>
                    <p className="text-xs text-slate-400">Build and customize your own semester routine.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md transition hover:bg-white/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30">
                    <FiShield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Verified University Access</p>
                    <p className="text-xs text-slate-400">Role-aware access for students, CRs, and faculty.</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-8 border-t border-white/10 pt-4 text-xs text-slate-400">
                Department of Computer Science & Engineering • IIUC
              </div>
            </div>

            {/* ─── RIGHT INTERACTIVE AUTH FORM ─── */}
            <div className="flex flex-col justify-between p-6 sm:p-10">
              <div>
                {/* Header status kicker and title */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="section-kicker">
                      {mode === "login" ? "Account Access" : "Account Recovery"}
                    </span>
                    <h2 className="display-heading heading-gradient-text mt-2 text-2xl font-black sm:text-3xl">
                      {mode === "login" ? "Sign in to RMS" : "Reset Password"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {mode === "login"
                        ? "Enter your university metric ID and password."
                        : "Submit a verified change request for administrative review."}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20">
                    {mode === "login" ? <FiKey className="h-6 w-6" /> : <FiSend className="h-6 w-6" />}
                  </div>
                </div>

                {/* Notifications */}
                {success && (
                  <div className="mt-5">
                    <Notice type="success" onDismiss={() => setSuccess("")}>
                      {success}
                    </Notice>
                  </div>
                )}

                {error && (
                  <div className="mt-5">
                    <Notice type="error" onDismiss={() => setError("")}>
                      {error}
                    </Notice>
                  </div>
                )}

                {/* ─── LOGIN FORM ─── */}
                {mode === "login" ? (
                  <form onSubmit={handleLogin} className="mt-8 space-y-5">
                    <FormField id="student-id" label="Metric ID">
                      <div className="relative">
                        <FiUser
                          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id="student-id"
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

                    <FormField id="student-password" label="Password">
                      <PasswordInput
                        id="student-password"
                        value={password}
                        onChange={setPassword}
                        show={showPassword}
                        onToggleShow={() => setShowPassword((current) => !current)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={isLoading}
                      />
                    </FormField>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={showForgotFlow}
                        className="text-xs font-semibold text-violet-600 transition hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full shadow-lg shadow-violet-600/25"
                    >
                      {isLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          <span>Verifying session...</span>
                        </>
                      ) : (
                        <>
                          <FiLogIn className="h-4 w-4" aria-hidden="true" />
                          <span>Sign In</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* ─── FORGOT PASSWORD FORM ─── */
                  <form onSubmit={handleForgotSubmit} className="mt-8 space-y-4">
                    <FormField id="forgot-student-id" label="Student ID">
                      <div className="relative">
                        <FiUser
                          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id="forgot-student-id"
                          type="text"
                          placeholder="e.g. C221046"
                          value={forgotForm.studentId}
                          onChange={(e) => handleForgotChange("studentId", e.target.value)}
                          className="form-field pl-12 uppercase"
                          autoComplete="username"
                          disabled={forgotSubmitting}
                        />
                      </div>
                    </FormField>

                    <FormField id="confirm-student-id" label="Confirm Student ID">
                      <input
                        id="confirm-student-id"
                        type="text"
                        placeholder="Re-enter student ID"
                        value={forgotForm.confirmStudentId}
                        onChange={(e) => handleForgotChange("confirmStudentId", e.target.value)}
                        className="form-field uppercase"
                        autoComplete="off"
                        disabled={forgotSubmitting}
                      />
                    </FormField>

                    <FormField id="forgot-new-password" label="Desired New Password">
                      <PasswordInput
                        id="forgot-new-password"
                        value={forgotForm.newPassword}
                        onChange={(value) => handleForgotChange("newPassword", value)}
                        show={showForgotPassword}
                        onToggleShow={() => setShowForgotPassword((current) => !current)}
                        placeholder="Create new password"
                        autoComplete="new-password"
                        disabled={forgotSubmitting}
                      />
                    </FormField>

                    <FormField id="confirm-new-password" label="Confirm New Password">
                      <input
                        id="confirm-new-password"
                        type={showForgotPassword ? "text" : "password"}
                        placeholder="Re-enter new password"
                        value={forgotForm.confirmNewPassword}
                        onChange={(e) => handleForgotChange("confirmNewPassword", e.target.value)}
                        className="form-field"
                        autoComplete="new-password"
                        disabled={forgotSubmitting}
                      />
                    </FormField>

                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                      <button
                        type="button"
                        onClick={showLoginFlow}
                        className="btn-secondary"
                        disabled={forgotSubmitting}
                      >
                        Back to sign in
                      </button>
                      <button
                        type="submit"
                        disabled={forgotSubmitting}
                        className="btn-primary"
                      >
                        {forgotSubmitting ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <FiSend className="h-4 w-4" aria-hidden="true" />
                            <span>Submit Request</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Footer Switcher */}
              <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                {mode === "login" ? (
                  <p>
                    Don't have an account?{" "}
                    <Link
                      to="/auth/reg"
                      className="font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                    >
                      Create one here
                    </Link>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={showLoginFlow}
                    className="font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    Return to sign in
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  autoComplete,
  disabled,
}) {
  return (
    <div className="relative">
      <FiLock
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="form-field pl-12 pr-12"
        autoComplete={autoComplete}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:text-slate-200"
        aria-label={show ? "Hide password" : "Show password"}
        disabled={disabled}
      >
        {show ? <FiEyeOff className="h-4 w-4" aria-hidden="true" /> : <FiEye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

function getForgotPasswordError(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.status === 404) return "Student ID was not found.";
  if (error.request) return "Network error: unable to connect to server.";
  return error.message || "Could not submit password change request.";
}

export default LoginPage;
