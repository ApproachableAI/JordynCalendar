import { useInbox } from '../lib/queries'
import { useUi } from '../lib/ui'
import { BrainDumpList } from '../views/BrainDump'

/**
 * The list sits beside whatever view is open rather than living on its own
 * tab, so a gap and the thing that could fill it are visible at the same
 * time. It collapses when it gets to be too much.
 *
 * Wide screens dock it to the right. Narrow ones bring it up from the bottom,
 * where a fixed rail would leave no room for the grid.
 */
export function ListPanel({ today }: { today: string }) {
  const { listOpen, setListOpen } = useUi()

  if (!listOpen) return null

  return (
    <>
      {/* Only the small screen version needs to dim what is behind it. */}
      <div
        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        onClick={() => setListOpen(false)}
        role="presentation"
      />
      <aside
        aria-label="Everything on your mind"
        className="fixed inset-x-0 bottom-0 z-40 max-h-[76vh] overflow-y-auto
                   rounded-t-2xl border-t border-hairline bg-panel
                   lg:sticky lg:top-0 lg:z-auto lg:max-h-none lg:h-screen
                   lg:w-[350px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0"
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-hairline bg-panel px-5 py-3">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft">
            The list
          </span>
          <button
            type="button"
            onClick={() => setListOpen(false)}
            className="rounded-full border border-hairline px-3 py-1 font-display text-[11px] text-soft"
          >
            Hide
          </button>
        </div>
        <BrainDumpList today={today} />
      </aside>
    </>
  )
}

/** The control that brings it back, with a count so it is worth glancing at. */
export function ListToggle() {
  const { listOpen, toggleList } = useUi()
  const inbox = useInbox()
  const count = inbox.data?.length ?? 0

  return (
    <button
      type="button"
      onClick={toggleList}
      aria-pressed={listOpen}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-display text-[11px] uppercase tracking-[0.1em] ${
        listOpen ? 'bg-sun text-ground' : 'border border-hairline text-soft'
      }`}
    >
      List
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 text-[10px] tabular-nums ${
            listOpen ? 'bg-ground/20 text-ground' : 'bg-sun/20 text-sun'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}
