import { useMemo, useState } from "react";
import {
  FiAward,
  FiExternalLink,
  FiGlobe,
  FiInfo,
  FiX,
} from "react-icons/fi";
import {
  FaFacebookF,
  FaGithub,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";
import { SectionHeading, cx } from "./ui";

export const SPONSOR_SOCIAL_CONFIG = [
  {
    key: "facebook",
    label: "Facebook",
    icon: FaFacebookF,
    placeholder: "https://facebook.com/sponsor",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: FaLinkedinIn,
    placeholder: "https://linkedin.com/company/sponsor",
  },
  {
    key: "github",
    label: "GitHub",
    icon: FaGithub,
    placeholder: "https://github.com/sponsor",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: FaInstagram,
    placeholder: "https://instagram.com/sponsor",
  },
  {
    key: "x",
    label: "X",
    icon: FaTwitter,
    placeholder: "https://x.com/sponsor",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: FaYoutube,
    placeholder: "https://youtube.com/@sponsor",
  },
];

export function SponsorSection({ sponsor, loading = false }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (loading) {
    return (
      <section id="supported-by" className="animate-enter">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white px-6 py-10 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="section-kicker">Supported By</p>
            <div className="mx-auto mt-6 h-24 w-full max-w-sm animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
            <div className="mx-auto mt-5 h-5 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
          </div>
        </div>
      </section>
    );
  }

  if (!sponsor) return null;

  return (
    <>
      <section id="supported-by" className="animate-enter">
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white px-6 py-10 text-center shadow-xl shadow-slate-950/5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-violet-200 hover:shadow-violet-500/10 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-violet-500/40 sm:px-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <SectionHeading
              kicker="Supported By"
              title={sponsor.name}
              description={sponsor.description}
              align="center"
            />
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="group mx-auto mt-8 block w-full max-w-xl rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              aria-label={`Open details for ${sponsor.name}`}
            >
              <SponsorLogoPlate
                sponsor={sponsor}
                size="large"
                className="transition-transform duration-300 ease-out group-hover:scale-[1.02]"
              />
            </button>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="btn-primary"
              >
                <FiInfo aria-hidden="true" />
                View Details
              </button>
              {sponsor.websiteUrl && (
                <a
                  href={sponsor.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  <FiGlobe aria-hidden="true" />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {detailsOpen && (
        <SponsorDetailsModal sponsor={sponsor} onClose={() => setDetailsOpen(false)} />
      )}
    </>
  );
}

export function FooterSponsor({ sponsor }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!sponsor) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="group inline-flex w-full max-w-sm items-center gap-3 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-left shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-violet-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-violet-500/40 sm:w-auto"
        aria-label={`Open sponsor details for ${sponsor.name}`}
      >
        <SponsorLogoPlate sponsor={sponsor} size="compact" />
        <span className="min-w-0">
          <span className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
            Supported By
          </span>
          <span className="safe-text mt-0.5 block max-w-40 truncate text-sm font-bold text-slate-950 dark:text-white">
            {sponsor.name}
          </span>
        </span>
      </button>

      {detailsOpen && (
        <SponsorDetailsModal sponsor={sponsor} onClose={() => setDetailsOpen(false)} />
      )}
    </>
  );
}

export function SponsorLogoPlate({
  sponsor,
  logo,
  name,
  size = "preview",
  background = "split",
  className = "",
}) {
  const logoSrc = logo || sponsor?.logo || "";
  const sponsorName = name || sponsor?.name || "Sponsor";
  const backgroundClasses = {
    split:
      "border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_49%,#f8fafc_50%,#ffffff_100%)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#0f172a_49%,#020617_100%)]",
    white: "border-slate-200 bg-white dark:border-slate-700 dark:bg-white",
    black: "border-slate-800 bg-slate-950 dark:border-slate-700 dark:bg-slate-950",
  };
  const overlayClasses = {
    split: "bg-white/10 dark:bg-slate-950/5",
    white: "bg-transparent",
    black: "bg-white/5",
  };
  const sizeClasses = {
    compact: "h-14 w-28 p-2",
    preview: "h-40 w-full p-6",
    large: "min-h-72 w-full p-8 sm:min-h-80 sm:p-10",
  };

  return (
    <span
      className={cx(
        "relative flex items-center justify-center overflow-hidden rounded-lg border shadow-inner",
        backgroundClasses[background] || backgroundClasses.split,
        sizeClasses[size] || sizeClasses.preview,
        className,
      )}
    >
      <span
        className={cx(
          "absolute inset-0",
          overlayClasses[background] || overlayClasses.split,
        )}
        aria-hidden="true"
      />
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={`${sponsorName} logo`}
          className="relative max-h-full max-w-full object-contain drop-shadow-[0_18px_30px_rgba(15,23,42,0.22)]"
        />
      ) : (
        <span className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-white/85 text-slate-500 shadow-sm dark:bg-slate-950/85 dark:text-slate-300">
          <FiAward className="h-8 w-8" aria-hidden="true" />
        </span>
      )}
    </span>
  );
}

export function SponsorSocialLinks({ socialLinks, compact = false }) {
  const entries = useMemo(() => getSponsorSocialEntries(socialLinks), [socialLinks]);

  if (!entries.length) return null;

  return (
    <div className={cx("flex flex-wrap gap-2", compact ? "justify-start" : "")}>
      {entries.map(({ key, label, href, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          className={cx(
            "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-violet-500/40 dark:hover:bg-violet-500/10 dark:hover:text-violet-100",
            compact ? "h-9 w-9" : "h-10 gap-2 px-3 text-sm font-bold",
          )}
          aria-label={label}
          title={label}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {!compact && <span>{label}</span>}
        </a>
      ))}
    </div>
  );
}

function SponsorDetailsModal({ sponsor, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <section
        className="surface-card max-h-[90vh] w-full max-w-2xl animate-enter overflow-y-auto p-5 shadow-2xl shadow-black/30 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <SectionHeading
            kicker="Supported By"
            title={sponsor.name}
            description={sponsor.description}
          />
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-3"
            aria-label="Close sponsor details"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-5">
          <SponsorLogoPlate sponsor={sponsor} size="preview" />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            {sponsor.websiteUrl && (
              <a
                href={sponsor.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary w-full sm:w-fit"
              >
                <FiGlobe aria-hidden="true" />
                Visit Website
                <FiExternalLink aria-hidden="true" />
              </a>
            )}
            <SponsorSocialLinks socialLinks={sponsor.socialLinks} />
          </div>

          {sponsor.contactInfo && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                Contact
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-200">
                {sponsor.contactInfo}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function getSponsorSocialEntries(socialLinks = {}) {
  return SPONSOR_SOCIAL_CONFIG.map((item) => {
    const href = String(socialLinks?.[item.key] || "").trim();

    if (!href) return null;

    return {
      ...item,
      href,
      Icon: item.icon,
    };
  }).filter(Boolean);
}
