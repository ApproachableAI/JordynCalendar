import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { SignIn } from './SignIn'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (checking) return null
  if (!session) return <SignIn />

  return (
    <main className="p-8">
      <p className="font-display text-xs uppercase tracking-[0.16em] text-soft">
        Signed in as {session.user.email}
      </p>
      <h1 className="mt-4 font-display text-5xl tracking-tight text-sun">
        The grid lands in phase two
      </h1>
      <p className="mt-3 max-w-prose text-soft">
        Phase one is the database and the seed data. Run npm run verify to see
        every seeded row printed as a plain table.
      </p>
      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-8 rounded-full border border-hairline px-4 py-2 font-display text-sm text-soft"
      >
        Sign out
      </button>
    </main>
  )
}
