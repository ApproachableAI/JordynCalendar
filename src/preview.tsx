import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { DayGrid } from './components/DayGrid'
import { ListPanel } from './components/ListPanel'
import { OpenHeader } from './components/OpenHeader'
import { TodaysTwo } from './components/TodaysTwo'
import { balance, openSpans, todaysTwo, totalOpenMinutes } from './lib/openTime'
import type { ProtectedWindow, Task } from './lib/types'

/**
 * A design harness. Renders the real components against fixed data so the
 * layout can be looked at without a database or a signed in session. Dev
 * only, since vite builds index.html and nothing else.
 */

let n = 0
const t = (
  title: string,
  start: number | null,
  dur: number,
  energy: Task['energy'],
  extra: Partial<Task> = {},
): Task => ({
  id: String(n++), user_id: 'u', template_id: null, title, energy, intensity: 1,
  kind: 'flexible', scheduled_date: '2026-07-30', start_minute: start,
  duration_minutes: dur, status: 'planned', completed_at: null, counts_today: false,
  immovable: false, pinned: false, follows_task_id: null, due_date: null, note: null,
  ...extra,
})

const tasks: Task[] = [
  t('Gym with Ty', 330, 60, 'chosen'),
  t('Coffee with Ty', 405, 75, 'upkeep', { pinned: true }),
  t('Shower and get ready', 480, 35, 'upkeep'),
  t('Breakfast', 515, 15, 'upkeep'),
  t('Job application, Rowan', 570, 60, 'big_kid_stuff', { counts_today: true }),
  t('Therapy with Sandra', 680, 60, 'big_kid_stuff', { immovable: true }),
  t('Lunch', 750, 30, 'upkeep'),
  t('Reading, the fun one', 870, 45, 'chosen'),
  t('Dinner decision', 960, 20, 'upkeep'),
  t('Cooking', 1020, 60, 'chosen'),
  t('Kitchen cleanup', 1080, 20, 'upkeep'),
  t('Dinner with Ty', 1100, 40, 'chosen'),
  t('Reading, the useful one', 1260, 60, 'chosen', { counts_today: true }),
  t('Achilles PM', 1320, 20, 'upkeep'),
  t('Ten minute tidy', 1340, 10, 'upkeep'),
]

const windows: ProtectedWindow[] = [
  { id: 'a', label: 'Early afternoon', start_time: '14:00:00', end_time: '16:00:00', min_minutes: 90, sort_order: 1 },
  { id: 'b', label: 'After dinner', start_time: '19:00:00', end_time: '22:00:00', min_minutes: 120, sort_order: 2 },
]

const WAKE = 330
const SLEEP = 1350
const TODAY = '2026-07-30'
const spans = openSpans(tasks, WAKE, SLEEP, windows)

const qc = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
})
qc.setQueryData(['profile'], {
  id: 'u', wake_time: '05:30:00', sleep_time: '22:30:00', timezone: 'America/Denver',
  protected_open_minutes: 120, soft_daily_cap_minutes: 300,
  default_buffer_minutes: 10, schedules_weekends: false,
})
qc.setQueryData(['protected_windows'], windows)
qc.setQueryData(['tasks', '2026-07-27', '2026-08-02'], tasks)
qc.setQueryData(['inbox'], [
  { ...t('Call the vet', null, 15, 'upkeep'), scheduled_date: null },
  { ...t('Renew the car registration', null, 45, 'big_kid_stuff'), scheduled_date: null },
  { ...t('Reply to Mum', null, 15, 'upkeep'), scheduled_date: null },
  { ...t('Find a birthday present for Ty', null, 60, 'chosen'), scheduled_date: null },
])

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}>
    <div className="flex items-start">
      <main className="min-w-0 grow px-8 py-8">
        <OpenHeader
          openMinutes={totalOpenMinutes(spans)}
          balance={balance(tasks)}
          dayMinutes={SLEEP - WAKE}
          chosenThisWeek={675}
        />
        <TodaysTwo two={todaysTwo(tasks)} />
        <div className="mt-8">
          <DayGrid
            tasks={tasks}
            wakeMinute={WAKE}
            sleepMinute={SLEEP}
            protectedWindows={windows}
            nowMinute={1000}
          />
        </div>
      </main>
      <ListPanel today={TODAY} />
    </div>
  </QueryClientProvider>,
)
