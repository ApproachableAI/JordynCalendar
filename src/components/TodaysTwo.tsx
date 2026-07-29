import { formatClock, formatDuration } from '../lib/time'
import type { Task } from '../lib/types'

/**
 * The success condition for the day. Real visual weight, set apart from
 * everything else. A day where both landed and nine other things slipped
 * still reads as a good day.
 */
export function TodaysTwo({ two }: { two: Task[] }) {
  if (two.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-hairline p-4">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
          Today&rsquo;s two
        </p>
        <p className="mt-1 text-soft">
          Pick one or two things that would make today a good day. Tap any task
          to mark it.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {two.map((t, i) => (
        <div
          key={t.id}
          className="rounded-xl border border-sun/35 bg-gradient-to-br from-sun/20 to-tide/[0.06] p-4"
        >
          <span className="block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-sun">
            Today&rsquo;s two &middot; {i === 0 ? 'one' : 'two'}
          </span>
          <span className="mt-1.5 block text-lg leading-snug text-ink">{t.title}</span>
          <span className="mt-1.5 block text-xs text-soft">
            {t.start_minute !== null ? `${formatClock(t.start_minute)} · ` : ''}
            {formatDuration(t.duration_minutes)}
            {t.status === 'done' ? ' · landed' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
