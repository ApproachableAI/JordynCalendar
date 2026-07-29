import { describe, expect, it } from 'vitest'
import { balance, openSpans, totalOpenMinutes } from './openTime'
import { formatClock, formatDuration, timeToMinutes } from './time'
import type { ProtectedWindow, Task } from './types'

const WAKE = timeToMinutes('05:30') // 330
const SLEEP = timeToMinutes('22:30') // 1350

function task(partial: Partial<Task> & { start_minute: number | null }): Task {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'u',
    template_id: null,
    title: 'thing',
    energy: 'upkeep',
    intensity: 1,
    kind: 'flexible',
    scheduled_date: '2026-07-28',
    duration_minutes: 30,
    status: 'planned',
    completed_at: null,
    counts_today: false,
    immovable: false,
    pinned: false,
    follows_task_id: null,
    due_date: null,
    note: null,
    ...partial,
  }
}

const protectedWindows: ProtectedWindow[] = [
  { id: 'a', label: 'Early afternoon', start_time: '14:00:00', end_time: '16:00:00', min_minutes: 90, sort_order: 1 },
  { id: 'b', label: 'After dinner', start_time: '19:00:00', end_time: '22:00:00', min_minutes: 120, sort_order: 2 },
]

describe('open time', () => {
  it('an empty day is entirely open', () => {
    const spans = openSpans([], WAKE, SLEEP)
    expect(spans).toHaveLength(1)
    expect(totalOpenMinutes(spans)).toBe(1020)
  })

  it('finds the gaps between placed tasks', () => {
    const tasks = [
      task({ start_minute: 330, duration_minutes: 60 }), // 5:30 to 6:30
      task({ start_minute: 405, duration_minutes: 75 }), // 6:45 to 8:00
    ]
    const spans = openSpans(tasks, WAKE, SLEEP)
    expect(spans.map((s) => [s.startMinute, s.minutes])).toEqual([
      [390, 15], // the quarter hour between the gym and coffee
      [480, 870], // 8:00 to sleep
    ])
  })

  it('a task with no start time does not eat any open time', () => {
    const tasks = [task({ start_minute: null, duration_minutes: 120 })]
    expect(totalOpenMinutes(openSpans(tasks, WAKE, SLEEP))).toBe(1020)
  })

  it('overlapping tasks do not double count the time they cover', () => {
    const tasks = [
      task({ start_minute: 600, duration_minutes: 120 }), // 10:00 to 12:00
      task({ start_minute: 660, duration_minutes: 120 }), // 11:00 to 13:00
    ]
    // 10:00 to 13:00 is covered once, so 1020 minus 180
    expect(totalOpenMinutes(openSpans(tasks, WAKE, SLEEP))).toBe(840)
  })

  it('clamps tasks that run past bedtime or start before waking', () => {
    const tasks = [
      task({ start_minute: 240, duration_minutes: 120 }), // 4:00 to 6:00, starts before waking
      task({ start_minute: 1320, duration_minutes: 120 }), // 22:00 to midnight
    ]
    const spans = openSpans(tasks, WAKE, SLEEP)
    // open runs 6:00 to 22:00
    expect(spans).toHaveLength(1)
    expect(spans[0].startMinute).toBe(360)
    expect(spans[0].endMinute).toBe(1320)
  })

  it('marks spans that overlap a protected window', () => {
    const spans = openSpans([], WAKE, SLEEP, protectedWindows)
    expect(spans[0].protected).toBe(true) // the whole day overlaps both
  })

  it('leaves the cooking stretch unprotected', () => {
    // a gap from 16:00 to 18:30, which is cooking and dinner time
    const tasks = [
      task({ start_minute: 330, duration_minutes: 630 }), // through to 16:00
      task({ start_minute: 1110, duration_minutes: 240 }), // 18:30 to bed
    ]
    const spans = openSpans(tasks, WAKE, SLEEP, protectedWindows)
    expect(spans).toHaveLength(1)
    expect(spans[0].minutes).toBe(150)
    expect(spans[0].protected).toBe(false)
  })
})

describe('balance', () => {
  it('adds up minutes per energy type, ignoring unplaced tasks', () => {
    const tasks = [
      task({ start_minute: 330, duration_minutes: 60, energy: 'chosen' }),
      task({ start_minute: 570, duration_minutes: 60, energy: 'big_kid_stuff' }),
      task({ start_minute: 750, duration_minutes: 30, energy: 'upkeep' }),
      task({ start_minute: null, duration_minutes: 90, energy: 'chosen' }),
    ]
    expect(balance(tasks)).toEqual({ chosen: 60, upkeep: 30, big_kid_stuff: 60 })
  })

  it('the three types plus open time account for the whole day', () => {
    const tasks = [
      task({ start_minute: 330, duration_minutes: 60, energy: 'chosen' }),
      task({ start_minute: 570, duration_minutes: 60, energy: 'big_kid_stuff' }),
    ]
    const b = balance(tasks)
    const open = totalOpenMinutes(openSpans(tasks, WAKE, SLEEP))
    expect(b.chosen + b.upkeep + b.big_kid_stuff + open).toBe(SLEEP - WAKE)
  })
})

describe('formatting never counts down', () => {
  it('prints durations as an amount', () => {
    expect(formatDuration(385)).toBe('6 hr 25 min')
    expect(formatDuration(120)).toBe('2 hours')
    expect(formatDuration(60)).toBe('1 hour')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(0)).toBe('0 min')
  })

  it('prints clock times in sentence case', () => {
    expect(formatClock(405)).toBe('6:45am')
    expect(formatClock(720)).toBe('12pm')
    expect(formatClock(1350)).toBe('10:30pm')
    expect(formatClock(0)).toBe('12am')
  })
})
