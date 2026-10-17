-- Keep event follow-up decisions distinct from pending proposals.
alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (status in ('draft', 'submitted', 'needs_information', 'approved', 'declined', 'cancelled'));
