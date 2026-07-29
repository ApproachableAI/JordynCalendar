-- One-off tasks.
--
-- A task could always exist without a template, but it had nowhere to carry
-- its own rules, so the scheduler had nothing to place it by. These three
-- columns let a typed-in task say how it wants to be treated.
--
-- This also gives the pass 7 score something to read. SPEC.md section 7
-- weights deadlineProximity at 3, and until now no table stored a deadline,
-- so that term was always reading nothing.

alter table tasks
  -- How to place it. A typed-in task is flexible unless it says otherwise.
  add column kind task_kind not null default 'flexible',

  -- Same closed vocabulary as templates.constraints. See SPEC.md section 6.
  add column constraints jsonb not null default '{}'::jsonb,

  -- "by Friday". Feeds deadlineProximity. Null means no deadline, which is
  -- the normal case and must never be rendered as being late.
  add column due_date date;

-- Deadline sorting only ever cares about work still to do.
create index tasks_due on tasks (user_id, due_date)
  where due_date is not null and status = 'planned';

comment on column tasks.kind is
  'How the scheduler places this task. Copied from the template when there is
   one, and defaults to flexible for a one-off.';

comment on column tasks.due_date is
  'Optional. Raises the pass 7 score as it approaches. Never used to mark a
   task late, and never rendered in red.';
