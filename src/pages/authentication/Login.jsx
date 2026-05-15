"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { FiEye, FiEyeOff, FiLock, FiLogIn, FiSend, FiUser } from "react-icons/fi";
import api from "../../api";
import { useAuth } from "../../App";
import Header from "../components/Header";
import { FormField, Notice } from "../components/ui";

/**
 * Sign-in page with accessible labels, inline errors, and session refresh.
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

  const handleForgotChange = (field, value) => {
    setForgotForm((current) => ({
      ...current,
      [field]: field.toLowerCase().includes("studentid") ? value.toUpperCase() : value,
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
      setError("Please fill in all password request fields.");
      return;
    }

    if (forgotForm.studentId.trim() !== forgotForm.confirmStudentId.trim()) {
      setError("Student ID and confirmation ID must match.");
      return;
    }

    if (forgotForm.newPassword !== forgotForm.confirmNewPassword) {
      setError("New password and confirmation password must match.");
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
          "Message sent successfully. Please wait for admin approval or contact admin.",
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
              <p className="section-kicker">{mode === "login" ? "Welcome back" : "Account recovery"}</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
                {mode === "login" ? "Sign in" : "Forget password"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {mode === "login"
                  ? "Use your metric ID and password to continue."
                  : "Submit a password change request for admin approval."}
              </p>
            </div>

            {success && (
              <div className="mb-5">
                <Notice type="success" onDismiss={() => setSuccess("")}>
                  {success}
                </Notice>
              </div>
            )}

            {error && (
              <div className="mb-5">
                <Notice type="error" onDismiss={() => setError("")}>
                  {error}
                </Notice>
              </div>
            )}

            {mode === "login" ? (
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
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggleShow={() => setShowPassword((current) => !current)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                </FormField>

                <button
                  type="button"
                  onClick={showForgotFlow}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Forget password?
                </button>

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
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-5">
                <FormField id="forgot-student-id" label="Student ID">
                  <div className="relative">
                    <FiUser
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="forgot-student-id"
                      type="text"
                      placeholder="C221046"
                      value={forgotForm.studentId}
                      onChange={(event) => handleForgotChange("studentId", event.target.value)}
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
                    onChange={(event) => handleForgotChange("confirmStudentId", event.target.value)}
                    className="form-field uppercase"
                    autoComplete="off"
                    disabled={forgotSubmitting}
                  />
                </FormField>

                <FormField id="forgot-new-password" label="New password">
                  <PasswordInput
                    id="forgot-new-password"
                    value={forgotForm.newPassword}
                    onChange={(value) => handleForgotChange("newPassword", value)}
                    show={showForgotPassword}
                    onToggleShow={() => setShowForgotPassword((current) => !current)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    disabled={forgotSubmitting}
                  />
                </FormField>

                <FormField id="confirm-new-password" label="Confirm new password">
                  <input
                    id="confirm-new-password"
                    type={showForgotPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={forgotForm.confirmNewPassword}
                    onChange={(event) => handleForgotChange("confirmNewPassword", event.target.value)}
                    className="form-field"
                    autoComplete="new-password"
                    disabled={forgotSubmitting}
                  />
                </FormField>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={showLoginFlow} className="btn-secondary" disabled={forgotSubmitting}>
                    Back to sign in
                  </button>
                  <button type="submit" disabled={forgotSubmitting} className="btn-primary">
                    {forgotSubmitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend aria-hidden="true" />
                        Send request
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {mode === "login" && (
              <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                Need an account?{" "}
                <Link
                  to="/auth/reg"
                  className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Create one
                </Link>
              </p>
            )}
          </div>
        </section>
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
        className="absolute right-3 top-1/2 rounded-md p-2 -translate-y-1/2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label={show ? "Hide password" : "Show password"}
        disabled={disabled}
      >
        {show ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
      </button>
    </div>
  );
}

function getForgotPasswordError(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.status === 404) return "Student ID was not found.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.message || "Could not send password change request.";
}

export default LoginPage;
