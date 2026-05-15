const DEFAULT_CACHE_TTL = 60 * 1000;

function canUseSessionStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function getCachedValue(key) {
  if (!canUseSessionStorage()) return null;

  try {
    const rawValue = window.sessionStorage.getItem(key);
    if (!rawValue) return null;

    const cacheEntry = JSON.parse(rawValue);
    if (!cacheEntry?.expiresAt || Date.now() > cacheEntry.expiresAt) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return cacheEntry.value;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}

export function setCachedValue(key, value, ttl = DEFAULT_CACHE_TTL) {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        value,
        expiresAt: Date.now() + ttl,
      }),
    );
  } catch {
    // Storage can fail in private windows or quota-limited sessions.
  }
}

export async function cachedRequest(key, fetcher, options = {}) {
  const { ttl = DEFAULT_CACHE_TTL, forceRefresh = false } = options;
  const cachedValue = forceRefresh ? null : getCachedValue(key);

  if (cachedValue !== null) {
    return cachedValue;
  }

  const nextValue = await fetcher();
  setCachedValue(key, nextValue, ttl);
  return nextValue;
}

export function clearCacheByPrefix(prefix) {
  if (!canUseSessionStorage()) return;

  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => window.sessionStorage.removeItem(key));
}
