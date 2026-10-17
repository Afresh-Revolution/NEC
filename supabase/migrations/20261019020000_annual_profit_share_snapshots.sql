create table if not exists public.annual_profit_shares (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.cooperative_reports(id) on delete restrict,
  user_id uuid not null references public.app_users(id) on delete restrict,
  eligible_balance_minor bigint not null check (eligible_balance_minor >= 0),
  allocated_profit_minor bigint not null check (allocated_profit_minor >= 0),
  distribution_rate_bps integer not null check (distribution_rate_bps between 7000 and 10000),
  captured_at timestamptz not null default now(),
  unique (report_id, user_id)
);

create index if not exists annual_profit_shares_member_report
  on public.annual_profit_shares(user_id, report_id);

alter table public.annual_profit_shares enable row level security;
drop policy if exists "Members read their annual profit shares" on public.annual_profit_shares;
create policy "Members read their annual profit shares"
on public.annual_profit_shares for select to authenticated
using (user_id = (select auth.uid()));

grant select on public.annual_profit_shares to authenticated;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.permission_code in (
  case role.role_code
    when 'finance_officer' then 'contributions.review'
    when 'credit_officer' then 'loans.review'
    when 'national_admin' then 'reports.publish.national'
  end,
  case when role.role_code = 'national_admin' then 'contributions.review' end,
  case when role.role_code = 'national_admin' then 'loans.review' end,
  case when role.role_code = 'national_admin' then 'elections.review' end
)
where role.role_code in ('finance_officer', 'credit_officer', 'national_admin')
on conflict (role_id, permission_id) do nothing;
