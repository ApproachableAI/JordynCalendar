import { formatClock, formatDuration } from '../lib/time'
import { openSpans } from '../lib/openTime'
import type { ProtectedWindow, Task } from '../lib/types'

/**
 * The grid. Drawn at true scale, so a 30 minute block really is half the
 * height of an hour one.
 *
 * Daylight direction on the Shoreline ground. The track carries the arc of
 * the day, scheduled work is a silhouette cut into it, and open time is
 * simply where nothing blocks the light.
 */

const SKY_STOPS = [
  [0, '#1F3F4C'], [0.06, '#47707A'], [0.12, '#8FA98C'], [0.2, '#C9CE97'],
  [0.3, '#E9E4B4'], [0.4, '#F6F2D8'], [0.5, '#EFE6BE'], [0.62, '#E0C68E'],
  [0.72, '#CB9C63'], [0.8, '#A9704C'], [0.87, '#5E5A4E'], [0.93, '#2A4A4C'],
  [1, '#10262A'],
] as const

function sky(): string {
  const stops = SKY_STOPS.map(([at, colour]) => `${colour} ${(at * 100).toFixed(0)}%`)
  return `linear-gradient(180deg, ${stops.join(', ')})`
}

/** Past about four fifths of the day the light is too low for dark text. */
function isDim(fraction: number): boolean {
  return fraction < 0.1 || fraction > 0.85
}

const ENERGY_STYLE: Record<Task['energy'], string> = {
  chosen: 'bg-[rgba(16,46,48,0.74)] border-[rgba(239,196,116,0.42)]',
  upkeep: 'bg-[rgba(11,31,35,0.86)] border-white/10',
  big_kid_stuff: 'bg-[rgba(6,20,23,0.93)] border-[rgba(121,181,168,0.4)]',
}

export type DayGridProps = {
  tasks: Task[]
  wakeMinute: number
  sleepMinute: number
  protectedWindows: ProtectedWindow[]
  pixelsPerMinute?: number
  nowMinute?: number | null
  onSelect?: (task: Task) => void
  compact?: boolean
}

export function DayGrid({
  tasks,
  wakeMinute,
  sleepMinute,
  protectedWindows,
  pixelsPerMinute = 0.95,
  nowMinute = null,
  onSelect,
  compact = false,
}: DayGridProps) {
  const span = sleepMinute - wakeMinute
  const height = span * pixelsPerMinute
  const spans = openSpans(tasks, wakeMinute, sleepMinute, protectedWindows)
  const placed = tasks.filter((t) => t.start_minute !== null)

  const top = (minute: number) => (minute - wakeMinute) * pixelsPerMinute

  // Hour rules start at the first whole hour after waking.
  const firstHour = Math.ceil(wakeMinute / 60) * 60
  const hours: number[] = []
  for (let m = firstHour; m <= sleepMinute; m += 60) hours.push(m)

  return (
    <div className="flex">
      {!compact && (
        <div className="relative w-14 shrink-0" style={{ height }}>
          {hours.map((m) => (
            <span
              key={m}
              className="absolute right-3 -translate-y-1/2 font-display text-[10px] tracking-wide text-soft tabular-nums"
              style={{ top: top(m) }}
            >
              {formatClock(m)}
            </span>
          ))}
        </div>
      )}

      <div
        className="relative flex-1 overflow-hidden rounded-xl"
        style={{ height, background: sky() }}
      >
        {hours.map((m) => (
          <div
            key={m}
            className="absolute inset-x-0 h-px bg-black/10"
            style={{ top: top(m) }}
          />
        ))}

        {spans.map((s) => {
          const fraction = (s.startMinute + s.minutes / 2 - wakeMinute) / span
          const dim = isDim(fraction)
          const spanHeight = s.minutes * pixelsPerMinute
          const oneLine = spanHeight < 74
          // Too short to hold a label without spilling onto its neighbours.
          if (spanHeight < 22) return null
          return (
            <div
              key={s.startMinute}
              className={[
                'absolute inset-x-0 flex overflow-hidden px-4',
                oneLine ? 'flex-row items-center gap-3' : 'flex-col justify-start py-2',
                s.protected ? 'rounded-lg border border-dashed' : '',
                s.protected && dim ? 'border-sun/40' : '',
                s.protected && !dim ? 'border-[rgba(46,36,16,0.4)]' : '',
              ].join(' ')}
              style={{ top: top(s.startMinute), height: spanHeight }}
            >
              <span
                className={[
                  'font-display font-bold tracking-tight',
                  oneLine ? 'text-base' : 'text-2xl',
                  dim ? 'text-sun' : 'text-onlight',
                ].join(' ')}
                style={dim ? undefined : { textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}
              >
                {formatDuration(s.minutes)} open
              </span>
              {!oneLine && s.minutes >= 110 && (
                <span className={dim ? 'mt-1 text-xs text-soft' : 'mt-1 text-xs text-onlight-soft'}>
                  {s.protected ? 'held for you, nothing gets placed here' : 'yours'}
                </span>
              )}
            </div>
          )
        })}

        {placed.map((t) => {
          const start = t.start_minute as number
          const isTwo = t.counts_today
          const done = t.status === 'done'
          const blockHeight = t.duration_minutes * pixelsPerMinute
          const tiny = blockHeight < 24
          const showTitle = blockHeight >= 13
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect?.(t)}
              className={[
                'absolute inset-x-0 flex flex-col justify-center overflow-hidden rounded-lg border px-3 text-left',
                tiny ? 'py-0' : 'py-1',
                ENERGY_STYLE[t.energy],
                isTwo ? 'border-2 border-sun shadow-[0_0_28px_rgba(239,196,116,0.4)]' : '',
                done ? 'opacity-60' : '',
              ].join(' ')}
              style={{ top: top(start), height: blockHeight }}
            >
              {showTitle && (
                <span
                  className={[
                    'block truncate leading-tight text-ink',
                    tiny ? 'text-[10.5px]' : 'text-[13.5px]',
                    done ? 'line-through decoration-sun/70' : '',
                  ].join(' ')}
                >
                  {t.title}
                </span>
              )}
              {blockHeight >= 38 && (
                <span className="block truncate font-display text-[10px] tracking-wide text-soft">
                  {formatClock(start)}
                  {t.pinned ? ' · you put this here' : ''}
                </span>
              )}
            </button>
          )
        })}

        {nowMinute !== null && nowMinute >= wakeMinute && nowMinute <= sleepMinute && (
          <div
            className="absolute inset-x-0 z-10 h-0.5 bg-tide"
            style={{ top: top(nowMinute) }}
          >
            <span className="absolute right-2 -top-2 rounded-full bg-tide px-1.5 font-display text-[9px] font-bold tracking-widest text-ground">
              now
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
