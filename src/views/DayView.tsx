import { useState } from 'react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { AddTask } from '../components/AddTask'
import { DayGrid } from '../components/DayGrid'
import { OpenHeader } from '../components/OpenHeader'
import { TaskSheet } from '../components/TaskSheet'
import { TodaysTwo } from '../components/TodaysTwo'
import { balance, openSpans, todaysTwo, totalOpenMinutes } from '../lib/openTime'
import { firstFit } from '../lib/place'
import { useProfile, useProtectedWindows, useTasks, useUpdateTask } from '../lib/queries'
import { formatClock, formatDuration, timeToMinutes } from '../lib/time'
import type { Task } from '../lib/types'

export function DayView({ date, nowMinute }: { date: string; nowMinute: number | null }) {
  const profile = useProfile()
  const windows = useProtectedWindows()
  const update = useUpdateTask()
  const [selected, setSelected] = useState<Task | null>(null)

  const weekStart = startOfWeek(parseISO(date), { weekStartsOn: 1 })
  const week = useTasks(
    format(weekStart, 'yyyy-MM-dd'),
    format(addDays(weekStart, 6), 'yyyy-MM-dd'),
  )

  if (profile.isLoading || week.isLoading || windows.isLoading) {
    return <p className="p-8 text-soft">Loading your day.</p>
  }
  if (profile.error || week.error || windows.error) {
    const err = (profile.error || week.error || windows.error) as Error
    return (
      <div className="p-8">
        <p className="text-ink">Your day could not load. {err.message}</p>
        <p className="mt-2 text-soft">Refresh, and tell me if it keeps happening.</p>
      </div>
    )
  }

  const wake = timeToMinutes(profile.data!.wake_time)
  const sleep = timeToMinutes(profile.data!.sleep_time)
  const tasks = (week.data ?? []).filter((t) => t.scheduled_date === date)
  const placed = tasks.filter((t) => t.start_minute !== null)
  const waiting = tasks.filter((t) => t.start_minute === null && t.status === 'planned')

  const spans = openSpans(tasks, wake, sleep, windows.data ?? [])
  const open = totalOpenMinutes(spans)
  const two = todaysTwo(tasks)

  const chosenThisWeek = (week.data ?? [])
    .filter((t) => t.energy === 'chosen' && t.status === 'done')
    .reduce((sum, t) => sum + t.duration_minutes, 0)

  /** Drops a waiting task into the first gap that fits. */
  function findSlot(task: Task) {
    const floor = nowMinute !== null ? Math.max(wake, nowMinute) : wake
    const start = firstFit(placed, wake, sleep, windows.data ?? [], task.duration_minutes, floor)
    if (start === null) return
    update.mutate({ id: task.id, start_minute: start })
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-8 sm:px-8">
      <OpenHeader
        openMinutes={open}
        balance={balance(tasks)}
        dayMinutes={sleep - wake}
        chosenThisWeek={chosenThisWeek}
      />

      {/* Adding something is the most used control, so it sits above the grid
          rather than at the bottom of a very tall page. */}
      <AddTask date={date} />

      <TodaysTwo two={two} />

      {waiting.length > 0 && (
        <section className="mt-6 rounded-xl border border-hairline p-4">
          <h2 className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
            On today, not on the grid yet
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {waiting.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(t)}
                  className="min-w-0 grow truncate text-left text-ink"
                >
                  {t.title}
                  <span className="ml-2 text-xs text-soft">{formatDuration(t.duration_minutes)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => findSlot(t)}
                  className="rounded-full border border-sun/50 px-3 py-1 font-display text-[11px] text-sun"
                >
                  Find it a slot
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <DayGrid
          tasks={tasks}
          wakeMinute={wake}
          sleepMinute={sleep}
          protectedWindows={windows.data ?? []}
          nowMinute={nowMinute}
          onSelect={setSelected}
        />
      </div>
      <p className="mt-3 text-xs text-soft">
        Tap anything on the grid to edit it, tick it off, or make it one of
        today&rsquo;s two.
        {nowMinute !== null && ` It is ${formatClock(nowMinute)} now.`}
      </p>

      {selected && <TaskSheet task={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
