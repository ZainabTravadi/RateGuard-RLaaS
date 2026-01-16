// src/modules/enforcement/counter.store.js

const counters = new Map();

/**
 * Increment counter for a rule + identifier within a time window
 */
export function incrementCounter({ ruleId, identifier, windowSeconds, now }) {
  const windowStart =
    Math.floor(now / windowSeconds) * windowSeconds;

  const key = `${ruleId}:${identifier}`;
  const existing = counters.get(key);

  if (!existing || existing.windowStart !== windowStart) {
    counters.set(key, { count: 1, windowStart });
    return 1;
  }

  existing.count += 1;
  return existing.count;
}
