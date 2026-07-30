import { useState, type FormEvent } from 'react'
import { useAddTask } from '../lib/queries'
import { ENERGIES, ENERGY_LABEL, type Energy } from '../lib/types'
import { timeToMinutes } from '../lib/time'

const DURATIONS = [15, 30, 45, 60, 90]

/**
 * Adding something by hand. Title, how long, and which of the three types.
 * Everything else is optional, and leaving the time blank hands the placing
 * to the scheduler.
 */
export function AddTask({ date }: { date: string }) {
  const add = useAddTask()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [energy, setEnergy] = useState<Energy>('chosen')
  const [at, setAt] = useState('')
  const [due, setDue] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    await add.mutateAsync({
      title: title.trim(),
      energy,
      duration_minutes: minutes,
      scheduled_date: date,
      start_minute: at ? timeToMinutes(at) : null,
      due_date: due || null,
    })
    setTitle('')
    setAt('')
    setDue('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-7 w-full rounded-xl border border-dashed border-hairline py-3
                   font-display text-sm text-soft hover:border-sun hover:text-sun"
      >
        Add something
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 rounded-xl border border-hairline bg-panel p-4">
      <label htmlFor="title" className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
        What is it
      </label>
      <input
        id="title"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Call the vet"
        className="mt-2 w-full rounded-lg border border-hairline bg-ground px-3 py-2.5 text-ink placeholder:text-soft/70"
      />

      <fieldset className="mt-4">
        <legend className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
          How long
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={minutes === m}
              onClick={() => setMinutes(m)}
              className={`rounded-full border px-3 py-1.5 font-display text-xs ${
                minutes === m ? 'border-sun bg-sun text-ground' : 'border-hairline text-soft'
              }`}
            >
              {m < 60 ? `${m} min` : m === 60 ? '1 hour' : '1.5 hours'}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
          What kind
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ENERGIES.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={energy === e}
              onClick={() => setEnergy(e)}
              className={`rounded-full border px-3 py-1.5 font-display text-xs ${
                energy === e ? 'border-sun bg-sun text-ground' : 'border-hairline text-soft'
              }`}
            >
              {ENERGY_LABEL[e]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="at" className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
            At a set time, if it has one
          </label>
          <input
            id="at"
            type="time"
            step={1800}
            value={at}
            onChange={(e) => setAt(e.target.value)}
            className="mt-2 w-full rounded-lg border border-hairline bg-ground px-3 py-2.5 text-ink"
          />
        </div>
        <div>
          <label htmlFor="due" className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
            Needs doing by
          </label>
          <input
            id="due"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="mt-2 w-full rounded-lg border border-hairline bg-ground px-3 py-2.5 text-ink"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-soft">
        Leave the time blank and it gets placed wherever there is room.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={add.isPending || !title.trim()}
          className="rounded-full bg-sun px-5 py-2.5 font-display text-sm font-semibold text-ground disabled:opacity-50"
        >
          {add.isPending ? 'Adding' : 'Add it'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-hairline px-4 py-2.5 font-display text-sm text-soft"
        >
          Never mind
        </button>
      </div>
      {add.isError && (
        <p role="alert" className="mt-3 text-sm text-ink">
          That did not save. {(add.error as Error).message}
        </p>
      )}
    </form>
  )
}
