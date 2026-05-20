import {
  FiAlertTriangle,
  FiBarChart2,
  FiBookOpen,
  FiStar,
} from "react-icons/fi";
import { SectionHeading } from "./ui";
import { normalizeProfileStats, RATING_BUCKETS } from "./profileResourceStatsUtils";

export function ProfileResourceStats({ stats, loading, className = "mt-6" }) {
  const normalizedStats = normalizeProfileStats(stats);
  const metricValue = (value) => (loading ? <LoadingMetricValue /> : value);

  return (
    <section className={`surface-card p-5 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeading
          kicker="Profile stats"
          title="Resource analytics"
          description="A quick view of shared resources and the ratings they have received."
        />
        <span className="status-pill w-fit border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {loading ? "Loading analytics..." : `${formatStatNumber(normalizedStats.totalRatings)} rated resources`}
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileStatCard
            icon={<FiBookOpen aria-hidden="true" />}
            label="Resources added"
            value={metricValue(formatStatNumber(normalizedStats.totalResources))}
            tooltip="Total resources shared by this profile."
          />
          <ProfileStatCard
            icon={<FiStar aria-hidden="true" />}
            label="Rated resources"
            value={metricValue(formatStatNumber(normalizedStats.totalRatings))}
            tooltip="Resources where the aggregate resources.star value is not 0."
          />
          <ProfileStatCard
            icon={<FiBarChart2 aria-hidden="true" />}
            label="Star score"
            value={metricValue(formatAverageRating(normalizedStats.totalStarScore))}
            tooltip="Sum of positive aggregate star values from this profile's resources."
          />
          <ProfileStatCard
            icon={<FiStar aria-hidden="true" />}
            label="Average rating"
            value={metricValue(formatAverageRating(normalizedStats.averageRating))}
            tooltip="Average of positive aggregate resource ratings, excluding unrated and poor-quality resources."
          />
          <ProfileStatCard
            icon={<FiAlertTriangle aria-hidden="true" />}
            label="Very bad / rejected"
            value={metricValue(formatStatNumber(normalizedStats.poorQualityResources))}
            tone="danger"
            tooltip="Resources with a negative aggregate score in resources.star. These are shown separately from the normal 1-5 rating chart."
          />
        </div>

        <RatingDistributionChart
          distribution={normalizedStats.distribution}
          loading={loading}
        />
      </div>
    </section>
  );
}

function LoadingMetricValue() {
  return (
    <span className="mt-1 block h-8 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
  );
}

function ProfileStatCard({ icon, label, value, tooltip, tone = "default" }) {
  const toneClasses =
    tone === "danger"
      ? {
          card: "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10",
          icon: "bg-white text-rose-700 dark:bg-slate-950 dark:text-rose-300",
        }
      : {
          card: "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900",
          icon: "bg-white text-blue-700 dark:bg-slate-950 dark:text-blue-300",
        };

  return (
    <div
      className={`group relative rounded-lg border p-4 ${toneClasses.card}`}
      title={tooltip}
    >
      {tooltip && <HoverTooltip>{tooltip}</HoverTooltip>}
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-sm ${toneClasses.icon}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="safe-text mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function RatingDistributionChart({ distribution, loading }) {
  const loadingWidths = [64, 48, 76, 58, 68];
  const chartItems = loading
    ? RATING_BUCKETS.map((star, index) => ({ star, total: 0, loadingWidth: loadingWidths[index] }))
    : distribution;
  const maxTotal = Math.max(...chartItems.map((item) => item.total), 0);

  return (
    <div
      className="group relative rounded-lg border border-slate-200 p-4 dark:border-slate-800"
      title="Positive resources.star ratings are grouped into the standard 1-5 chart. Zero and negative values are excluded from this chart."
    >
      <HoverTooltip>
        Positive resources.star ratings are grouped into the standard 1-5 chart. Zero and negative values are excluded from this chart.
      </HoverTooltip>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            Rating distribution
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Positive rated resources grouped from 1 to 5 stars.
          </p>
        </div>
        <FiBarChart2 className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>

      <div className="mt-4 space-y-3">
        {chartItems.map((item) => {
          const width = loading
            ? item.loadingWidth
            : maxTotal > 0
              ? Math.max((item.total / maxTotal) * 100, item.total > 0 ? 8 : 0)
              : 0;
          const tooltip = loading
            ? `Loading ${item.star}-star resource count.`
            : `${formatStatNumber(item.total)} resource${item.total === 1 ? "" : "s"} are in the ${item.star}-star bucket.`;

          return (
            <div
              key={item.star}
              className="group/bar relative grid grid-cols-[2.5rem_minmax(0,1fr)_3rem] items-center gap-3"
              title={tooltip}
            >
              <span className="pointer-events-none absolute bottom-full left-12 z-20 mb-2 max-w-xs rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover/bar:opacity-100 dark:bg-white dark:text-slate-950">
                {tooltip}
              </span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {item.star}
              </span>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <div
                  className={`h-full rounded-full transition-all ${
                    loading ? "animate-pulse bg-slate-300 dark:bg-slate-700" : "bg-blue-600 dark:bg-blue-400"
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="text-right text-sm font-bold text-slate-700 dark:text-slate-200">
                {loading ? <span className="inline-block h-4 w-7 animate-pulse rounded bg-slate-200 dark:bg-slate-800" /> : formatStatNumber(item.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HoverTooltip({ children }) {
  return (
    <span className="pointer-events-none absolute left-4 top-3 z-20 max-w-xs rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 dark:bg-white dark:text-slate-950">
      {children}
    </span>
  );
}

function sanitizeStatNumber(value, fallback = 0) {
  const numberValue = Number(value);
  const fallbackValue = Number(fallback);

  if (Number.isFinite(numberValue)) return numberValue;
  if (Number.isFinite(fallbackValue)) return fallbackValue;
  return 0;
}

function formatStatNumber(value) {
  return sanitizeStatNumber(value).toLocaleString();
}

function formatAverageRating(value) {
  return sanitizeStatNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}
