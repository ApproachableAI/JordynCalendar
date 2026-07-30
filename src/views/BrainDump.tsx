import { useState, type FormEvent } from 'react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import {
  useAddTask,
  useDeleteTask,
  useInbox,
  useProfile,
  useProtectedWindows,
  useTasks,
  useUpdateTask,
} from '../lib/queries'
import { firstFit } from '../lib/place'
import { formatClock, formatDuration, timeToMinutes } from '../lib/time'
import { ENERGIES, ENERGY_LABEL, type Energy, type Task } from '../lib/types'

const DURATIONS = [15, 30, 45, 60, 90]

/**
 * Type everything out first, decide later.
 *
 * Nothing here has a date. Each line waits until it is sent to a day, at
 * which point it drops into the earliest gap that fits and never into
 * protected time.
 */
export function BrainDumpList({ today }: { today: string }) {
  const inbox = useInbox()
  const profile = useProfile()
  const windows = useProtectedWindows()
  const add = useAddTask()
  const update = useUpdateTask()
  const remove = useDeleteTask()

  const weekStart = startOfWeek(parseISO(today), { weekStartsOn: 1 })
  const week = useTasks(format(weekStart, 'yyyy-MM-dd'), format(addDays(weekStart, 6), 'yyyy-MM-dd'))

  const [text, setText] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    for (const line of lines) {
      await add.mutateAsync({
        title: line,
        energy: 'upkeep',
        duration_minutes: 30,
        scheduled_date: null,
        start_minute: null,
        due_date: null,
      })
    }
    setText('')
  }

  /** Sends one item to a day, dropping it in the first gap that fits. */
  async function sendTo(item: Task, date: string) {
    const wake = timeToMinutes(profile.data!.wake_time)
    const sleep = timeToMinutes(profile.data!.sleep_time)
    const dayTasks = (week.data ?? []).filter((t) => t.scheduled_date === date)
    const floor = date === today ? Math.max(wake, nowMinutes()) : wake

    const start = firstFit(dayTasks, wake, sleep, windows.data ?? [], item.duration_minutes, floor)

    await update.mutateAsync({
      id: item.id,
      scheduled_date: date,
      start_minute: start,
      pinned: false,
    })

    const when = format(parseISO(date), 'EEEE')
    setNote(
      start === null
        ? `${item.title} is on ${when}, waiting for a gap. Nothing was moved to make room.`
        : `${item.title} lands ${when} at ${formatClock(start)}.`,
    )
  }

  function nowMinutes(): number {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  }

  /** The first weekday with room, for the "this week" button. */
  async function sendToWeek(item: Task) {
    const wake = timeToMinutes(profile.data!.wake_time)
    const sleep = timeToMinutes(profile.data!.sleep_time)
    for (let i = 0; i < 7; i++) {
      const d = addDays(parseISO(today), i)
      if (d.getDay() === 0 || d.getDay() === 6) continue
      const key = format(d, 'yyyy-MM-dd')
      const dayTasks = (week.data ?? []).filter((t) => t.scheduled_date === key)
      const floor = key === today ? Math.max(wake, nowMinutes()) : wake
      const start = firstFit(dayTasks, wake, sleep, windows.data ?? [], item.duration_minutes, floor)
      if (start !== null) {
        await update.mutateAsync({ id: item.id, scheduled_date: key, start_minute: start, pinned: false })
        setNote(`${item.title} lands ${format(d, 'EEEE')} at ${formatClock(start)}.`)
        return
      }
    }
    setNote(`No room this week for ${item.title}. It is staying on the list.`)
  }

  if (profile.isLoading || inbox.isLoading) {
    return <p className="p-5 text-soft">Loading your list.</p>
  }

  const items = inbox.data ?? []
  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 font-display text-[11px] ${
      active ? 'border-sun bg-sun text-ground' : 'border-hairline text-soft'
    }`

  return (
    <div className="p-5">
      <h2 className="font-display text-xl leading-tight tracking-tight text-sun">
        Everything on your mind
      </h2>
      <p className="mt-1.5 text-sm text-soft">
        Nothing here has a time until you send it to a day.
      </p>

      <form onSubmit={handleAdd} className="mt-4">
        <label htmlFor="dump" className="sr-only">
          Things to do
        </label>
        <textarea
          id="dump"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(e)
          }}
          placeholder={'Call the vet\nRenew the car registration\nReply to Mum'}
          className="w-full rounded-xl border border-hairline bg-ground px-3 py-2.5 text-sm text-ink placeholder:text-soft/60"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={add.isPending || !text.trim()}
            className="rounded-full bg-sun px-4 py-2 font-display text-xs font-semibold text-ground disabled:opacity-50"
          >
            {add.isPending ? 'Adding' : 'Add these'}
          </button>
          <span className="text-xs text-soft">One per line.</span>
        </div>
      </form>

      {note && (
        <p role="status" className="mt-4 rounded-xl border border-sun/40 bg-sun/10 p-2.5 text-xs text-ink">
          {note}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-hairline p-4 text-sm text-soft">
            Nothing waiting. Anything you type above lands here until you
            decide when to do it.
          </p>
        )}

        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-hairline bg-ground p-2.5">
            {/* Title first, buttons under it, so a long name does not shuffle
                the controls onto a different line than a short one. */}
            <button
              type="button"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              className="block w-full text-left text-ink"
            >
              <span className="block text-sm leading-snug">{item.title}</span>
              <span className="mt-0.5 block font-display text-[10px] uppercase tracking-[0.12em] text-soft">
                {formatDuration(item.duration_minutes)} &middot; {ENERGY_LABEL[item.energy]}
              </span>
            </button>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => sendTo(item, today)}
                className="rounded-full bg-sun px-3.5 py-1.5 font-display text-[11px] font-semibold text-ground"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => sendToWeek(item)}
                className="rounded-full border border-sun/50 px-3.5 py-1.5 font-display text-[11px] text-sun"
              >
                This week
              </button>
            </div>

            {expanded === item.id && (
              <div className="mt-3 border-t border-hairline pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {DURATIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => update.mutate({ id: item.id, duration_minutes: m })}
                      className={chip(item.duration_minutes === m)}
                    >
                      {m < 60 ? `${m} min` : m === 60 ? '1 hr' : '1.5 hr'}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ENERGIES.map((e: Energy) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => update.mutate({ id: item.id, energy: e })}
                      className={chip(item.energy === e)}
                    >
                      {ENERGY_LABEL[e]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(item.id)}
                  className="mt-3 font-display text-[11px] text-soft underline"
                >
                  Off the list
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
