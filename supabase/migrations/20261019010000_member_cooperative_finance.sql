create table if not exists public.member_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete restrict,
  contribution_type text not null check (contribution_type in ('monthly', 'additional')),
  amount_minor bigint not null check (amount_minor >= 100),
  contribution_year integer not null,
  contribution_month integer check (contribution_month between 1 and 12),
  payment_reference text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_by uuid references public.app_users(id) on delete set null,
  verified_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  check ((contribution_type = 'monthly' and contribution_month is not null)
    or (contribution_type = 'additional' and contribution_month is null)),
  unique (user_id, payment_reference)
);

create index if not exists member_contributions_member_period
  on public.member_contributions(user_id, contribution_year desc, contribution_month desc);
create index if not exists member_contributions_review
  on public.member_contributions(status, created_at)
  where status = 'pending';
create unique index if not exists member_contributions_one_monthly_period
  on public.member_contributions(user_id, contribution_year, contribution_month)
  where contribution_type = 'monthly';

insert into public.ledger_accounts (account_code, account_name, account_type)
values
  ('1010-MEMBER-CONTRIBUTIONS-CLEARING', 'Member contribution deposits clearing', 'asset'),
  ('2100-MEMBER-CONTRIBUTIONS', 'Member contribution balances', 'liability')
on conflict (account_code) do nothing;

create table if not exists public.member_rollovers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete restrict,
  source_year integer not null,
  target_year integer not null,
  contribution_balance_minor bigint not null check (contribution_balance_minor >= 0),
  bonus_minor bigint not null check (bonus_minor >= 0),
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (user_id, source_year),
  check (target_year = source_year + 1)
);
create index if not exists member_rollovers_year
  on public.member_rollovers(user_id, target_year)
  where status = 'active';

create table if not exists public.annual_member_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete restrict,
  report_year integer not null,
  request_type text not null check (request_type in ('profits_only', 'profits_and_contributions')),
  contribution_balance_minor bigint not null default 0 check (contribution_balance_minor >= 0),
  rollover_bonus_minor bigint not null default 0 check (rollover_bonus_minor >= 0),
  allocated_profit_minor bigint not null default 0 check (allocated_profit_minor >= 0),
  distribution_rate_bps integer not null default 7000 check (distribution_rate_bps between 7000 and 10000),
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'approved', 'declined', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists annual_member_requests_member_year
  on public.annual_member_requests(user_id, report_year);

create table if not exists public.member_loan_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete restrict,
  amount_minor bigint not null check (amount_minor >= 10000),
  purpose text not null check (length(trim(purpose)) between 20 and 3000),
  project_name text not null check (length(trim(project_name)) between 2 and 160),
  requested_repayment_year integer not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'needs_information', 'approved', 'declined')),
  review_note text,
  reviewed_by uuid references public.app_users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists member_loan_applications_review
  on public.member_loan_applications(status, created_at)
  where status in ('submitted', 'under_review');

create table if not exists public.cooperative_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('quarterly', 'annual')),
  report_year integer not null,
  report_quarter integer check (report_quarter between 1 and 4),
  title text not null check (length(trim(title)) between 5 and 180),
  summary text not null check (length(trim(summary)) between 20 and 10000),
  profits_minor bigint,
  losses_minor bigint,
  reserve_minor bigint,
  opportunities text,
  published boolean not null default false,
  published_by uuid references public.app_users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  check ((report_type = 'quarterly' and report_quarter is not null)
    or (report_type = 'annual' and report_quarter is null))
);
create unique index if not exists cooperative_reports_period_unique
  on public.cooperative_reports(report_type, report_year, (coalesce(report_quarter, 0)));

create index if not exists cooperative_reports_published
  on public.cooperative_reports(report_year desc, report_quarter desc)
  where published;

create table if not exists public.management_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete restrict,
  position text not null check (length(trim(position)) between 2 and 120),
  chapter_state_code text references public.chapters(state_code),
  election_year integer not null,
  statement text not null check (length(trim(statement)) between 20 and 3000),
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'eligible', 'ineligible', 'withdrawn')),
  created_at timestamptz not null default now()
);
create unique index if not exists management_campaign_member_position_year
  on public.management_campaigns(user_id, position, coalesce(chapter_state_code, ''), election_year);

alter table public.events
  add column if not exists review_target_at timestamptz;

create or replace function public.set_event_review_target()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'submitted' and (
    tg_op = 'INSERT' or old.status <> 'submitted' or new.starts_at is distinct from old.starts_at
  ) then
    if new.starts_at < now() + interval '3 months' then
      raise exception 'Event proposals must be submitted at least three months before the event date';
    end if;
    new.review_target_at := now() + interval '14 days';
  end if;
  return new;
end;
$$;

drop trigger if exists events_review_timing on public.events;
create trigger events_review_timing
before insert or update of status, starts_at on public.events
for each row execute function public.set_event_review_target();

insert into public.permissions (permission_code, description)
values
  ('reports.publish.national', 'Publish quarterly and annual cooperative reports'),
  ('contributions.review', 'Review and reconcile member contribution records'),
  ('loans.review', 'Review member loan applications'),
  ('elections.review', 'Review management election campaigns')
on conflict (permission_code) do nothing;

alter table public.member_contributions enable row level security;
alter table public.annual_member_requests enable row level security;
alter table public.member_rollovers enable row level security;
alter table public.member_loan_applications enable row level security;
alter table public.cooperative_reports enable row level security;
alter table public.management_campaigns enable row level security;

drop policy if exists "Members read their contribution records" on public.member_contributions;
create policy "Members read their contribution records"
on public.member_contributions for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Members read their annual requests" on public.annual_member_requests;
create policy "Members read their annual requests"
on public.annual_member_requests for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Members read their rollover balances" on public.member_rollovers;
create policy "Members read their rollover balances"
on public.member_rollovers for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Members read their loan applications" on public.member_loan_applications;
create policy "Members read their loan applications"
on public.member_loan_applications for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Members read their management campaigns" on public.management_campaigns;
create policy "Members read their management campaigns"
on public.management_campaigns for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Published cooperative reports are public" on public.cooperative_reports;
create policy "Published cooperative reports are public"
on public.cooperative_reports for select to anon, authenticated
using (published);

drop policy if exists "Report officers manage reports" on public.cooperative_reports;
create policy "Report officers manage reports"
on public.cooperative_reports for all to authenticated
using (public.current_user_has_permission('reports.publish.national'))
with check (public.current_user_has_permission('reports.publish.national'));

grant select on public.cooperative_reports to anon, authenticated;
grant select, insert on public.member_contributions, public.annual_member_requests,
  public.member_loan_applications, public.management_campaigns, public.member_rollovers to authenticated;
grant update on public.cooperative_reports to authenticated;
