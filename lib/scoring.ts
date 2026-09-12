import "server-only";

/** Same formula as the original single-device quiz: 500 base + speed bonus + streak bonus. */
export function computePoints(
  isCorrect: boolean,
  timeLeftSeconds: number,
  newStreak: number
): number {
  if (!isCorrect) return 0;
  const clampedTimeLeft = Math.max(0, Math.round(timeLeftSeconds));
  return 500 + clampedTimeLeft * 25 + newStreak * 50;
}
