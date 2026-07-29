import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

/**
 * Sign in with a magic link. One user today, built on Supabase auth so it can
 * be shared later. No password to remember and nothing to reset.
 */
export function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setProblem(null)

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

  return (
    <main className="grid min-h-full place-items-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl leading-none tracking-tight text-sun">
          Your calendar
        </h1>
        <p className="mt-3 text-soft">
          Sign in and it picks up where you left off.
        </p>

        {sent ? (
          <p className="mt-8 rounded-xl border border-sun/40 bg-sun/10 p-4 text-ink">
            Check your email. The link signs you straight in.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
            <label htmlFor="email" className="font-display text-xs uppercase tracking-[0.16em] text-soft">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-hairline bg-panel px-4 py-3 text-ink
                         placeholder:text-soft focus:border-sun"
              placeholder="you@example.com"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-2 rounded-full bg-sun px-5 py-3 font-display text-sm font-semibold
                         text-ground disabled:opacity-60"
            >
              {busy ? 'Sending' : 'Send me a link'}
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
