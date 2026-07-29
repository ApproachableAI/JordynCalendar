import { durationParts } from '../lib/time'
import { ENERGY_LABEL, ENERGIES, type Energy } from '../lib/types'
import { formatDuration } from '../lib/time'

const SEGMENT: Record<Energy, string> = {
  chosen: 'bg-chosen',
  upkeep: 'bg-upkeep',
  big_kid_stuff: 'bg-bigkid',
}

/**
 * Open time is the largest thing on the page. The three energy segments sit
 * under it as a thin bar, and whatever is left of the bar is open.
 */
export function OpenHeader({
  openMinutes,
  balance,
  dayMinutes,
  chosenThisWeek,
}: {
  openMinutes: number
  balance: Record<Energy, number>
  dayMinutes: number
  chosenThisWeek: number
}) {
  return (
    <header>
      <div className="flex flex-wrap items-end gap-x-7 gap-y-2">
        <div className="flex items-baseline font-display font-extrabold leading-[0.84] tracking-[-0.045em] text-sun tabular-nums [text-shadow:0_0_46px_rgba(239,196,116,0.32)]">
          {durationParts(openMinutes).map((p) => (
            <span key={p.unit} className="flex items-baseline">
              <span className="text-[clamp(66px,11.5vw,124px)]">{p.value}</span>
              <span className="ml-1 mr-3 font-semibold text-soft text-[clamp(21px,3.7vw,40px)]">
                {p.unit}
              </span>
            </span>
          ))}
        </div>
        <p className="pb-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-sun">
          open today
        </p>
        <p className="pb-2 text-sm text-soft">
          chosen time this week{' '}
          <b className="tabular-nums text-ink">{formatDuration(chosenThisWeek)}</b>{' '}
          <span className="text-tide">&#9650;</span>
        </p>
      </div>

      <div className="mt-6">
        <div className="flex h-[7px] w-full overflow-hidden rounded-full bg-hairline">
          {ENERGIES.map((e) => (
            <i
              key={e}
              className={`block h-full ${SEGMENT[e]}`}
              style={{ width: `${dayMinutes ? (balance[e] / dayMinutes) * 100 : 0}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-display text-[11px] tracking-wide text-soft">
          {ENERGIES.map((e) => (
            <span key={e} className="flex items-center gap-1.5">
              <b className={`block size-2 rounded-full ${SEGMENT[e]}`} />
              {ENERGY_LABEL[e]} {formatDuration(balance[e])}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <b className="block size-2 rounded-full border border-sun" />
            open {formatDuration(openMinutes)}
          </span>
        </div>
      </div>
    </header>
  )
}
