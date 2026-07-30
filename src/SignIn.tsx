import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

type Mode = 'password' | 'link'

/**
 * Sign in. Password by default, because Supabase's built in email is rate
 * limited and lands in spam often enough to be annoying. The magic link is
 * still there for when the password has been forgotten.
 */
export function SignIn() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setProblem(null)

    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setBusy(false)
      if (error) {
        setProblem(
          error.message.toLowerCase().includes('invalid')
            ? 'That email and password did not match. Try again, or email yourself a link instead.'
            : error.message,
        )
      }
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) {
      setProblem(`That link could not be sent. ${error.message}`)
      return
    }
    setSent(true)
  }

  const field =
    'w-full rounded-lg border border-hairline bg-panel px-4 py-3 text-ink placeholder:text-soft/70 focus:border-sun'
  const legend =
    'font-display text-[10px] font-bold uppercase tracking-[0.16em] text-soft'

  return (
    <main className="grid min-h-full place-items-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-5xl leading-none tracking-tight text-sun">
          Your calendar
        </h1>
        <p className="mt-3 text-soft">Sign in and it picks up where you left off.</p>

        {sent ? (
          <div className="mt-8 rounded-xl border border-sun/40 bg-sun/10 p-4">
            <p className="text-ink">Check your email. The link signs you straight in.</p>
            <p className="mt-2 text-sm text-soft">
              Nothing after a minute or two, look in spam.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setMode('password')
              }}
              className="mt-3 font-display text-sm text-sun underline"
            >
              Use a password instead
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className={legend}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-2 ${field}`}
                placeholder="you@example.com"
              />
            </div>

            {mode === 'password' && (
              <div>
                <label htmlFor="password" className={legend}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`mt-2 ${field}`}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-full bg-sun px-5 py-3 font-display text-sm font-semibold text-ground disabled:opacity-60"
            >
              {busy ? 'One moment' : mode === 'password' ? 'Sign in' : 'Send me a link'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'password' ? 'link' : 'password')
                setProblem(null)
              }}
              className="font-display text-sm text-soft underline"
            >
              {mode === 'password' ? 'Email me a link instead' : 'Use a password instead'}
            </button>

            {problem && (
              <p role="alert" className="text-sm text-ink">
                {problem}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
