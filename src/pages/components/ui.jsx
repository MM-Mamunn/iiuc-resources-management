import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiLoader,
  FiX,
} from "react-icons/fi";
import {
  dismissNotification,
  getNotificationContentKey,
  notify,
  subscribeToNotifications,
} from "./notifications";

/**
 * Joins conditional class names without adding falsy values to the DOM.
 */
export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Standard page container used by redesigned screens.
 */
export function PageShell({ children, className = "" }) {
  return (
    <main className={cx("min-h-screen pb-16", className)}>
      <div className="page-wrap">{children}</div>
    </main>
  );
}

/**
 * Reusable heading block with a compact kicker and accessible hierarchy.
 */
export function SectionHeading({ kicker, title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {kicker && <p className="section-kicker">{kicker}</p>}
        <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

/**
 * Consistent form input wrapper for labels, helper text, and errors.
 */
export function FormField({
  id,
  label,
  helper,
  error,
  children,
  className = "",
  labelClassName = "",
  helperClassName = "",
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={cx("field-label", labelClassName)}>
        {label}
      </label>
      {children}
      {helper && !error && (
        <p className={cx("mt-2 text-xs text-slate-500 dark:text-slate-400", helperClassName)}>
          {helper}
        </p>
      )}
      {error && (
        <p className="mt-2 flex items-center gap-2 text-xs font-medium text-rose-600 dark:text-rose-300">
          <FiAlertCircle aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Dropdown list for autocomplete suggestions.
 */
export function SuggestionList({ suggestions, onSelect, getLabel = (item) => item }) {
  if (!suggestions.length) return null;

  return (
    <ul className="absolute left-0 right-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      {suggestions.map((suggestion) => {
        const label = getLabel(suggestion);
        return (
          <li key={label}>
            <button
              type="button"
              onClick={() => onSelect(suggestion)}
              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
            >
              {label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Small metric card used for dashboards and summary rows.
 */
export function MetricCard({ icon, label, value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200",
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200",
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-4">
        <div className={cx("flex h-11 w-11 items-center justify-center rounded-lg", tones[tone])}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="safe-text mt-1 text-xl font-bold text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading state with a visible label for screen readers and sighted users.
 */
export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="surface-card flex items-center gap-3 px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <FiLoader className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-300" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

/**
 * Friendly empty state for tables, grids, and failed searches.
 */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Fixed notification stack used by all async response messages.
 */
export function NotificationViewport() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    return subscribeToNotifications(setNotifications);
  }, []);

  if (!notifications.length) return null;

  return (
    <div
      data-testid="notification-viewport"
      className="fixed right-3 top-3 z-[100] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-3 pointer-events-none sm:right-4 sm:top-4 sm:w-96"
    >
      {notifications.map((notification) => (
        <NotificationCard key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

function NotificationCard({ notification }) {
  const tone = notificationTones[notification.type] || notificationTones.info;
  const Icon = tone.icon;

  useEffect(() => {
    if (!Number.isFinite(notification.duration) || notification.duration <= 0) return undefined;

    const timer = window.setTimeout(() => {
      dismissNotification(notification.id, { notifySource: true });
    }, notification.duration);

    return () => window.clearTimeout(timer);
  }, [notification.duration, notification.id]);

  return (
    <section
      data-testid="notification-card"
      role={notification.type === "error" ? "alert" : "status"}
      aria-live={notification.type === "error" ? "assertive" : "polite"}
      className={cx(
        "notification-card pointer-events-auto overflow-hidden rounded-lg border bg-white shadow-2xl shadow-slate-950/15 backdrop-blur dark:bg-slate-950",
        notification.exiting && "is-leaving",
        tone.card,
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className={cx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.iconWrap)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cx("text-sm font-bold", tone.title)}>{tone.label}</p>
          <div className="safe-text mt-1 text-sm leading-5 text-slate-700 dark:text-slate-200">
            {notification.message}
          </div>
        </div>
        <button
          type="button"
          onClick={() => dismissNotification(notification.id, { notifySource: true })}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-current dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Dismiss notification"
        >
          <FiX className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="h-1 bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <div
          data-testid="notification-progress"
          className={cx("notification-progress h-full", tone.progress)}
          style={{ "--notification-duration": `${notification.duration}ms` }}
        />
      </div>
    </section>
  );
}

const notificationTones = {
  success: {
    label: "Success",
    icon: FiCheckCircle,
    card: "border-emerald-200 dark:border-emerald-500/30",
    iconWrap: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
    title: "text-emerald-800 dark:text-emerald-100",
    progress: "bg-emerald-500",
  },
  error: {
    label: "Error",
    icon: FiAlertCircle,
    card: "border-rose-200 dark:border-rose-500/30",
    iconWrap: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200",
    title: "text-rose-800 dark:text-rose-100",
    progress: "bg-rose-500",
  },
  warning: {
    label: "Warning",
    icon: FiAlertTriangle,
    card: "border-amber-200 dark:border-amber-500/30",
    iconWrap: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
    title: "text-amber-800 dark:text-amber-100",
    progress: "bg-amber-500",
  },
  info: {
    label: "Info",
    icon: FiInfo,
    card: "border-blue-200 dark:border-blue-500/30",
    iconWrap: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200",
    title: "text-blue-800 dark:text-blue-100",
    progress: "bg-blue-500",
  },
};

function InlineNotice({ type = "info", children, onDismiss }) {
  const styles = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
    error:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
    warning:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    info:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
  };

  return (
    <div className={cx("rounded-lg border px-4 py-3 text-sm font-medium", styles[type])}>
      <div className="flex items-start justify-between gap-4">
        <div>{children}</div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md px-2 py-1 text-xs font-semibold opacity-75 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Bridges legacy in-page response notices into the floating notification system.
 */
export function Notice({ type = "info", children, onDismiss, duration, inline = false }) {
  const onDismissRef = useRef(onDismiss);
  const contentKey = useMemo(() => getNotificationContentKey(children), [children]);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (inline || !contentKey) return undefined;

    const id = notify({
      type,
      message: children,
      duration,
      onClose: () => onDismissRef.current?.(),
    });

    return () => dismissNotification(id);
  }, [children, contentKey, duration, inline, type]);

  if (inline) {
    return (
      <InlineNotice type={type} onDismiss={onDismiss}>
        {children}
      </InlineNotice>
    );
  }

  return <span className="notification-anchor" aria-hidden="true" />;
}
