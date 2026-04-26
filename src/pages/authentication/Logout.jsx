"use client";

import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { useAuth } from "../../App";
import Header from "../components/Header";
import { PageShell, SectionHeading } from "../components/ui";

/**
 * Standalone sign-out confirmation screen for legacy links.
 */
function Logout() {
  const navigate = useNavigate();
  const auth = useAuth();

  const handleLogout = () => {
    Cookies.remove("jwtToken");
    auth?.setIsLoggedIn?.(false);
    auth?.setUser?.(null);
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="flex items-center justify-center py-10">
        <section className="surface-card w-full max-w-lg p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
            <FiLogOut className="h-7 w-7" aria-hidden="true" />
          </div>
          <SectionHeading
            kicker="Account"
            title="Sign Out"
            description="End the current session and return to the login screen."
          />
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={handleLogout} className="btn-danger">
              <FiLogOut aria-hidden="true" />
              Sign out
            </button>
          </div>
        </section>
      </PageShell>
    </div>
  );
}

export default Logout;
