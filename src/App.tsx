import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { addDays, format, parseISO } from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { supabase } from './lib/supabase'
import { SignIn } from './SignIn'
import { DayView } from './views/DayView'
import { WeekView } from './views/WeekView'
import { ListPanel, ListToggle } from './components/ListPanel'

const ZONE = 'America/Denver'

/** Today where she is, not where the server is. */
function todayInZone(): string {
  return formatInTimeZone(new Date(), ZONE, 'yyyy-MM-dd')
}

function minutesNowInZone(): number {
  const local = toZonedTime(new Date(), ZONE)
  return local.getHours() * 60 + local.getMinutes()
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState<'day' | 'week'>('day')
  const [date, setDate] = useState(todayInZone)
  const [now, setNow] = useState(minutesNowInZone)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => setSession(next))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(minutesNowInZone()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (checking) return null
  if (!session) return <SignIn />

  const isToday = date === todayInZone()

  return (
    <div className="min-h-full">
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDate(format(addDays(parseISO(date), -1), 'yyyy-MM-dd'))}
            aria-label="Previous day"
            className="rounded-full border border-hairline px-2.5 py-1 text-soft"
          >
            &larr;
          </button>
          <span className="font-display text-xs uppercase tracking-[0.1em] text-soft">
            {format(parseISO(date), 'EEEE, d MMMM')}
          </span>
          <button
            type="button"
            onClick={() => setDate(format(addDays(parseISO(date), 1), 'yyyy-MM-dd'))}
            aria-label="Next day"
            className="rounded-full border border-hairline px-2.5 py-1 text-soft"
          >
            &rarr;
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(todayInZone())}
              className="rounded-full border border-hairline px-3 py-1 font-display text-[11px] text-soft"
            >
              Back to today
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {(['day', 'week'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`rounded-full px-3.5 py-1.5 font-display text-[11px] uppercase tracking-[0.1em] ${
                view === v
                  ? 'bg-sun text-ground'
                  : 'border border-hairline text-soft'
              }`}
            >
              {v}
            </button>
          ))}
          <ListToggle />
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="ml-2 rounded-full border border-hairline px-3 py-1.5 font-display text-[11px] text-soft"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="flex items-start">
        <main className="min-w-0 grow">
          {view === 'day' && <DayView date={date} nowMinute={isToday ? now : null} />}
          {view === 'week' && (
            <WeekView
              date={date}
              onPickDay={(d) => {
                setDate(d)
                setView('day')
              }}
            />
          )}
        </main>
        <ListPanel today={todayInZone()} />
      </div>
    </div>
  )
}
