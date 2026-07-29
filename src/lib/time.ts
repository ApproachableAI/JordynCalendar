/**
 * Minute helpers. Everything in the grid is minutes from midnight, so these
 * are the only place that parses or prints a time.
 */

/** "06:45:00" or "06:45" to 405. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** 405 to "6:45am". Sentence case, no leading zero. */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, '0')}${suffix}`
}

/**
 * 385 to "6 hr 25 min". Always reads as an amount you have, never as a
 * remainder or a countdown.
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} hr ${m} min`
  if (h) return h === 1 ? '1 hour' : `${h} hours`
  return `${m} min`
}

/** Splits a duration so the parts can be sized differently. */
export function durationParts(minutes: number): { value: string; unit: string }[] {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const parts: { value: string; unit: string }[] = []
  if (h) parts.push({ value: String(h), unit: 'hr' })
  if (m || !h) parts.push({ value: String(m), unit: 'min' })
  return parts
}
