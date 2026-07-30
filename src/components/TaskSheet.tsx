import { useEffect, useState } from 'react'
import { useDeleteTask, useUpdateTask } from '../lib/queries'
import { formatClock, timeToMinutes } from '../lib/time'
import { ENERGIES, ENERGY_LABEL, type Energy, type Task } from '../lib/types'

const DURATIONS = [15, 30, 45, 60, 90, 120]

function minutesToTimeValue(minute: number | null): string {
  if (minute === null) return ''
  const h = Math.floor(minute / 60)
  const m = minute % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Tapping a task opens this. Everything about a task is editable in one
 * place, including whether it is one of today's two, which previously had no
 * control at all.
 */
export function TaskSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const update = useUpdateTask()
  const remove = useDeleteTask()

  const [title, setTitle] = useState(task.title)
  const [minutes, setMinutes] = useState(task.duration_minutes)
  const [energy, setEnergy] = useState<Energy>(task.energy)
  const [at, setAt] = useState(minutesToTimeValue(task.start_minute))
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const done = task.status === 'done'
  const isTwo = task.counts_today

  async function save() {
    await update.mutateAsync({
      id: task.id,
      title: title.trim() || task.title,
      duration_minutes: minutes,
      energy,
      start_minute: at ? timeToMinutes(at) : null,
      pinned: at !== '',
    })
    onClose()
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 font-display text-xs ${
      active ? 'border-sun bg-sun text-ground' : 'border-hairline text-soft'
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${task.title}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-hairline
                   bg-panel p-5 sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Title"
            className="w-full rounded-lg border border-transparent bg-transparent text-xl text-ink
                       hover:border-hairline focus:border-sun"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-soft"
          >
            &times;
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => update.mutate({ id: task.id, counts_today: !isTwo })}
            className={`rounded-full border px-4 py-2 font-display text-sm ${
              isTwo ? 'border-sun bg-sun text-ground' : 'border-sun/50 text-sun'
            }`}
          >
            {isTwo ? 'One of today’s two' : 'Make this one of today’s two'}
          </button>
          <button
            type="button"
            onClick={() =>
              update.mutate({
                id: task.id,
                status: done ? 'planned' : 'done',
                completed_at: done ? null : new Date().toISOString(),
              })
            }
            className={`rounded-full border px-4 py-2 font-display text-sm ${
              done ? 'border-tide bg-tide text-ground' : 'border-hairline text-soft'
            }`}
          >
            {done ? 'Done' : 'Tick it off'}
          </button>
        </div>

        <fieldset className="mt-5">
          <legend className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
            How long
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DURATIONS.map((m) => (
              <button key={m} type="button" aria-pressed={minutes === m}
                      onClick={() => setMinutes(m)} className={chip(minutes === m)}>
                {m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} hr` : `${(m / 60).toFixed(1)} hr`}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
            What kind
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ENERGIES.map((e) => (
              <button key={e} type="button" aria-pressed={energy === e}
                      onClick={() => setEnergy(e)} className={chip(energy === e)}>
                {ENERGY_LABEL[e]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5">
          <label htmlFor="sheet-at" className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
            Time
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="sheet-at"
              type="time"
              step={1800}
              value={at}
              onChange={(e) => setAt(e.target.value)}
              className="rounded-lg border border-hairline bg-ground px-3 py-2.5 text-ink"
            />
            {at && (
              <button
                type="button"
                onClick={() => setAt('')}
                className="rounded-full border border-hairline px-3 py-2 font-display text-xs text-soft"
              >
                Clear it
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-soft">
            {at
              ? `Sits at ${formatClock(timeToMinutes(at))} and stays there.`
              : 'With no time it comes off the grid and waits to be placed.'}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={update.isPending}
            className="rounded-full bg-sun px-5 py-2.5 font-display text-sm font-semibold text-ground disabled:opacity-50"
          >
            {update.isPending ? 'Saving' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-4 py-2.5 font-display text-sm text-soft"
          >
            Never mind
          </button>
          <span className="grow" />
          {confirmingDelete ? (
            <button
              type="button"
              onClick={async () => {
                await remove.mutateAsync(task.id)
                onClose()
              }}
              className="rounded-full border border-hairline px-4 py-2.5 font-display text-sm text-ink"
            >
              Really, off the list
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-full border border-hairline px-4 py-2.5 font-display text-sm text-soft"
            >
              Off the list
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
