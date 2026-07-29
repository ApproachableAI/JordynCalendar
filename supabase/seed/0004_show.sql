-- Prints the seeded data as plain tables, so every row can be eyeballed.
-- Run after 0002_seed.sql.

\echo '=== Profile ==='
select wake_time, sleep_time, timezone, protected_open_minutes as protected_min,
       soft_daily_cap_minutes as cap_min, default_buffer_minutes as buffer_min,
       schedules_weekends as weekends
from profiles;

\echo ''
\echo '=== Energy windows, placement preferences only ==='
select label, start_time, end_time, preferred_intensity as prefers
from energy_windows order by start_time;

\echo ''
\echo '=== Protected open time, reserved before anything optional ==='
select label, start_time, end_time, min_minutes
from protected_windows order by sort_order;

\echo ''
\echo '=== Templates ==='
select title, kind, energy, intensity as int, default_minutes as min,
       coalesce(quota_count::text, '') as quota,
       coalesce(quota_max_per_day::text, '') as per_day,
       case when elastic then 'yes' else '' end as elastic,
       case when constraints = '{}'::jsonb then '' else constraints::text end as constraints
from templates order by
  array_position(array['anchor','daily','triggered','quota','flexible']::task_kind[], kind),
  title;

\echo ''
\echo '=== Swap options ==='
select g.name as group, o.title, o.energy, o.minutes as min,
       case when o.allowed_when = '{}'::jsonb then 'always' else o.allowed_when::text end as gated_on,
       o.rationale
from swap_options o join swap_groups g on g.id = o.group_id
order by g.name, o.sort_order;

\echo ''
\echo '=== Morning questions ==='
select key, label, values from condition_types order by sort_order;

\echo ''
\echo '=== Weekly anchors, times set each week ==='
select title, times_per_week, default_minutes from weekly_anchors order by title;

\echo ''
\echo '=== Counts ==='
select 'templates' as table, count(*) from templates
union all select 'swap options',  count(*) from swap_options
union all select 'energy windows', count(*) from energy_windows
union all select 'protected windows', count(*) from protected_windows
union all select 'condition types', count(*) from condition_types
union all select 'weekly anchors', count(*) from weekly_anchors;
