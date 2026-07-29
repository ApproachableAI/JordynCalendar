import { addDays, format, isWeekend, parseISO, startOfWeek } from 'date-fns'
import { DayGrid } from '../components/DayGrid'
import { balance, openSpans, totalOpenMinutes } from '../lib/openTime'
import { useProfile, useProtectedWindows, useTasks } from '../lib/queries'
import { formatDuration, timeToMinutes } from '../lib/time'

/**
 * Seven columns on the same grid engine at smaller scale. Weekends carry no
 * time grid at all, because nothing gets scheduled on them. Whatever she puts
 * there by hand shows as a plain list.
 */
export function WeekView({ date, onPickDay }: { date: string; onPickDay: (d: string) => void }) {
  const profile = useProfile()
  const windows = useProtectedWindows()

  const start = startOfWeek(parseISO(date), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const from = format(days[0], 'yyyy-MM-dd')
  const to = format(days[6], 'yyyy-MM-dd')
  const week = useTasks(from, to)

  if (profile.isLoading || week.isLoading || windows.isLoading) {
    return <p className="p-8 text-soft">Loading your week.</p>
  }
  if (profile.error || week.error) {
    return <p className="p-8 text-ink">Your week could not load. Refresh and try again.</p>
  }

  const wake = timeToMinutes(profile.data!.wake_time)
  const sleep = timeToMinutes(profile.data!.sleep_time)
  const all = week.data ?? []

  const weekOpen = days.reduce((sum, d) => {
    if (isWeekend(d)) return sum
    const key = format(d, 'yyyy-MM-dd')
    return sum + totalOpenMinutes(openSpans(all.filter((t) => t.scheduled_date === key), wake, sleep))
  }, 0)

  const chosenDone = all
    .filter((t) => t.energy === 'chosen' && t.status === 'done')
    .reduce((s, t) => s + t.duration_minutes, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-8">
      <header className="flex flex-wrap items-end gap-x-7 gap-y-2">
        <div className="flex items-baseline font-display font-extrabold leading-[0.84] tracking-[-0.045em] text-sun tabular-nums">
          <span className="text-[clamp(52px,8vw,92px)]">{Math.floor(weekOpen / 60)}</span>
          <span className="ml-1 mr-3 text-[clamp(18px,2.6vw,30px)] font-semibold text-soft">hr</span>
          <span className="text-[clamp(52px,8vw,92px)]">{weekOpen % 60}</span>
          <span className="ml-1 text-[clamp(18px,2.6vw,30px)] font-semibold text-soft">min</span>
        </div>
        <p className="pb-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-sun">
          open this week
        </p>
        <p className="pb-2 text-sm text-soft">
          chosen time <b className="tabular-nums text-ink">{formatDuration(chosenDone)}</b>{' '}
          <span className="text-tide">&#9650;</span>
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd')
          const dayTasks = all.filter((t) => t.scheduled_date === key)
          const weekend = isWeekend(d)
          const open = weekend
            ? 0
            : totalOpenMinutes(openSpans(dayTasks, wake, sleep, windows.data ?? []))
          const bal = balance(dayTasks)

          return (
            <div key={key} className="min-w-0">
              <button
                type="button"
                onClick={() => onPickDay(key)}
                className="mb-2 block w-full text-left"
              >
                <span className="block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
                  {format(d, 'EEE d')}
                </span>
                <span className="mt-0.5 block font-display text-sm font-bold text-sun tabular-nums">
                  {weekend ? 'yours' : `${formatDuration(open)} open`}
                </span>
              </button>

              {weekend ? (
                <div className="rounded-lg border border-dashed border-hairline p-3">
                  {dayTasks.length === 0 ? (
                    <p className="text-xs text-soft">
                      Nothing planned. Add something if you want to.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {dayTasks.map((t) => (
                        <li key={t.id} className="text-xs text-ink">
                          {t.status === 'done' ? '✓ ' : '· '}
                          {t.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <>
                  <DayGrid
                    tasks={dayTasks}
                    wakeMinute={wake}
                    sleepMinute={sleep}
                    protectedWindows={windows.data ?? []}
                    pixelsPerMinute={0.3}
                    compact
                  />
                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-hairline">
                    <i className="bg-chosen" style={{ width: `${(bal.chosen / (sleep - wake)) * 100}%` }} />
                    <i className="bg-upkeep" style={{ width: `${(bal.upkeep / (sleep - wake)) * 100}%` }} />
                    <i className="bg-bigkid" style={{ width: `${(bal.big_kid_stuff / (sleep - wake)) * 100}%` }} />
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
