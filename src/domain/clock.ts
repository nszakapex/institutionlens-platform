/**
 * Injectable clock for deterministic time comparisons.
 * Never call Date.now() / new Date() inside domain validation of fixtures.
 */

export type Clock = {
  now(): Date;
};

export function fixedClock(iso: string): Clock {
  const fixed = new Date(iso);
  if (Number.isNaN(fixed.getTime())) {
    throw new Error("fixedClock requires a valid ISO timestamp");
  }
  return {
    now: () => new Date(fixed.getTime()),
  };
}

/** Production/runtime clock — not used when validating synthetic fixtures. */
export function systemClock(): Clock {
  return {
    now: () => new Date(),
  };
}
