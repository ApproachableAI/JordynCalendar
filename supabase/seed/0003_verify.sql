-- Verification. One row per rule in docs/SPEC.md section 6, plus the changes
-- recorded in docs/DECISIONS.md.
--
-- Run after 0002_seed.sql. Every row should read 'yes' in the ok column.

with u as (select id from auth.users order by created_at limit 1),
     p as (select * from profiles where id = (select id from u)),
     t as (select * from templates where user_id = (select id from u)),
     checks as (

  select 1 as n, 'Coffee with Ty anchors the morning' as rule,
         'anchor, window 07:30 to 08:30' as expected,
         exists (select 1 from t where title = 'Coffee with Ty'
                 and kind = 'anchor'
                 and constraints->>'windowStart' = '07:30'
                 and constraints->>'windowEnd'   = '08:30') as pass

  union all select 2, 'Shower and breakfast after movement',
         'shower after movement, breakfast after shower, 35 min',
         exists (select 1 from t s where s.title = 'Shower and get ready'
                 and s.default_minutes = 35
                 and s.constraints->>'after' = (select id::text from t where title = 'Movement'))
     and exists (select 1 from t b where b.title = 'Breakfast'
                 and b.constraints->>'after' = (select id::text from t where title = 'Shower and get ready'))

  union all select 3, 'Kitchen cleaned right after cooking',
         'triggered by cooking, not deferrable',
         exists (select 1 from t where title = 'Kitchen cleanup'
                 and kind = 'triggered'
                 and constraints->>'triggeredBy' = (select id::text from t where title = 'Cooking')
                 and constraints->>'deferrable' = 'false')

  union all select 4, 'Movement depends on the Achilles',
         'swap group movement, options gated by allowed_when',
         exists (select 1 from t where title = 'Movement'
                 and constraints->>'swapGroup' = 'movement')
     and (select count(*) from swap_options o
          join swap_groups g on g.id = o.group_id
          where g.user_id = (select id from u) and g.name = 'movement'
            and o.allowed_when ? 'achilles') >= 4

  union all select 5, 'No gym on a pain day',
         'every gym option requires achilles good',
         (select count(*) from swap_options o
          join swap_groups g on g.id = o.group_id
          where g.user_id = (select id from u) and g.name = 'movement'
            and o.title like 'Gym%') > 0
     and not exists (select 1 from swap_options o
          join swap_groups g on g.id = o.group_id
          where g.user_id = (select id from u) and g.name = 'movement'
            and o.title like 'Gym%'
            and not (o.allowed_when->'achilles' @> '["good"]'::jsonb
                     and not (o.allowed_when->'achilles' @> '["painful"]'::jsonb)))

  union all select 6, 'Rest 1 to 2 times a week regardless',
         'minRestDaysPerWeek at least 1',
         exists (select 1 from t where title = 'Movement'
                 and (constraints->>'minRestDaysPerWeek')::int >= 1)

  union all select 7, '10 applications a week, max 3 a day',
         'quota 10 per week, 3 per day, 60 min, intensity 3',
         exists (select 1 from t where title = 'Job application'
                 and kind = 'quota' and quota_count = 10 and quota_period = 'week'
                 and quota_max_per_day = 3 and default_minutes = 60 and intensity = 3)

  union all select 8, 'Reading 1.5 hours a day across two books',
         'two daily elastic templates, min 15, 90 min together',
         (select count(*) from t where category = 'reading'
          and kind = 'daily' and elastic and min_minutes = 15) = 2
     and (select sum(default_minutes) from t where category = 'reading') = 90

  union all select 9, 'Chores 2 to 3 times a week',
         'quota, count 3',
         exists (select 1 from t where title = 'Chore at home'
                 and kind = 'quota' and quota_count = 3)

  union all select 10, 'Errands run longer than home chores',
         'separate template, 45 min, longer than the chore',
         (select default_minutes from t where title = 'Errand')
       > (select default_minutes from t where title = 'Chore at home')
     and (select default_minutes from t where title = 'Errand') = 45

  union all select 11, 'Therapy twice a week, times vary',
         'weekly anchor, 2 per week',
         exists (select 1 from weekly_anchors where user_id = (select id from u)
                 and title = 'Therapy with Sandra' and times_per_week = 2)

  union all select 12, 'AA once a week, day varies',
         'weekly anchor, 1 per week',
         exists (select 1 from weekly_anchors where user_id = (select id from u)
                 and title = 'AA meeting' and times_per_week = 1)

  union all select 13, 'Weekly unscheduled block, no goal',
         'quota, count 1, energy chosen',
         exists (select 1 from t where title = 'Unscheduled block'
                 and kind = 'quota' and quota_count = 1 and energy = 'chosen')

  union all select 14, 'Nothing scheduled on weekends',
         'schedules_weekends is false',
         (select not schedules_weekends from p)

  union all select 15, 'Swing only when the weather is on side',
         'under 85F, under 92F overcast, and not raining',
         exists (select 1 from t where title = 'Sit on the swing'
                 and (constraints->>'requiresTempBelow')::int = 85
                 and (constraints->>'requiresTempBelowOvercast')::int = 92
                 and constraints->>'requiresNoRain' = 'true')

  union all select 16, 'Bookstore needs a real block',
         'requiresBlockOf 60',
         exists (select 1 from t where title = 'Bookstore or craft store'
                 and (constraints->>'requiresBlockOf')::int = 60)

  union all select 17, '10 minutes either side of anything fixed',
         'default_buffer_minutes is 10',
         (select default_buffer_minutes from p) = 10

  -- the decisions recorded after the spec was written
  union all select 18, 'The third energy type is big kid stuff',
         'enum has chosen, upkeep, big_kid_stuff',
         (select array_agg(e.enumlabel::text order by e.enumsortorder)
          from pg_enum e join pg_type ty on ty.oid = e.enumtypid
          where ty.typname = 'energy_type')
         = array['chosen','upkeep','big_kid_stuff']

  union all select 19, 'Protected open time at 2 to 4 and after dinner',
         'two windows, and nothing protecting 4 to 6:30',
         (select count(*) from protected_windows where user_id = (select id from u)) = 2
     and exists (select 1 from protected_windows where user_id = (select id from u)
                 and start_time = '14:00' and end_time = '16:00')
     and exists (select 1 from protected_windows where user_id = (select id from u)
                 and start_time >= '19:00')
     and not exists (select 1 from protected_windows where user_id = (select id from u)
                 and start_time < '18:30' and end_time > '16:00')

  union all select 20, 'Morning asks Achilles, mood, energy, and moving',
         'four condition types',
         (select array_agg(key order by sort_order) from condition_types
          where user_id = (select id from u))
         = array['achilles','mood','energy','gym_plan']

  union all select 21, 'Quota week is Monday, review week is Thursday',
         'stored separately',
         (select quota_week_starts_on from p) = 1
     and (select review_week_starts_on from p) = 4
     and (select review_day_of_week from p) = 3

  union all select 22, 'A 30 minute gap has at least three things to become',
         'three or more open slot options fitting 30 min',
         (select count(*) from swap_options o
          join swap_groups g on g.id = o.group_id
          where g.user_id = (select id from u) and g.name = 'open slot menu'
            and coalesce(o.min_minutes, o.minutes) <= 30
            and coalesce((o.allowed_when->>'requiresBlockOf')::int, 0) <= 30) >= 3
)
select n as "#",
       rule,
       expected,
       case when pass then 'yes' else 'NO' end as ok
from checks
order by n;
