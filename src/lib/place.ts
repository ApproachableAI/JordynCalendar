import { openSpans } from './openTime'
import type { ProtectedWindow, Task } from './types'

/**
 * Finding a slot for one task.
 *
 * This is a deliberately simple stand in for the real scheduler. It takes the
 * earliest open stretch that fits and never touches protected time. Pure, so
 * it can be tested on its own, and it will be replaced by the scoring passes
 * in src/scheduler/ rather than grown into them.
 */

const SLOT = 30

/** Rounds up to the next half hour, since the grid works in 30 minute steps. */
function toSlot(minute: number): number {
  return Math.ceil(minute / SLOT) * SLOT
}

export function firstFit(
  tasks: Task[],
  wakeMinute: number,
  sleepMinute: number,
  protectedWindows: ProtectedWindow[],
  minutes: number,
  notBefore = wakeMinute,
): number | null {
  const spans = openSpans(tasks, wakeMinute, sleepMinute, protectedWindows)

  for (const span of spans) {
    // Protected open time is reserved before anything optional gets placed,
    // so nothing lands in it automatically.
    if (span.protected) continue

    const earliest = Math.max(span.startMinute, notBefore)
    const start = toSlot(earliest)
    if (start + minutes <= span.endMinute) return start
  }
  return null
}
