# Calendar App — Build Spec for Claude Code

Version 2. Hand this to Claude Code in pieces. Section 12 has the copy-paste prompts and the build order. Sections 1 through 11 are reference material that should live in the repo at `docs/SPEC.md`.

---

## 1. The thesis

Standard calendars are depletion meters. They start with a full day and show it draining. Every event you add makes the visible remainder smaller, so the emotional read of a busy week is loss.

This app inverts the meter. The primary number on every screen is open time, and the number that accumulates across the week is time spent on things you chose. Obligations are drawn small, dense, and finished. Open time is the largest visual element on the page.

Four product constraints that follow, and none of them are negotiable:

1. The headline metric on every view is open time. Never booked time, never remaining time.
2. Nothing in the UI counts down. Totals go up.
3. Empty slots render as an invitation with a one-click way to fill them from things you like.
4. The scheduler never fills a day. It reserves open time before it places optional work.

---

## 2. Stack

- **Vite + React 18 + TypeScript.** Netlify serves it as a static SPA.
- **Tailwind CSS** with a custom token layer (see section 11).
- **Supabase** for Postgres, Auth, and row level security. Single user today, built with `user_id` and RLS so it can be shared later.
- **@dnd-kit/core** for drag and drop. Handles keyboard and touch properly.
- **date-fns** and **date-fns-tz** for all date math. No raw Date arithmetic anywhere.
- **TanStack Query** for Supabase reads and optimistic writes.
- **Zustand** for local UI state only.
- **Open-Meteo** for Denver temperature. No API key needed. Used to gate one outdoor activity.

Netlify env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

---

## 3. Vocabulary

Use these exact terms in code, columns, and UI copy.

| Term | Meaning |
|---|---|
| **Template** | A repeating thing. Holds the rules. |
| **Task** | One dated instance of a template, or a one-off. |
| **Kind** | How it gets scheduled: `anchor`, `daily`, `quota`, `flexible`, `triggered`. |
| **Energy** | What it costs or gives: `chosen`, `upkeep`, `obligation`. Drives the visual language. |
| **Intensity** | 1 to 3. How much cognitive load it takes. Used as a placement preference. |
| **Condition** | A daily self-report that gates options. Achilles status is the first. |
| **Swap group** | Interchangeable options for one slot. The backup plans feature. |
| **Today's two** | The one or two tasks that define whether the day was good. |
| **Open time** | Empty slots plus slots the scheduler deliberately protected. |

### Energy

- `chosen` — reading, coloring, baking, the swing, anything done for its own sake.
- `upkeep` — meds, water, dishes, laundry, the Achilles routine. Drawn small.
- `obligation` — therapy, AA, meetings, job applications. Externally shaped.

### Intensity

- `3` — job applications, anything requiring sustained focus and decisions.
- `2` — errands, cooking, reorganizing, reading something useful.
- `1` — laundry, tidying, coloring, meds, stretching.

---

## 4. Personal profile

This is the user-specific layer. Seed it on first run.

### Shape of the day

```
~06:00 or ~07:45   Gym (early, with Ty) or solo movement after Ty leaves
07:41              Coffee with Ty, see him out
                   Shower and get ready, 35 min
                   Breakfast, sometimes just a protein drink
09:30–13:00        Sharpest. Preferred home for intensity-3 work.
13:00–14:00        Lunch, lighter.
14:00–16:00        Afternoon dip. Prefers intensity 1 to 2. Not a hard ceiling.
16:00              Second wind. Dinner decision happens here.
16:00–18:30        Domestic and hands-on. Cooking, groceries, reorganizing.
18:30 or 19:00     Dinner at home. Or out around 21:00.
Evening            Reading, nightly note, Achilles PM, 10-minute tidy.
```

Gym happens before the sharp window, so it does not eat into it. Gym days make her hungrier and change nothing else. Therapy has no drag on the rest of the day.

### Durations that reflect reality

| Thing | Real duration |
|---|---|
| Job application, start to submit | 60 min |
| Reading | 15 min floor, no ceiling. Elastic. |
| Chore at home | 30 min |
| Errand outside the house | 45 min or more |
| Shower and get ready | 35 min |
| Buffer around anything fixed | 10 min each side, automatic |
| Achilles AM and PM routine | 15 to 20 min each |

### Caps and quotas

- Roughly 5 hours of real work in a day. Treat as a soft ceiling that triggers a suggestion rather than a block.
- 10 job applications per week, max 3 in a day.
- Reading 1.5 hours a day as a floor, split across a fun book and a useful one.
- Chore or errand block 2 to 3 times a week.
- Movement rest day 1 to 2 times a week minimum, even with no pain.

### Weekends

Saturday and Sunday are free-roaming days with Ty. The scheduler places nothing. Daily non-negotiables render as a simple checklist with no times attached. She can add things by hand and the scheduler leaves them alone.

### Variable weekly anchors

Therapy with Sandra twice a week and one AA meeting. Days and times change every week. Monday's check-in card asks for this week's slots before it builds anything. Once entered they are immovable.

### Dinner

Same-day decision, made around 16:00. Two shapes:

- **Home**, eating around 18:30 or 19:00. Cooking block ahead of it, kitchen cleanup triggered behind it, grocery run inserted if needed.
- **Out**, around 21:00. Clears cooking and cleanup, opens roughly 4 PM to 9 PM. The app reports the gain.

On an out night, the Achilles PM routine and the tidy get placed before leaving.

### The chosen menu

The contents of open time. Everything here is `chosen` unless noted.

| Activity | Duration | Notes |
|---|---|---|
| Reading | 15 min to hours | Elastic. Expands into whatever is open. |
| Coloring | 20 to 45 min | Good filler. |
| Journaling | 20 to 30 min | Pairs with the nightly note. |
| Making a coffee | 15 to 20 min | Smallest good filler. |
| Sitting on the swing | 20 to 45 min | Gated on Denver temperature. |
| Cookbook browsing, recipe hunting | 20 to 45 min | Feeds the dinner decision. |
| Cooking | 45 to 75 min | Also serves dinner. Triggers kitchen cleanup. |
| Baking | 90 min minimum | Needs a real block. Triggers kitchen cleanup. |
| Reorganizing | 45 to 90 min | Sits between chosen and upkeep. Tag `chosen`. |
| Bookstore or craft store | 60 to 90 min | Out of house. Only offered with a real block. |
| Grocery store | 45 min | Tag `upkeep`. Attaches to the dinner decision. |

Small ones matter more than big ones here. A 30-minute gap should always have three good things it could become.

---

## 5. Database schema

Starting migration, `supabase/migrations/0001_init.sql`.

```sql
create extension if not exists "pgcrypto";

create type task_kind   as enum ('anchor','daily','quota','flexible','triggered');
create type energy_type as enum ('chosen','upkeep','obligation');
create type task_status as enum ('planned','done','skipped','deferred','released');

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  wake_time   time not null default '07:30',
  sleep_time  time not null default '22:30',
  timezone    text not null default 'America/Denver',
  protected_open_minutes int not null default 120,
  soft_daily_cap_minutes int not null default 300,
  default_buffer_minutes int not null default 10,
  schedules_weekends     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Placement preference by time of day. Weights, not ceilings.
create table energy_windows (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  label         text not null,
  start_time    time not null,
  end_time      time not null,
  preferred_intensity int not null check (preferred_intensity between 1 and 3),
  days          text[] default null   -- null means every day
);

create table templates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  title           text not null,
  category        text,
  kind            task_kind not null,
  energy          energy_type not null default 'upkeep',
  intensity       int not null default 2 check (intensity between 1 and 3),
  default_minutes int not null default 30,
  min_minutes     int,        -- reading: 15
  elastic         boolean not null default false,  -- expands into open time

  preferred_earliest time,
  preferred_latest   time,

  quota_count       int,
  quota_period      text check (quota_period in ('week','month')),
  quota_max_per_day int,

  constraints jsonb not null default '{}'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  template_id  uuid references templates(id) on delete set null,
  title        text not null,
  energy       energy_type not null default 'upkeep',
  intensity    int not null default 2,

  scheduled_date   date not null,
  start_minute     int,     -- minutes from midnight, multiple of 30
  duration_minutes int not null default 30,

  status       task_status not null default 'planned',
  completed_at timestamptz,
  reviewed_at  timestamptz,   -- morning catch-up card has handled it

  counts_today boolean not null default false,  -- today's two

  immovable    boolean not null default false,
  pinned       boolean not null default false,
  follows_task_id uuid references tasks(id) on delete cascade,

  swap_group_id uuid,
  deferred_from date,
  note          text,
  created_at    timestamptz not null default now()
);

create index on tasks (user_id, scheduled_date);
create index on tasks (user_id, template_id, status);
create index on tasks (user_id, status, scheduled_date) where reviewed_at is null;

create table swap_groups (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name    text not null
);

create table swap_options (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references swap_groups(id) on delete cascade,
  template_id  uuid references templates(id) on delete cascade,
  title        text not null,
  energy       energy_type not null default 'chosen',
  minutes      int not null default 30,
  min_minutes  int,
  allowed_when jsonb not null default '{}'::jsonb,
  rationale    text,
  sort_order   int not null default 0
);

create table condition_types (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  key     text not null,
  label   text not null,
  values  jsonb not null,
  ask_each_morning boolean not null default true,
  unique (user_id, key)
);

create table day_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  log_date      date not null,
  conditions    jsonb not null default '{}'::jsonb,
  dinner_plan   text check (dinner_plan in ('home','out','undecided')),
  note          text,
  two_landed    boolean,
  two_reflection text,
  unique (user_id, log_date)
);

-- Therapy, AA, anything with a real fixed time.
create table appointments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  starts_at  timestamptz not null,
  minutes    int not null default 60,
  location   text
);

-- Things that recur weekly but move. Prompts Monday's card.
create table weekly_anchors (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  title         text not null,        -- 'Therapy with Sandra'
  times_per_week int not null default 1,
  default_minutes int not null default 60,
  active        boolean not null default true
);

-- one row per anchor per week once the user fills it in
create table weekly_anchor_slots (
  id         uuid primary key default gen_random_uuid(),
  anchor_id  uuid not null references weekly_anchors(id) on delete cascade,
  week_start date not null,
  starts_at  timestamptz not null
);
```

Enable RLS on every table. Policy is `user_id = auth.uid()`, with `swap_options` and `weekly_anchor_slots` joining through their parents.

### Views

```sql
create view quota_progress as
select t.user_id, t.template_id,
       date_trunc('week', t.scheduled_date)::date as week_start,
       count(*) filter (where t.status = 'done') as completed
from tasks t where t.template_id is not null
group by 1,2,3;

create view day_balance as
select user_id, scheduled_date, energy,
       sum(duration_minutes) as minutes,
       sum(duration_minutes) filter (where status = 'done') as done_minutes
from tasks group by 1,2,3;

-- feeds the morning catch-up card
create view rollover_queue as
select * from tasks
where status = 'planned'
  and scheduled_date < current_date
  and reviewed_at is null;
```

---

## 6. Constraint vocabulary

The `constraints` jsonb column. Keep it closed. Adding a constraint means adding one case to one switch.

```ts
type Constraints = {
  after?: string;            // template id
  before?: string;
  windowStart?: string;      // "06:00"
  windowEnd?: string;
  daysAllowed?: Weekday[];
  maxPerDay?: number;
  minRestDaysPerWeek?: number;
  requires?: Record<string, string[]>;   // { achilles: ['good'] }
  requiresTempBelow?: number;            // swing, degrees F
  requiresBlockOf?: number;              // bookstore: min open minutes
  immovable?: boolean;
  deferrable?: boolean;                  // default true
  triggeredBy?: string;
  swapGroup?: string;
};
```

### Rule mapping, the correctness test

If a schema change breaks any row here, reject it.

| Rule | Encoding |
|---|---|
| Coffee with Ty anchors the morning | `kind: anchor`, window 07:30 to 08:30 |
| Shower and breakfast after movement | `after: <movement>`, 35 min |
| Kitchen cleaned right after cooking | `kind: triggered`, `triggeredBy: <cooking>`, `deferrable: false` |
| Movement depends on the Achilles | `swapGroup: movement`, options gated by `allowed_when` |
| No gym on a pain day | Gym option `allowed_when: {achilles:["good"]}` |
| Rest 1 to 2x a week regardless | `minRestDaysPerWeek: 1` |
| 10 applications a week, max 3 a day | `kind: quota`, count 10, period week, max_per_day 3, 60 min, intensity 3 |
| Reading 1.5 hrs a day, two books | two `daily` templates, `elastic: true`, `min_minutes: 15` |
| Chores 2 to 3x a week | `kind: quota`, count 3 |
| Errands run longer than home chores | separate template, 45 min |
| Therapy twice a week, times vary | `weekly_anchors`, resolved Monday, then immovable |
| AA once a week, day varies | `weekly_anchors` |
| Weekly unscheduled block, no goal | `kind: quota`, count 1, `energy: chosen` |
| Nothing scheduled on weekends | `profiles.schedules_weekends = false` |
| Swing only when it is cool enough | `requiresTempBelow: 85` |
| Bookstore needs a real block | `requiresBlockOf: 60` |
| 10 minutes either side of anything fixed | `profiles.default_buffer_minutes` |

---

## 7. The scheduler

Pure function in `src/scheduler/`. No React, no Supabase, no `Date.now()` inside it.

```ts
function schedule(input: {
  dateRange: { start: Date; end: Date };
  templates: Template[];
  appointments: Appointment[];
  weeklyAnchorSlots: AnchorSlot[];
  existingTasks: Task[];
  dayLogs: DayLog[];
  energyWindows: EnergyWindow[];
  profile: Profile;
  weather?: { date: string; highF: number }[];
}): { tasks: Task[]; unplaced: UnplacedTask[] }
```

### Passes, in order

**0. Canvas.** Slots from wake to sleep in 30-minute increments per day. Skip Saturday and Sunday when `schedules_weekends` is false.

**1. Lock.** Appointments, resolved weekly anchor slots, anything `pinned`, `immovable`, or already `done`. Add automatic buffers of `default_buffer_minutes` on both sides and mark those slots unavailable.

**2. Anchors.** Coffee, meds, Achilles AM and PM, the bedtime tidy. Earliest fitting slot inside the window.

**3. Ordering.** Resolve `after` and `before`. Movement follows coffee, shower and breakfast follow movement. A dependent whose parent never landed goes to `unplaced` with a readable reason.

**4. Triggered.** Never scheduled independently. Attach via `follows_task_id` to the slots right after the parent. Moves when the parent moves.

**5. Reserve open time.** Runs before anything optional. Reserve `protected_open_minutes` as contiguous slots, biased toward late afternoon and evening, plus one 90-minute block somewhere in the week. Passes 6 and 7 cannot touch these. The user can fill them by hand.

**6. Quotas.** Count what is done or planned this period, spread the remainder across days that have room, respect `quota_max_per_day`, prefer days with lower obligation load.

**7. Flexible, by score.**

```
score = intensityFit        * 3    // template intensity vs energy window preference
      + windowFit           * 3    // preferred_earliest / preferred_latest
      + dayLoadBalance      * 2
      + deadlineProximity   * 3
      - adjacentSameEnergyPenalty
```

`intensityFit` is a **preference and not a veto**. An intensity-3 task at 2 PM scores lower than the same task at 10 AM, and it still gets placed there when that is where the room is. The scheduler must never refuse to place something because of an energy window.

**8. Elastic expansion.** Templates with `elastic: true` grow to fill adjacent open time down to `min_minutes`. Reading is the main case. This runs after everything else, and it may not consume protected open time.

**9. Stop.** Whatever is left stays empty and reads as open. A day that comes out 40% empty is correct.

### Soft cap

When a day exceeds `soft_daily_cap_minutes`, the scheduler still places the work and flags the day. The UI offers to move the lowest-scoring item. Nothing gets blocked.

### Condition gating

Before passes 6 and 7, read `day_logs.conditions`. A template whose `requires` fails resolves to the best allowed option in its swap group, or drops with a reason. Painful Achilles resolves movement to stretch and elevate, and the app calls it a skip rather than a deferral.

### Determinism

Same inputs, same outputs. Seed tiebreaks with the date string. Re-running must never shuffle the week.

---

## 8. Today's two

The success condition for a day. One or two tasks that make it a good day regardless of what else slips.

**Setting them.** The morning check-in card asks. Any task can be marked, including a one-off typed in on the spot. Two is the ceiling.

**Rendering.** Real visual weight in the day view. Larger, set apart, unmistakable at a glance. Everything else on the day is texture around them.

**Completing one** is the moment the app makes a fuss about. This is the primary animation in the product.

**The nightly note** asks two questions: did they land, and were they the right two. Store in `day_logs.two_landed` and `two_reflection`. Over time this tells her something about her own judgment, which no calendar does.

**A day where both landed and nine other things slipped renders as a good day.** The month view reads today's two before it reads completion percentage.

---

## 9. Backup plans, deferral, and catch-up

### The swap panel

Click a task, then Swap. Slides from the right on desktop, sheet from the bottom on mobile.

- Shows the slot and its duration.
- Options that fit and pass the current gates, each with a one-line rationale.
- Gated-out options stay visible at the bottom, dimmed, reason shown. "Gym is off today because you logged the Achilles as painful." Showing the blocked option builds trust in the rules.
- A field for something else entirely.
- "Give this time back" clears the slot, marks it open, and confirms what just opened up.

Shorter option fills the slot and leaves the remainder open. Longer option prompts once: extend, or pick another time.

**Seed groups.**

*Movement* — Gym upper body (good only), Bike 20 to 30 min (good only), MadFit low impact (good or tender), Easy short bike (tender), Gentle stretch (any), Stretch and elevate only (any, and the only option when painful).

*Open slot menu* — the full chosen menu from section 4. Offer two or three at a time sized to the actual gap, never the whole list. A 20-minute gap offers coffee, coloring, or reading. A 90-minute gap offers baking, a bookstore run, or reorganizing.

### Deferral

Separate from swapping. Swapping changes what happens in a slot. Deferral moves a task to another day.

The app proposes a specific date and time, shows it, waits for confirmation. It never moves anything silently. Confirmation copy leads with the gain: "Moved to Thursday at 10:30. That is 45 minutes back today."

Blocked from deferral: appointments, resolved weekly anchors, meds, water, the Achilles routine, kitchen cleanup. Tapping "This can wait" on those returns a short explanation.

Painful movement days reframe as a skip. "Skipped, and that is the right call."

### The morning catch-up card

Everything that slipped gets handled once, in the morning, inside the check-in card. Nothing interrupts during the day and nothing pings at night.

- Rows for each item in `rollover_queue`, each with three buttons: Today, This week, Let it go.
- One is pre-selected by type. Quota items default to spreading across the remaining week. Yesterday's reading defaults to letting go. Chores default to today.
- More than four items and it stops itemizing. It offers one decision about the whole day, with an option to go item by item.
- It never asks twice. Letting something go is final. Deciding sets `reviewed_at` regardless of which button was pressed.
- Copy: "Let it go" and "Off the list." Never "Skipped," never "Incomplete," no red badges, no counts of things not done.

### The Monday card

Adds one section before the rest: this week's therapy times and the AA meeting. The scheduler holds off building the week until they are entered.

### The 4 PM dinner check

Fires at 16:00 on scheduled days. Cooking or going out.

- **Cooking** asks what, drops a grocery block if needed, places the cooking block, attaches kitchen cleanup behind it.
- **Out** clears cooking and cleanup, moves the Achilles PM routine and the tidy earlier, and reports the opening. "That is 2 hours and 30 minutes open between now and dinner."

---

## 10. Views and interactions

**Day.** 30-minute grid, wake to sleep. Blocks sized to real duration. Current time indicator. Header leads with open time as the largest number on the page. Today's two sit visually above everything. Thin three-segment balance bar for chosen, upkeep, obligation. Triggered tasks render attached to their parent with a visible connector.

**Week.** Seven columns, same grid engine at smaller scale. Weekend columns render as checklists with no time grid. Drag works across columns. Quota progress along the top. Each column footer shows that day's open time.

**Month.** No task titles in the cells. Each day holds a small stacked bar of the three energy segments plus open time, so a month reads as texture. A dot for each day where today's two both landed. Quota dots along the week rows. Clicking a day opens the day view.

**Drag and drop.** Snap to 30-minute increments. Dragging sets `pinned`. Dragging a parent moves its triggered children. Immovable tasks shake and explain. Keyboard drag required, visible focus rings required.

**Completion.** One tap. Completed blocks get a distinct treatment. The weekly chosen-time total animates up. A triggered child surfaces immediately when its parent completes.

**Morning check-in card.** Appears when `day_logs` has no entry for today. Order: conditions, then today's two, then catch-up rows, then the Monday anchor section when it applies. Answering re-resolves gated slots and shows what changed.

---

## 11. Design direction

Read `/mnt/skills/public/frontend-design/SKILL.md` first.

The subject is surplus, so the metaphor is space rather than density. Open time is the figure and obligations are the ground, which reverses every calendar app and is the entire point.

Avoid the current AI-design defaults: cream near #F4F1EA with a terracotta accent, near-black with one acid accent, hairline-ruled broadsheet layouts. Derive the palette from the subject instead.

Three directions. Pick one and commit rather than blending.

- Obligations render as small dense objects with weight, open time renders light, so a heavy day looks bottom-loaded and an open day looks buoyant.
- Time as terrain, where scheduled blocks are built structures and open time is unbuilt ground shown at actual scale.
- A daylight treatment where the grid shifts with time of day and open slots read as lit.

Typography needs a display face with real personality for the open-time figure, since that number is the product. Quieter body face. Set the figure large enough that it is the first thing the eye lands on.

Motion is reserved for three moments: completing one of today's two, time opening up after a deferral, and choosing to go out for dinner. Everything else stays still.

Copy: active voice, sentence case, plain verbs. No scarcity language, no "only 3 hours left," no "behind," no red for lateness. Empty states are invitations. Errors say what happened and what to do next.

---

## 12. Build order

Each phase is a separate session with a clear finish line.

**Setup.** Create the repo, put this file at `docs/SPEC.md`, create `CLAUDE.md` from section 13.

### Phase 1 — Foundation

> Read docs/SPEC.md sections 1 through 6. Set up Vite + React + TypeScript with Tailwind and initialize Supabase. Write the migration in section 5 exactly, including RLS on every table. Add Supabase email auth with a single sign-in page. Write a seed script that creates the templates, energy windows, swap groups, swap options, weekly anchors, and condition types described in sections 4 and 6. No calendar UI yet. Finish by printing the seeded data as plain tables so I can verify every row of the section 6 mapping table came through.

### Phase 2 — The grid

> Read section 10. Build the day view: a 30-minute grid from wake to sleep reading real tasks from Supabase. Then the week view using the same grid component at smaller scale, with weekend columns rendering as checklists. Header shows open time as the largest number on the page. Include the three-segment balance bar and the today's two treatment. No scheduler, no drag. Before writing any CSS, tell me which of the three visual directions in section 11 you picked and why.

### Phase 3 — The scheduler

> Read sections 6 and 7. Build the scheduler as a pure function in src/scheduler/ with no React and no Supabase imports. Implement passes 0 through 9 in order. Write Vitest tests first: one per pass, one per row of the section 6 mapping table, one proving protected open time survives, one proving determinism across repeated runs, and one proving an intensity-3 task still gets placed at 2 PM when that is the only room left. Wire it to a "Rebuild my week" button after the tests pass.

### Phase 4 — Direct manipulation

> Add @dnd-kit drag and drop snapping to 30-minute increments. Dragging sets pinned. Parents carry their triggered children. Immovable tasks refuse and explain. Add tap-to-complete with the weekly chosen-time total animating up, and the larger completion moment for today's two. Keyboard drag and visible focus rings are requirements.

### Phase 5 — Swaps, deferral, catch-up

> Read section 9. Build the swap panel with gated options staying visible and their reasons shown. Build deferral with a proposed date, a confirmation step, and copy that leads with the time given back. Build the morning check-in card: conditions, today's two, catch-up rows with pre-selected defaults and the four-item collapse, and the Monday weekly-anchor section. Build the 4 PM dinner check with both branches.

### Phase 6 — Month view and deploy

> Build the month view from section 10 using density bars rather than task lists. Add today's-two dots and quota dots. Set up Netlify with netlify.toml, an SPA redirect rule, and the two Supabase env vars. Wire Open-Meteo for the Denver temperature gate. Test the whole app at phone width and fix what breaks.

### Phase 7 — Live with it

Use it for two weeks, then tune. The pass 7 scoring weights are educated guesses and will need adjusting against real days.

---

## 13. CLAUDE.md

```md
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
```

---

## 14. Still open

1. **Where the weekly check-in lives.** The original notes put it on Sunday, and weekends are hands-off. Monday's card is the obvious home, though it means reflecting on the week after the new one has started. Friday afternoon is the other candidate.
2. **Pass 7 weights.** Guesses until real weeks exist.
3. **Swing temperature threshold.** 85F is a placeholder.
4. **Whether reorganizing is chosen or upkeep.** Currently tagged chosen, which flatters the weekly total. Worth watching.
