# Calendar App

A scheduling app built around surplus rather than scarcity. Full spec in docs/SPEC.md.

## Product rules (do not violate)
- Open time is the headline metric on every view. Never booked or remaining time.
- Nothing counts down. Totals go up.
- The scheduler reserves open time before placing optional work, and never fills a day.
- Energy windows are placement preferences. They never block a task from being scheduled.
- Empty slots are invitations with a one-click fill action.
- Catch-up decisions happen once, in the morning card. Never during the day, never at night.
- No scarcity language. No "only X left", no "behind", no red for lateness, no counts of
  things not done. Use "Let it go" and "Off the list".
- No streaks. A broken streak is a scarcity mechanic and fights the premise.

## Architecture rules
- src/scheduler/ is pure. No React, no Supabase, no Date.now() inside it.
- The scheduler is deterministic. Seed tiebreaks with the date string.
- All date math goes through date-fns.
- Server state in TanStack Query, local UI state in Zustand. No duplication.
- RLS on every table, filtering on user_id = auth.uid().

## Testing
- Scheduler changes require tests first.
- Every row of the SPEC.md section 6 mapping table has a test.
- Run `npm test` before calling a phase done.

## Writing
- Sentence case, active voice, plain verbs.
- No em dashes anywhere: code comments, commit messages, UI copy.
- Never use the "not X, but Y" sentence structure.

## Design
Visual direction is being chosen from design/directions.html, which renders one
Tuesday three ways. Nothing is committed yet. See SPEC.md section 11.
