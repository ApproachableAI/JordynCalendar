import { describe, expect, it } from 'vitest'
import { firstFit } from './place'
import type { ProtectedWindow, Task } from './types'

const WAKE = 330 // 5:30
const SLEEP = 1350 // 22:30

function task(start: number, duration: number): Task {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'u',
    template_id: null,
    title: 'thing',
    energy: 'upkeep',
    intensity: 1,
    kind: 'flexible',
    scheduled_date: '2026-07-30',
    start_minute: start,
    duration_minutes: duration,
    status: 'planned',
    completed_at: null,
    counts_today: false,
    immovable: false,
    pinned: false,
    follows_task_id: null,
    due_date: null,
    note: null,
  }
}

const windows: ProtectedWindow[] = [
  { id: 'a', label: 'Early afternoon', start_time: '14:00:00', end_time: '16:00:00', min_minutes: 90, sort_order: 1 },
  { id: 'b', label: 'After dinner', start_time: '19:00:00', end_time: '22:00:00', min_minutes: 120, sort_order: 2 },
]

describe('firstFit', () => {
  it('takes the earliest slot on an empty day', () => {
    expect(firstFit([], WAKE, SLEEP, [], 60)).toBe(330)
  })

  it('rounds the start up to a half hour', () => {
    // a task ending at 6:35 leaves the next slot at 7:00
    const tasks = [task(330, 65)]
    expect(firstFit(tasks, WAKE, SLEEP, [], 30)).toBe(420)
  })

  it('skips a gap that is too small and takes the next one', () => {
    const tasks = [
      task(330, 60), // 5:30 to 6:30
      task(420, 60), // 7:00 to 8:00, leaving only 6:30 to 7:00
    ]
    // 30 minutes fits the first gap, 60 does not and lands after 8:00
    expect(firstFit(tasks, WAKE, SLEEP, [], 30)).toBe(390)
    expect(firstFit(tasks, WAKE, SLEEP, [], 60)).toBe(480)
  })

  it('never places anything in protected time', () => {
    // everything busy except the protected 2pm to 4pm
    const tasks = [task(330, 510), task(960, 390)]
    expect(firstFit(tasks, WAKE, SLEEP, windows, 30)).toBeNull()
    // with no protection the same gap is fair game
    expect(firstFit(tasks, WAKE, SLEEP, [], 30)).toBe(840)
  })

  it('honours a floor, so nothing lands in the past', () => {
    expect(firstFit([], WAKE, SLEEP, [], 60, 640)).toBe(660)
  })

  it('returns null when the day genuinely has no room', () => {
    expect(firstFit([task(330, 1020)], WAKE, SLEEP, [], 30)).toBeNull()
  })

  it('does not overflow past bedtime', () => {
    // only 8:30pm onwards is free, which is two hours
    const tasks = [task(330, 900)]
    expect(firstFit(tasks, WAKE, SLEEP, [], 180)).toBeNull()
    expect(firstFit(tasks, WAKE, SLEEP, [], 120)).toBe(1230)
  })
})
