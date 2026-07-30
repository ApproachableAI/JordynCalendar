-- The brain dump.
--
-- Until now every task needed a date, so there was nowhere to put something
-- you have thought of but not decided about. Dropping that requirement gives
-- a task three honest states:
--
--   no date                  in the brain dump, not committed to anything
--   a date, no start time    happening that day, the scheduler picks when
--   a date and a start time  you put it there, it stays put
--
-- Nothing else changes. A task still belongs to one user and still carries
-- its own rules.

alter table tasks alter column scheduled_date drop not null;

-- The brain dump is read constantly, so it gets its own index.
create index tasks_inbox on tasks (user_id, created_at)
  where scheduled_date is null and status = 'planned';

comment on column tasks.scheduled_date is
  'Null means it is in the brain dump and not committed to a day yet.';
