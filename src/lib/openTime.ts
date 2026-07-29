import { timeToMinutes } from './time'
import type { Energy, OpenSpan, ProtectedWindow, Task } from './types'

/**
 * Open time. Pure functions, no React and no Supabase, so the numbers can be
 * tested on their own.
 *
 * Open time is every minute between waking and sleeping that no task occupies.
 * A task with no start time is not on the grid yet and does not consume any.
 */

type Placed = { start: number; end: number }

function placed(tasks: Task[]): Placed[] {
  return tasks
    .filter((t) => t.start_minute !== null && t.status !== 'released')
    .map((t) => ({
      start: t.start_minute as number,
      end: (t.start_minute as number) + t.duration_minutes,
    }))
    .sort((a, b) => a.start - b.start)
}

/** Overlapping blocks are merged so a gap is never counted twice. */
function merge(blocks: Placed[]): Placed[] {
  const out: Placed[] = []
  for (const b of blocks) {
    const last = out[out.length - 1]
    if (last && b.start <= last.end) {
      last.end = Math.max(last.end, b.end)
    } else {
      out.push({ ...b })
    }
  }
  return out
}

export function openSpans(
  tasks: Task[],
  wakeMinute: number,
  sleepMinute: number,
  protectedWindows: ProtectedWindow[] = [],
): OpenSpan[] {
  const blocks = merge(placed(tasks))
  const spans: OpenSpan[] = []
  let cursor = wakeMinute

  const push = (start: number, end: number) => {
    if (end <= start) return
    const isProtected = protectedWindows.some((w) => {
      const ws = timeToMinutes(w.start_time)
      const we = timeToMinutes(w.end_time)
      return start < we && end > ws
    })
    spans.push({
      startMinute: start,
      endMinute: end,
      minutes: end - start,
      protected: isProtected,
    })
  }

  for (const b of blocks) {
    if (b.end <= wakeMinute || b.start >= sleepMinute) continue
    push(cursor, Math.min(b.start, sleepMinute))
    cursor = Math.max(cursor, Math.min(b.end, sleepMinute))
  }
  push(cursor, sleepMinute)

  return spans
}

export function totalOpenMinutes(spans: OpenSpan[]): number {
  return spans.reduce((sum, s) => sum + s.minutes, 0)
}

/**
 * Minutes per energy type. Only counts what is actually on the grid, so the
 * three segments plus open time add up to the whole day.
 */
export function balance(tasks: Task[]): Record<Energy, number> {
  const out: Record<Energy, number> = { chosen: 0, upkeep: 0, big_kid_stuff: 0 }
  for (const t of tasks) {
    if (t.start_minute === null || t.status === 'released') continue
    out[t.energy] += t.duration_minutes
  }
  return out
}

/** The one or two tasks that decide whether the day was good. */
export function todaysTwo(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.counts_today).slice(0, 2)
}
