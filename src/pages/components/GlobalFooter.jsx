"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogIn, FiMessageSquare, FiSend, FiX } from "react-icons/fi";
import api from "../../api";
import { FormField, Notice, SectionHeading } from "./ui";

const MAX_FEEDBACK_LENGTH = 200;

function GlobalFooter({ isLoggedIn, authReady = true }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const closeModal = () => {
    setOpen(false);
    setNotice(null);
    setSubmitting(false);
  };

  const handleFeedbackSubmit = async (event) => {
    event.preventDefault();
    const description = feedback.trim();

    if (!description) {
      setNotice({ type: "error", text: "Feedback description is required." });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      await api.post("/api/submissions", {
        type: "Feedback",
        description,
      });
      setFeedback("");
      setNotice({ type: "success", text: "Your feedback was sent." });
    } catch (feedbackError) {
      setNotice({ type: "error", text: getFeedbackError(feedbackError) });
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = () => {
    closeModal();
    navigate("/auth/login");
  };

  return (
    <>
      <footer className="border-t border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950">
        <div className="page-wrap flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              IIUC CSE Resources Management System
            </p>
            <p className="mt-1">Built for clearer academic planning and faster routine access.</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!authReady}
            className="btn-secondary w-fit"
          >
            <FiMessageSquare aria-hidden="true" />
            Feedback
          </button>
        </div>
      </footer>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <section className="surface-card w-full max-w-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <SectionHeading
                kicker="Feedback"
                title={isLoggedIn ? "Send Feedback" : "Login Required"}
                description={
                  isLoggedIn
                    ? "Share a quick note with the admin team."
                    : "Please log in first so your feedback can be linked to your student account."
                }
              />
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary px-3"
                aria-label="Close feedback popup"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>

            {notice && (
              <Notice type={notice.type} onDismiss={() => setNotice(null)}>
                {notice.text}
              </Notice>
            )}

            {isLoggedIn ? (
              <form onSubmit={handleFeedbackSubmit} className="mt-6 grid gap-5">
                <FormField
                  id="global-feedback-description"
                  label="Feedback"
                  helper={`${feedback.length}/${MAX_FEEDBACK_LENGTH} characters`}
                >
                  <textarea
                    id="global-feedback-description"
                    value={feedback}
                    onChange={(event) =>
                      setFeedback(event.target.value.slice(0, MAX_FEEDBACK_LENGTH))
                    }
                    maxLength={MAX_FEEDBACK_LENGTH}
                    className="form-field min-h-32 resize-y"
                    placeholder="Write your feedback..."
                    required
                    autoFocus
                  />
                </FormField>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    <FiSend aria-hidden="true" />
                    {submitting ? "Sending..." : "Submit"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Not now
                </button>
                <button type="button" onClick={goToLogin} className="btn-primary">
                  <FiLogIn aria-hidden="true" />
                  Login first
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function getFeedbackError(error) {
  const status = error.response?.status;
  if (status === 400) return error.response?.data?.message || "Please check your feedback.";
  if (status === 401 || status === 403) return "Please log in before sending feedback.";
  if (status === 500) return "Internal server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not send feedback.";
}

export default GlobalFooter;
