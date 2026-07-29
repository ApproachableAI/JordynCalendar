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
Daylight, in natural colours, using the Ballast typefaces.
- Bricolage Grotesque for every number and label
- Newsreader for task names and body text
- No purple anywhere
- The day runs 5:30am to 10:30pm so the early gym fits
- Light runs cool green dawn, warm daylight, amber, green dusk
- See design/daylight.html

## Open

1. Which ground: Meadow or Shoreline. Canyon is out. The ground is a single
   set of tokens, so this can be switched later without touching layout.
2. What to call the third energy type. "Obligation" is too heavy. Candidates
   are commitment, promised, standing, out in the world. Leaning commitment.
   This is a database enum value, so decide before the first migration.
3. Job applications are capped at 3 a day in SPEC.md, but she described doing
   4 one day and 6 another. Raise the cap, or drop the daily cap and track
   only the weekly 10.
4. Solo gym days put her at her desk around 10:05, which eats into the 9:30
   to 1:00 focus window. Accept it, or shift focused work later on those days.
5. Pass 7 scoring weights. Still guesses until there are real weeks to tune
   against. SPEC.md section 14 item 2.
