import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { AddTask } from '../components/AddTask'
import { DayGrid } from '../components/DayGrid'
import { OpenHeader } from '../components/OpenHeader'
import { TodaysTwo } from '../components/TodaysTwo'
import { balance, openSpans, todaysTwo, totalOpenMinutes } from '../lib/openTime'
import { useProfile, useProtectedWindows, useTasks, useCompleteTask, useToggleTodaysTwo } from '../lib/queries'
import { timeToMinutes } from '../lib/time'
import type { Task } from '../lib/types'

export function DayView({ date, nowMinute }: { date: string; nowMinute: number | null }) {
  const profile = useProfile()
  const windows = useProtectedWindows()

  // Pull the whole quota week so the chosen total can accumulate.
  const weekStart = startOfWeek(parseISO(date), { weekStartsOn: 1 })
  const weekFrom = format(weekStart, 'yyyy-MM-dd')
  const weekTo = format(addDays(weekStart, 6), 'yyyy-MM-dd')
  const week = useTasks(weekFrom, weekTo)

  const complete = useCompleteTask()
  const toggleTwo = useToggleTodaysTwo()

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

  const spans = openSpans(tasks, wake, sleep, windows.data ?? [])
  const open = totalOpenMinutes(spans)
  const bal = balance(tasks)
  const two = todaysTwo(tasks)

  const chosenThisWeek = (week.data ?? [])
    .filter((t) => t.energy === 'chosen' && t.status === 'done')
    .reduce((sum, t) => sum + t.duration_minutes, 0)

  function handleSelect(task: Task) {
    // Tapping completes. Holding shift marks it as one of today's two.
    if (window.event && (window.event as MouseEvent).shiftKey) {
      toggleTwo.mutate({ id: task.id, counts: !task.counts_today })
      return
    }
    complete.mutate({ id: task.id, done: task.status !== 'done' })
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-8 sm:px-8">
      <OpenHeader
        openMinutes={open}
        balance={bal}
        dayMinutes={sleep - wake}
        chosenThisWeek={chosenThisWeek}
      />
      <TodaysTwo two={two} />
      <div className="mt-8">
        <DayGrid
          tasks={tasks}
          wakeMinute={wake}
          sleepMinute={sleep}
          protectedWindows={windows.data ?? []}
          nowMinute={nowMinute}
          onSelect={handleSelect}
        />
      </div>
      <p className="mt-3 text-xs text-soft">
        Tap a block to tick it off. Shift and tap to make it one of today&rsquo;s two.
      </p>
      <AddTask date={date} />
    </div>
  )
}
