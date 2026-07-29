# Decisions

Running record of what is settled and what is still open. Anything here
overrides docs/SPEC.md, which is the original build spec and is not edited.

## Settled

### Setup
- No Supabase project exists yet. Create one during phase 1.
- Week starts Monday for quota counting.

### Weekends
- Nothing appears on Saturday or Sunday unless she puts it there by hand.
- This replaces the "daily non-negotiables render as a checklist" line in
  SPEC.md section 4. Weekends are genuinely blank.

### Morning check-in conditions
Ask three things each morning, plus the gym question below:
- Achilles: good, tender, painful
- Mood
- Energy

### Gym
- With Ty: 5:30am to 6:30am.
- On her own: sleeps until 6:30, goes at about 8:30am.
- She decides on the morning. The check-in card asks "with Ty, later on my
  own, or rest day" and the scheduler rebuilds the day from the answer.
- Open question below about what solo days do to the 9:30 to 1:00 focus window.

### Weekly check-in
- Wednesday evening, covering the previous Thursday through that Wednesday.
- This is separate from the Monday to Sunday quota week. Both exist.
- Replaces the three options floated in SPEC.md section 14 item 1.

### Protected open time
Reserve two windows, and leave the rest alone:
- 2:00pm to 4:00pm
- After dinner, from about 7:00pm

Do not protect 4:00pm to 6:30pm. That is cooking, errands, and dinner.
This replaces the "biased toward late afternoon and evening" line in
SPEC.md section 7 pass 5, which collided with the dinner block.

### The swing
Gate it on rain and cloud cover, not temperature alone. Open-Meteo returns
cloud cover, precipitation, and a weather code in the same free call.

Offer the swing when it is not raining, and either:
- under 85F, or
- under 92F when it is overcast

When it is gated out, say why. "Swing is out, it is raining."
This replaces the flat 85F placeholder in SPEC.md section 14 item 3.

### The three energy types
- chosen
- upkeep
- big kid stuff

"Big kid stuff" replaces "obligation", which read as a bill rather than
something you did. It covers therapy, AA, meetings, and job applications.
The database enum value is 'big_kid_stuff'. In UI copy it is lower case,
"big kid stuff", per the sentence case rule.

### Weeks vary, and the app should show that
Some weeks run heavy on big kid stuff and some run mostly chosen. Three
things follow:

- Protected open time is reserved before anything optional gets placed, so
  a heavy week eats into optional work rather than into open time.
- The weekly chosen total still only goes up. On a heavy week it just grows
  more slowly. Never show a shortfall, a target, or a comparison to last week.
- The month view is the place the variation is visible. A heavy week reads as
  a thick band of big kid stuff, a light week reads mostly chosen.

### Supabase project settings
- Enable Data API: on. supabase-js needs it.
- Automatically expose new tables: on.
- Enable automatic RLS: on. Every table gets RLS in the migration anyway,
  and this makes it automatic for anything added later.
- Region: West US.

### One-off tasks
Life does not run off templates, so a typed-in task carries its own rules.
Migration 0002 adds three columns to tasks:

- kind, defaulting to flexible, so the scheduler knows how to place it
- constraints, the same closed vocabulary templates use
- due_date, optional

Adding a task asks for a title, a rough duration, and which of the three
energy types it is. Everything else is optional. A due date is never
rendered as being late or overdue, it only raises the placement score as it
gets closer.

This also fixes a gap in the spec. Pass 7 weights deadlineProximity at 3,
and nothing stored a deadline, so that term was always reading nothing.

### What a due date does once it passes
Chosen by Claude, flagged as easy to change once there is a feel for it.

- A past due date never renders. No red, no "overdue", no count of days.
  While the date is still ahead it shows quietly as "by Friday". The moment
  it passes, the date stops being displayed at all.
- The placement score stops climbing at the due date. It sits at the top
  weighting and stays there rather than escalating every day, so one old
  task cannot crowd out everything else.
- The task keeps getting placed, high in the order, until it is done or let
  go.
- It appears in the morning catch-up card like anything else that slipped,
  with Today, This week, and Let it go. Deciding is final and it never asks
  twice.

The reasoning: the due date is an input to the scheduler, not a badge on the
task. Its whole job is to pull work earlier. Once it has done that job there
is nothing useful left to say, and saying it anyway would just be a countdown
in disguise.

### Job applications
Keep the spec as written. 10 a week, maximum 3 in a day.

### Reorganizing
Stays tagged as chosen. Report how much of the weekly chosen total is
reorganizing so the tag can be revisited with real data.
Settles SPEC.md section 14 item 4.

### The 4pm dinner check
Start with an in-app prompt the first time she opens the app at or after
4pm. Phone notifications and text messages are both possible later. Texting
needs Twilio at roughly $1.50 a month plus a scheduled job on the server
side, so it is not a phase 5 item.

### Visual direction
Daylight, in natural colours, on the Shoreline ground, using the Ballast
typefaces.
- Ground: Shoreline. Deep water ground, cool blue dawn, pale sand at noon,
  warm low sun, teal night. Chosen partly for legibility, since the pale
  midday gives the strongest contrast for text sitting on the light.
- Bricolage Grotesque for every number and label
- Newsreader for task names and body text
- No purple anywhere
- The day runs 5:30am to 10:30pm so the early gym fits
- Light runs cool green dawn, warm daylight, amber, green dusk
- See design/daylight.html

## Open

1. Solo gym days put her at her desk around 10:05, which eats into the 9:30
   to 1:00 focus window. Accept it, or shift focused work later on those days.
2. Pass 7 scoring weights. Still guesses until there are real weeks to tune
   against. SPEC.md section 14 item 2.
