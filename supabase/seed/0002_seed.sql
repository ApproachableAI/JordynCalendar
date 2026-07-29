-- Seed data for the single user.
--
-- Safe to run more than once. It clears the seeded reference tables for that
-- user and rebuilds them. It does not touch tasks, day_logs, or appointments.
--
-- Run this in the Supabase SQL Editor after 0001_init.sql, and after the user
-- exists in Authentication.

do $$
declare
  uid          uuid;
  g_movement   uuid;
  g_open       uuid;
  t_movement   uuid;
  t_shower     uuid;
  t_cooking    uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then
    raise exception 'No user found. Add one under Authentication first.';
  end if;

  insert into profiles (id) values (uid) on conflict (id) do nothing;

  -- Shape of the day. Wake covers the early gym with Ty.
  update profiles set
    wake_time  = '05:30',
    sleep_time = '22:30',
    timezone   = 'America/Denver',
    protected_open_minutes = 120,
    soft_daily_cap_minutes = 300,
    default_buffer_minutes = 10,
    schedules_weekends     = false,
    quota_week_starts_on   = 1,   -- Monday, for the 10 applications
    review_week_starts_on  = 4,   -- Thursday, for the Wednesday review
    review_day_of_week     = 3,
    swing_max_temp_f          = 85,
    swing_max_temp_f_overcast = 92
  where id = uid;

  delete from swap_options where group_id in (select id from swap_groups where user_id = uid);
  delete from swap_groups     where user_id = uid;
  delete from energy_windows    where user_id = uid;
  delete from protected_windows where user_id = uid;
  delete from condition_types   where user_id = uid;
  delete from weekly_anchors    where user_id = uid;
  delete from templates         where user_id = uid;

  -- -------------------------------------------------------------------------
  -- Energy windows. Placement preferences, never ceilings.
  -- -------------------------------------------------------------------------
  insert into energy_windows (user_id, label, start_time, end_time, preferred_intensity) values
    (uid, 'Sharpest',        '09:30', '13:00', 3),
    (uid, 'Lunch, lighter',  '13:00', '14:00', 1),
    (uid, 'Afternoon dip',   '14:00', '16:00', 1),
    (uid, 'Second wind, hands on', '16:00', '18:30', 2),
    (uid, 'Evening',         '18:30', '22:30', 1);

  -- -------------------------------------------------------------------------
  -- Protected open time. Reserved before anything optional gets placed.
  -- -------------------------------------------------------------------------
  insert into protected_windows (user_id, label, start_time, end_time, min_minutes, sort_order) values
    (uid, 'Early afternoon', '14:00', '16:00', 90,  1),
    (uid, 'After dinner',    '19:00', '22:00', 120, 2);

  -- -------------------------------------------------------------------------
  -- Daily self report
  -- -------------------------------------------------------------------------
  insert into condition_types (user_id, key, label, values, sort_order) values
    (uid, 'achilles', 'How is the Achilles',
     '["good","tender","painful"]'::jsonb, 1),
    (uid, 'mood', 'Mood',
     '["good","ok","low"]'::jsonb, 2),
    (uid, 'energy', 'Energy',
     '["high","medium","low"]'::jsonb, 3),
    (uid, 'gym_plan', 'Moving today',
     '["with_ty","on_my_own","rest"]'::jsonb, 4);

  -- -------------------------------------------------------------------------
  -- Weekly anchors. Days and times change every week.
  -- -------------------------------------------------------------------------
  insert into weekly_anchors (user_id, title, times_per_week, default_minutes) values
    (uid, 'Therapy with Sandra', 2, 60),
    (uid, 'AA meeting',          1, 60);

  -- -------------------------------------------------------------------------
  -- Templates
  -- -------------------------------------------------------------------------

  -- Movement first, because shower and breakfast hang off it.
  insert into templates (user_id, title, category, kind, energy, intensity,
                         default_minutes, constraints)
  values (uid, 'Movement', 'body', 'daily', 'chosen', 2, 60,
          '{"swapGroup":"movement","minRestDaysPerWeek":1}'::jsonb)
  returning id into t_movement;

  insert into templates (user_id, title, category, kind, energy, intensity,
                         default_minutes, constraints)
  values (uid, 'Shower and get ready', 'upkeep', 'daily', 'upkeep', 1, 35,
          jsonb_build_object('after', t_movement::text))
  returning id into t_shower;

  insert into templates (user_id, title, category, kind, energy, intensity,
                         default_minutes, constraints)
  values (uid, 'Cooking', 'kitchen', 'flexible', 'chosen', 2, 60,
          '{"windowStart":"16:30","windowEnd":"18:30"}'::jsonb)
  returning id into t_cooking;

  insert into templates (user_id, title, category, kind, energy, intensity,
                         default_minutes, min_minutes, elastic,
                         quota_count, quota_period, quota_max_per_day, constraints) values

    -- anchors and daily upkeep
    (uid, 'Coffee with Ty', 'anchor', 'anchor', 'upkeep', 1, 30, null, false,
     null, null, null, '{"windowStart":"07:30","windowEnd":"08:30","immovable":true}'::jsonb),
    (uid, 'Meds', 'upkeep', 'daily', 'upkeep', 1, 5, null, false,
     null, null, null, '{"deferrable":false}'::jsonb),
    (uid, 'Water', 'upkeep', 'daily', 'upkeep', 1, 5, null, false,
     null, null, null, '{"deferrable":false}'::jsonb),
    (uid, 'Achilles AM', 'body', 'daily', 'upkeep', 1, 20, null, false,
     null, null, null, '{"deferrable":false,"windowStart":"06:00","windowEnd":"10:00"}'::jsonb),
    (uid, 'Achilles PM', 'body', 'daily', 'upkeep', 1, 20, null, false,
     null, null, null, '{"deferrable":false,"windowStart":"19:00","windowEnd":"22:30"}'::jsonb),
    (uid, 'Breakfast', 'upkeep', 'daily', 'upkeep', 1, 15, null, false,
     null, null, null, jsonb_build_object('after', t_shower::text)),
    (uid, 'Lunch', 'upkeep', 'daily', 'upkeep', 1, 30, null, false,
     null, null, null, '{"windowStart":"13:00","windowEnd":"14:00"}'::jsonb),
    (uid, 'Dinner decision', 'kitchen', 'daily', 'upkeep', 1, 20, null, false,
     null, null, null, '{"windowStart":"16:00","windowEnd":"16:30"}'::jsonb),
    (uid, 'Dinner', 'kitchen', 'daily', 'chosen', 1, 40, null, false,
     null, null, null, '{"windowStart":"18:00","windowEnd":"19:30"}'::jsonb),
    (uid, 'Ten minute tidy', 'upkeep', 'daily', 'upkeep', 1, 10, null, false,
     null, null, null, '{"windowStart":"21:00","windowEnd":"22:30"}'::jsonb),
    (uid, 'Nightly note', 'upkeep', 'daily', 'upkeep', 1, 15, null, false,
     null, null, null, '{"windowStart":"21:00","windowEnd":"22:30"}'::jsonb),

    -- reading, 1.5 hours a day across two books, both elastic
    (uid, 'Reading, the fun one', 'reading', 'daily', 'chosen', 1, 45, 15, true,
     null, null, null, '{}'::jsonb),
    (uid, 'Reading, the useful one', 'reading', 'daily', 'chosen', 2, 45, 15, true,
     null, null, null, '{}'::jsonb),

    -- quotas
    (uid, 'Job application', 'big kid stuff', 'quota', 'big_kid_stuff', 3, 60, null, false,
     10, 'week', 3, '{}'::jsonb),
    (uid, 'Chore at home', 'upkeep', 'quota', 'upkeep', 1, 30, null, false,
     3, 'week', 1, '{}'::jsonb),
    (uid, 'Errand', 'upkeep', 'quota', 'upkeep', 2, 45, null, false,
     2, 'week', 1, '{}'::jsonb),
    (uid, 'Unscheduled block', 'chosen', 'quota', 'chosen', 1, 90, null, false,
     1, 'week', 1, '{}'::jsonb),

    -- the chosen menu, what open time can become
    (uid, 'Colouring', 'chosen', 'flexible', 'chosen', 1, 30, 20, false,
     null, null, null, '{}'::jsonb),
    (uid, 'Journaling', 'chosen', 'flexible', 'chosen', 1, 25, 20, false,
     null, null, null, '{}'::jsonb),
    (uid, 'Make a coffee', 'chosen', 'flexible', 'chosen', 1, 15, 15, false,
     null, null, null, '{}'::jsonb),
    (uid, 'Sit on the swing', 'chosen', 'flexible', 'chosen', 1, 30, 20, false,
     null, null, null,
     '{"requiresTempBelow":85,"requiresTempBelowOvercast":92,"requiresNoRain":true}'::jsonb),
    (uid, 'Cookbook browsing', 'chosen', 'flexible', 'chosen', 1, 30, 20, false,
     null, null, null, '{}'::jsonb),
    (uid, 'Baking', 'chosen', 'flexible', 'chosen', 2, 90, 90, false,
     null, null, null, '{"requiresBlockOf":90}'::jsonb),
    (uid, 'Reorganizing', 'chosen', 'flexible', 'chosen', 2, 60, 45, false,
     null, null, null, '{}'::jsonb),
    (uid, 'Bookstore or craft store', 'chosen', 'flexible', 'chosen', 2, 75, 60, false,
     null, null, null, '{"requiresBlockOf":60}'::jsonb),
    (uid, 'Grocery store', 'upkeep', 'flexible', 'upkeep', 2, 45, 45, false,
     null, null, null, '{}'::jsonb);

  -- Kitchen cleanup rides on cooking and cannot be pushed to another day.
  insert into templates (user_id, title, category, kind, energy, intensity,
                         default_minutes, constraints)
  values (uid, 'Kitchen cleanup', 'kitchen', 'triggered', 'upkeep', 1, 20,
          jsonb_build_object('triggeredBy', t_cooking::text, 'deferrable', false));

  -- -------------------------------------------------------------------------
  -- Swap groups
  -- -------------------------------------------------------------------------

  insert into swap_groups (user_id, name) values (uid, 'movement')
  returning id into g_movement;

  insert into swap_options (group_id, title, energy, minutes, min_minutes,
                            allowed_when, rationale, sort_order) values
    (g_movement, 'Gym with Ty', 'chosen', 60, 45,
     '{"achilles":["good"],"gym_plan":["with_ty"]}'::jsonb,
     'Early start, out the door by half five.', 1),
    (g_movement, 'Gym on my own', 'chosen', 60, 45,
     '{"achilles":["good"],"gym_plan":["on_my_own"]}'::jsonb,
     'Later start, around half eight.', 2),
    (g_movement, 'Bike, 20 to 30 min', 'chosen', 30, 20,
     '{"achilles":["good"]}'::jsonb,
     'Easy on the calf when it is behaving.', 3),
    (g_movement, 'MadFit, low impact', 'chosen', 30, 20,
     '{"achilles":["good","tender"]}'::jsonb,
     'Nothing jarring, fine on a tender day.', 4),
    (g_movement, 'Easy short bike', 'chosen', 20, 15,
     '{"achilles":["tender"]}'::jsonb,
     'Keeps things moving without loading it.', 5),
    (g_movement, 'Gentle stretch', 'chosen', 20, 15,
     '{}'::jsonb,
     'Always available.', 6),
    (g_movement, 'Stretch and elevate', 'chosen', 20, 15,
     '{}'::jsonb,
     'The right call on a painful day.', 7);

  insert into swap_groups (user_id, name) values (uid, 'open slot menu')
  returning id into g_open;

  insert into swap_options (group_id, title, energy, minutes, min_minutes,
                            allowed_when, rationale, sort_order) values
    (g_open, 'Make a coffee', 'chosen', 15, 15, '{}'::jsonb,
     'The smallest good filler.', 1),
    (g_open, 'Read', 'chosen', 30, 15, '{}'::jsonb,
     'Fits any gap, expands into a big one.', 2),
    (g_open, 'Colouring', 'chosen', 30, 20, '{}'::jsonb,
     'Good filler, no setup.', 3),
    (g_open, 'Journaling', 'chosen', 25, 20, '{}'::jsonb,
     'Pairs with the nightly note.', 4),
    (g_open, 'Cookbook browsing', 'chosen', 30, 20, '{}'::jsonb,
     'Feeds the dinner decision.', 5),
    (g_open, 'Sit on the swing', 'chosen', 30, 20,
     '{"requiresTempBelow":85,"requiresTempBelowOvercast":92,"requiresNoRain":true}'::jsonb,
     'Only when the weather is on side.', 6),
    (g_open, 'Reorganizing', 'chosen', 60, 45, '{}'::jsonb,
     'Sits between chosen and upkeep.', 7),
    (g_open, 'Baking', 'chosen', 90, 90, '{"requiresBlockOf":90}'::jsonb,
     'Needs a real block.', 8),
    (g_open, 'Bookstore or craft store', 'chosen', 75, 60,
     '{"requiresBlockOf":60}'::jsonb,
     'Out of the house, needs a real block.', 9),
    (g_open, 'Grocery store', 'upkeep', 45, 45, '{}'::jsonb,
     'Attaches to the dinner decision.', 10);

  raise notice 'Seeded for user %', uid;
end $$;
