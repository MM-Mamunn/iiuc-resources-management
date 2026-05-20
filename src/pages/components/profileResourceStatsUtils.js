export const RATING_BUCKETS = [1, 2, 3, 4, 5];

export const emptyProfileStats = {
  totalResources: 0,
  totalRatings: 0,
  standardRatedResources: 0,
  poorQualityResources: 0,
  totalStarScore: 0,
  averageRating: 0,
  distribution: RATING_BUCKETS.map((star) => ({ star, total: 0 })),
};

export function normalizeProfileStats(value = {}) {
  const source = value || {};
  const distributionMap = new Map(RATING_BUCKETS.map((star) => [star, 0]));

  (Array.isArray(source.distribution) ? source.distribution : []).forEach((item) => {
    const star = Number(item.star);
    const total = Number(item.total);

    if (distributionMap.has(star) && Number.isFinite(total)) {
      distributionMap.set(star, Math.max(total, 0));
    }
  });

  const distribution = RATING_BUCKETS.map((star) => ({
    star,
    total: distributionMap.get(star) || 0,
  }));
  const derivedStandardRatings = distribution.reduce(
    (sum, item) => sum + (item.star > 0 ? item.total : 0),
    0,
  );
  const derivedScore = distribution.reduce((sum, item) => sum + item.star * item.total, 0);
  const poorQualityResources = sanitizeStatNumber(source.poorQualityResources);
  const standardRatedResources = sanitizeStatNumber(
    source.standardRatedResources,
    derivedStandardRatings,
  );
  const totalRatings = sanitizeStatNumber(
    source.totalRatings,
    standardRatedResources + poorQualityResources,
  );
  const totalStarScore = sanitizeStatNumber(source.totalStarScore, derivedScore);
  const averageRating = standardRatedResources
    ? sanitizeStatNumber(source.averageRating, totalStarScore / standardRatedResources)
    : 0;

  return {
    totalResources: sanitizeStatNumber(source.totalResources),
    totalRatings,
    standardRatedResources,
    poorQualityResources,
    totalStarScore,
    averageRating,
    distribution,
  };
}

function sanitizeStatNumber(value, fallback = 0) {
  const numberValue = Number(value);
  const fallbackValue = Number(fallback);

  if (Number.isFinite(numberValue)) return numberValue;
  if (Number.isFinite(fallbackValue)) return fallbackValue;
  return 0;
}
