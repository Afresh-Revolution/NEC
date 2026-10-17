alter table public.management_campaigns
  add column if not exists review_note text;

create table if not exists public.member_loans (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.member_loan_applications(id) on delete restrict,
  user_id uuid not null references public.app_users(id) on delete restrict,
  principal_minor bigint not null check (principal_minor > 0),
  outstanding_minor bigint not null check (outstanding_minor >= 0 and outstanding_minor <= principal_minor),
  repayment_terms text not null check (length(trim(repayment_terms)) between 10 and 2000),
  disbursement_reference text not null unique,
  issued_at timestamptz not null default now(),
  due_at date not null,
  status text not null default 'active' check (status in ('active', 'repaid', 'defaulted')),
  issued_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists member_loans_user_due
  on public.member_loans(user_id, due_at desc);

create table if not exists public.member_loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.member_loans(id) on delete restrict,
  user_id uuid not null references public.app_users(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  payment_reference text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_by uuid references public.app_users(id) on delete set null,
  verified_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  unique (loan_id, payment_reference)
);

create index if not exists member_loan_repayments_review
  on public.member_loan_repayments(status, created_at)
  where status = 'pending';

insert into public.ledger_accounts (account_code, account_name, account_type)
values
  ('1020-COOPERATIVE-CASH', 'Cooperative bank cash', 'asset'),
  ('1200-LOANS-RECEIVABLE', 'Member loans receivable', 'asset')
on conflict (account_code) do nothing;

alter table public.member_loans enable row level security;
alter table public.member_loan_repayments enable row level security;

drop policy if exists "Members read their loan records" on public.member_loans;
create policy "Members read their loan records"
on public.member_loans for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Members read their loan repayments" on public.member_loan_repayments;
create policy "Members read their loan repayments"
on public.member_loan_repayments for select to authenticated
using (user_id = (select auth.uid()));

grant select, insert on public.member_loans, public.member_loan_repayments to authenticated;
