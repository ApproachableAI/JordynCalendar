-- Calendar app, initial schema.
-- Follows docs/SPEC.md section 5, with the changes recorded in
-- docs/DECISIONS.md. Every table gets row level security.

create extension if not exists "pgcrypto";

create type task_kind   as enum ('anchor','daily','quota','flexible','triggered');

-- 'big_kid_stuff' replaces the spec's 'obligation'. See docs/DECISIONS.md.
create type energy_type as enum ('chosen','upkeep','big_kid_stuff');

create type task_status as enum ('planned','done','skipped','deferred','released');


-- ---------------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  wake_time   time not null default '06:30',
  sleep_time  time not null default '22:30',
  timezone    text not null default 'America/Denver',
  protected_open_minutes int not null default 120,
  soft_daily_cap_minutes int not null default 300,
  default_buffer_minutes int not null default 10,
  schedules_weekends     boolean not null default false,

  -- The quota week runs Monday to Sunday. The review week runs Thursday to
  -- Wednesday and is asked about on Wednesday evening. They are separate on
  -- purpose, see docs/DECISIONS.md.
  quota_week_starts_on  int not null default 1 check (quota_week_starts_on between 0 and 6),
  review_week_starts_on int not null default 4 check (review_week_starts_on between 0 and 6),
  review_day_of_week    int not null default 3 check (review_day_of_week between 0 and 6),

  -- Swing gating. Warmer is fine when it is overcast, and rain rules it out.
  swing_max_temp_f          int not null default 85,
  swing_max_temp_f_overcast int not null default 92,

  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- Placement preferences and protected windows
-- ---------------------------------------------------------------------------

-- Placement preference by time of day. Weights, never ceilings. The scheduler
-- must never refuse to place a task because of one of these.
create table energy_windows (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  label         text not null,
  start_time    time not null,
  end_time      time not null,
  preferred_intensity int not null check (preferred_intensity between 1 and 3),
  days          text[] default null   -- null means every day
);

-- Windows the scheduler reserves before it places anything optional.
-- Replaces the "biased toward late afternoon and evening" rule in the spec,
-- which collided with the cooking and dinner block.
create table protected_windows (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  label      text not null,
  start_time time not null,
  end_time   time not null,
  min_minutes int not null default 60,
  days       text[] default null,
  sort_order int not null default 0
);


-- ---------------------------------------------------------------------------
-- Templates and tasks
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- Swap groups, the backup plans feature
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- Daily self report
-- ---------------------------------------------------------------------------

create table condition_types (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  key     text not null,
  label   text not null,
  values  jsonb not null,
  ask_each_morning boolean not null default true,
  sort_order int not null default 0,
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


-- ---------------------------------------------------------------------------
-- Fixed and moving commitments
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- Row level security. Every table, filtering on the signed in user.
-- ---------------------------------------------------------------------------

alter table profiles            enable row level security;
alter table energy_windows      enable row level security;
alter table protected_windows   enable row level security;
alter table templates           enable row level security;
alter table tasks               enable row level security;
alter table swap_groups         enable row level security;
alter table swap_options        enable row level security;
alter table condition_types     enable row level security;
alter table day_logs            enable row level security;
alter table appointments        enable row level security;
alter table weekly_anchors      enable row level security;
alter table weekly_anchor_slots enable row level security;

create policy own_rows on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy own_rows on energy_windows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_rows on protected_windows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_rows on templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_rows on tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_rows on swap_groups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_rows on condition_types
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_rows on day_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_rows on appointments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_rows on weekly_anchors
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- These two have no user_id of their own, so they join through their parent.
create policy own_rows on swap_options
  for all using (
    exists (select 1 from swap_groups g
            where g.id = swap_options.group_id and g.user_id = auth.uid())
  ) with check (
    exists (select 1 from swap_groups g
            where g.id = swap_options.group_id and g.user_id = auth.uid())
  );

create policy own_rows on weekly_anchor_slots
  for all using (
    exists (select 1 from weekly_anchors a
            where a.id = weekly_anchor_slots.anchor_id and a.user_id = auth.uid())
  ) with check (
    exists (select 1 from weekly_anchors a
            where a.id = weekly_anchor_slots.anchor_id and a.user_id = auth.uid())
  );


-- ---------------------------------------------------------------------------
-- Views.
--
-- security_invoker matters here. Without it a view runs with its owner's
-- rights and quietly reads straight past row level security, which would
-- hand every row to any signed in user.
-- ---------------------------------------------------------------------------

create view quota_progress with (security_invoker = on) as
select t.user_id, t.template_id,
       date_trunc('week', t.scheduled_date)::date as week_start,
       count(*) filter (where t.status = 'done') as completed
from tasks t where t.template_id is not null
group by 1,2,3;

create view day_balance with (security_invoker = on) as
select user_id, scheduled_date, energy,
       sum(duration_minutes) as minutes,
       sum(duration_minutes) filter (where status = 'done') as done_minutes
from tasks group by 1,2,3;

-- feeds the morning catch-up card
create view rollover_queue with (security_invoker = on) as
select * from tasks
where status = 'planned'
  and scheduled_date < current_date
  and reviewed_at is null;


-- ---------------------------------------------------------------------------
-- Create a profile row automatically when someone signs up.
-- ---------------------------------------------------------------------------

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
