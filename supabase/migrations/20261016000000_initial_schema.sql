-- Safe to rerun after a successful application: tables and indexes are
-- preserved, reference rows are inserted only when absent, and owned
-- functions/triggers/policies are replaced with the definitions below.

do $$ begin
  create type public.application_status as enum (
    'submitted',
    'needs_information',
    'approved',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending',
    'succeeded',
    'failed'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  state_code text not null unique,
  state_name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  stage_name text,
  profession text,
  home_state text,
  public_profile_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  role_code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  permission_code text not null unique,
  description text not null
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  chapter_id uuid references public.chapters(id) on delete restrict,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now()
);

create unique index if not exists user_role_assignments_unique_scope
  on public.user_role_assignments(user_id, role_id, coalesce(chapter_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.policy_versions (
  policy_code text not null,
  version text not null,
  document_url text not null,
  effective_at timestamptz,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (policy_code, version)
);

create unique index if not exists policy_versions_one_current
  on public.policy_versions(policy_code) where is_current;

insert into public.policy_versions (policy_code, version, document_url, is_current)
values
  ('membership_terms', 'preview-v1', '/policies', true),
  ('privacy_notice', 'preview-v1', '/policies', true)
on conflict (policy_code, version) do nothing;

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  policy_code text not null,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null default 'web-signup',
  foreign key (policy_code, policy_version)
    references public.policy_versions(policy_code, version),
  unique (user_id, policy_code, policy_version)
);

create table if not exists public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  professional_category text not null,
  home_state text not null,
  status public.application_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.membership_applications(id) on delete restrict,
  user_id uuid not null unique references auth.users(id) on delete restrict,
  member_number text not null unique,
  status text not null check (status in ('active', 'expired', 'suspended', 'ended')),
  activated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.artist_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stage_name text not null,
  biography text,
  specialties text[] not null default '{}',
  portfolio_url text,
  contact_url text,
  availability text,
  is_public boolean not null default false,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  application_id uuid not null references public.membership_applications(id) on delete restrict,
  provider text not null check (provider in ('paystack', 'demo')),
  provider_reference text not null unique,
  authorization_url text,
  provider_transaction_id text unique,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status public.payment_status not null default 'pending',
  is_demo boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((provider = 'demo') = is_demo)
);

create index if not exists payment_intents_user_created
  on public.payment_intents(user_id, created_at desc);
create unique index if not exists payment_intents_one_live_attempt
  on public.payment_intents(application_id, provider)
  where status in ('pending', 'succeeded');

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('paystack', 'demo')),
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null unique,
  account_name text not null,
  account_type text not null check (account_type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  is_active boolean not null default true
);

insert into public.ledger_accounts (account_code, account_name, account_type)
values
  ('1000-PAYSTACK-CLEARING', 'Paystack settlement clearing', 'asset'),
  ('4000-MEMBERSHIP-FEES', 'Membership registration fees', 'revenue'),
  ('1090-DEMO-CLEARING', 'Development demo payment clearing', 'asset'),
  ('4090-DEMO-FEES', 'Development demo registration fees', 'revenue')
on conflict (account_code) do nothing;

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid not null,
  description text not null,
  is_demo boolean not null default false,
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete restrict,
  ledger_account_id uuid not null references public.ledger_accounts(id) on delete restrict,
  side text not null check (side in ('debit', 'credit')),
  amount_minor bigint not null check (amount_minor > 0),
  created_at timestamptz not null default now()
);

create index if not exists journal_lines_entry on public.journal_lines(journal_entry_id);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  state_code text references public.chapters(state_code),
  venue text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'declined', 'cancelled')),
  is_public boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('approved', 'needs_information', 'declined', 'reschedule')),
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  request_type text not null check (request_type in ('access', 'correction', 'deletion')),
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'completed', 'declined')),
  details text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.roles (role_code, display_name)
values
  ('applicant', 'Applicant'),
  ('member', 'Member'),
  ('state_coordinator', 'State Coordinator'),
  ('state_committee', 'State Committee Member'),
  ('credit_officer', 'Credit Officer'),
  ('finance_officer', 'Finance Officer'),
  ('compliance_officer', 'Compliance Officer'),
  ('auditor', 'Auditor'),
  ('national_admin', 'National Administrator'),
  ('super_admin', 'Super Administrator')
on conflict (role_code) do nothing;

insert into public.permissions (permission_code, description)
values
  ('admin.access', 'Access the administrative portal'),
  ('applications.review', 'Review membership applications'),
  ('members.verify', 'Review member identity verification'),
  ('payments.reconcile', 'Reconcile provider payments'),
  ('events.review.state', 'Review events in an assigned state chapter'),
  ('events.review.national', 'Review events nationally'),
  ('reports.view.national', 'View national reports'),
  ('roles.manage', 'Manage role assignments'),
  ('settings.manage', 'Change restricted system settings'),
  ('support.review', 'Review member support requests')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.role_code = 'national_admin'
on conflict (role_id, permission_id) do nothing;

create or replace function public.current_user_has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    join public.roles r on r.id = ura.role_id
    left join public.role_permissions rp on rp.role_id = r.id
    left join public.permissions p on p.id = rp.permission_id
    where ura.user_id = (select auth.uid())
      and (r.role_code = 'super_admin' or p.permission_code = $1)
  );
$$;

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name_value text := nullif(trim(metadata ->> 'full_name'), '');
  profession_value text := nullif(trim(metadata ->> 'profession'), '');
  home_state_value text := nullif(trim(metadata ->> 'home_state'), '');
  applicant_role_id uuid;
begin
  insert into public.profiles (user_id, email, full_name, stage_name, profession, home_state)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(full_name_value, new.email, 'NEC Naija member'),
    nullif(trim(metadata ->> 'stage_name'), ''),
    profession_value,
    home_state_value
  );

  select id into applicant_role_id from public.roles where role_code = 'applicant';
  if applicant_role_id is not null then
    insert into public.user_role_assignments (user_id, role_id)
    values (new.id, applicant_role_id);
  end if;

  if metadata ->> 'terms_accepted' = 'true'
    and metadata ->> 'privacy_accepted' = 'true'
    and profession_value is not null
    and home_state_value is not null
    and full_name_value is not null
  then
    insert into public.user_consents (user_id, policy_code, policy_version)
    select new.id, pv.policy_code, pv.version
    from public.policy_versions pv
    where pv.is_current and pv.policy_code in ('membership_terms', 'privacy_notice');

    insert into public.membership_applications (user_id, professional_category, home_state)
    values (new.id, profession_value, home_state_value);

    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    select new.id, 'application.submitted', 'membership_application', ma.id,
      jsonb_build_object('source', 'auth_signup')
    from public.membership_applications ma
    where ma.user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

create or replace function public.bootstrap_first_super_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  super_admin_role_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role is required';
  end if;
  if exists (
    select 1 from public.user_role_assignments ura
    join public.roles r on r.id = ura.role_id
    where r.role_code = 'super_admin'
  ) then
    raise exception 'A super administrator has already been bootstrapped';
  end if;
  select id into strict super_admin_role_id from public.roles where role_code = 'super_admin';
  insert into public.user_role_assignments (user_id, role_id)
  values (target_user_id, super_admin_role_id);
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (target_user_id, 'admin.bootstrap', 'user', target_user_id, '{"role":"super_admin"}'::jsonb);
end;
$$;

create or replace function public.process_verified_payment(
  p_event_id text,
  p_reference text,
  p_provider_transaction_id text,
  p_amount_minor bigint
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  intent public.payment_intents%rowtype;
  clearing_account_id uuid;
  revenue_account_id uuid;
  entry_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role is required';
  end if;

  insert into public.payment_webhook_events (provider, provider_event_id, event_type, payload)
  values ('paystack', p_event_id, 'charge.success', jsonb_build_object('reference', p_reference))
  on conflict (provider, provider_event_id) do nothing;
  if not found then
    return 'duplicate_event';
  end if;

  select * into intent
  from public.payment_intents
  where provider_reference = p_reference and provider = 'paystack' and not is_demo
  for update;
  if not found then
    raise exception 'Payment reference was not found';
  end if;
  if intent.amount_minor <> p_amount_minor then
    raise exception 'Verified amount does not match the payment intent';
  end if;
  if intent.status = 'succeeded' then
    update public.payment_webhook_events
    set processed_at = now()
    where provider = 'paystack' and provider_event_id = p_event_id;
    return 'already_processed';
  end if;

  select id into strict clearing_account_id from public.ledger_accounts where account_code = '1000-PAYSTACK-CLEARING';
  select id into strict revenue_account_id from public.ledger_accounts where account_code = '4000-MEMBERSHIP-FEES';
  insert into public.journal_entries (source_type, source_id, description)
  values ('payment', intent.id, 'Verified Paystack membership registration payment')
  on conflict (source_type, source_id) do nothing
  returning id into entry_id;

  if entry_id is not null then
    insert into public.journal_lines (journal_entry_id, ledger_account_id, side, amount_minor)
    values
      (entry_id, clearing_account_id, 'debit', p_amount_minor),
      (entry_id, revenue_account_id, 'credit', p_amount_minor);
  end if;

  update public.payment_intents
  set status = 'succeeded',
      provider_transaction_id = p_provider_transaction_id,
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
  where id = intent.id;
  update public.payment_webhook_events
  set processed_at = now()
  where provider = 'paystack' and provider_event_id = p_event_id;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    intent.user_id,
    'payment.verified',
    'payment_intent',
    intent.id,
    jsonb_build_object('provider', 'paystack', 'amount_minor', p_amount_minor)
  );
  return 'processed';
end;
$$;

create or replace function public.process_demo_payment(
  p_reference text,
  p_amount_minor bigint
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  intent public.payment_intents%rowtype;
  clearing_account_id uuid;
  revenue_account_id uuid;
  entry_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role is required';
  end if;
  select * into intent
  from public.payment_intents
  where provider_reference = p_reference and provider = 'demo' and is_demo
  for update;
  if not found then
    raise exception 'Demo payment reference was not found';
  end if;
  if intent.amount_minor <> p_amount_minor then
    raise exception 'Demo amount does not match the payment intent';
  end if;
  if intent.status = 'succeeded' then
    return 'already_processed';
  end if;

  select id into strict clearing_account_id from public.ledger_accounts where account_code = '1090-DEMO-CLEARING';
  select id into strict revenue_account_id from public.ledger_accounts where account_code = '4090-DEMO-FEES';
  insert into public.journal_entries (source_type, source_id, description, is_demo)
  values ('demo_payment', intent.id, 'Development-only simulated membership payment', true)
  on conflict (source_type, source_id) do nothing
  returning id into entry_id;
  if entry_id is not null then
    insert into public.journal_lines (journal_entry_id, ledger_account_id, side, amount_minor)
    values
      (entry_id, clearing_account_id, 'debit', p_amount_minor),
      (entry_id, revenue_account_id, 'credit', p_amount_minor);
  end if;
  update public.payment_intents
  set status = 'succeeded', paid_at = now(), updated_at = now()
  where id = intent.id;
  insert into public.payment_webhook_events (provider, provider_event_id, event_type, payload, processed_at)
  values ('demo', p_reference, 'demo.charge.success', '{"simulated":true}'::jsonb, now())
  on conflict (provider, provider_event_id) do nothing;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (intent.user_id, 'payment.demo_completed', 'payment_intent', intent.id,
    jsonb_build_object('amount_minor', p_amount_minor, 'is_demo', true));
  return 'processed';
end;
$$;

create or replace function public.review_membership_application(
  p_application_id uuid,
  p_decision public.application_status,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_record public.membership_applications%rowtype;
  payment_is_verified boolean;
  new_member_number text;
  member_role_id uuid;
begin
  if not public.current_user_has_permission('applications.review') then
    raise exception 'Insufficient permission to review applications';
  end if;
  if p_decision not in ('approved', 'needs_information', 'rejected') then
    raise exception 'Unsupported application decision';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'A decision reason is required';
  end if;
  select * into strict application_record
  from public.membership_applications
  where id = p_application_id
  for update;
  if application_record.user_id = auth.uid() then
    raise exception 'Administrators cannot review their own application';
  end if;
  if application_record.status in ('approved', 'rejected') then
    raise exception 'This application has already been decided';
  end if;
  if p_decision = 'approved' then
    select exists (
      select 1 from public.payment_intents pi
      where pi.application_id = application_record.id
        and pi.status = 'succeeded'
        and not pi.is_demo
    ) into payment_is_verified;
    if not payment_is_verified then
      raise exception 'Membership cannot be activated without a verified live payment';
    end if;
  end if;
  update public.membership_applications
  set status = p_decision, reviewed_at = now(), reviewed_by = auth.uid(),
      review_reason = trim(p_reason), updated_at = now()
  where id = p_application_id;
  if p_decision = 'approved' then
    new_member_number := 'NEC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    insert into public.memberships (application_id, user_id, member_number, status)
    values (application_record.id, application_record.user_id, new_member_number, 'active');
    select id into strict member_role_id from public.roles where role_code = 'member';
    insert into public.user_role_assignments (user_id, role_id, assigned_by)
    values (application_record.user_id, member_role_id, auth.uid())
    on conflict do nothing;
  end if;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'application.reviewed', 'membership_application', p_application_id,
    jsonb_build_object('decision', p_decision, 'reason', trim(p_reason)));
end;
$$;

create or replace function public.assert_journal_entry_balanced()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_entry_id uuid := coalesce(new.journal_entry_id, old.journal_entry_id);
  debit_total numeric;
  credit_total numeric;
begin
  select
    coalesce(sum(amount_minor) filter (where side = 'debit'), 0),
    coalesce(sum(amount_minor) filter (where side = 'credit'), 0)
  into debit_total, credit_total
  from public.journal_lines
  where journal_entry_id = target_entry_id;
  if debit_total <= 0 or debit_total <> credit_total then
    raise exception 'Journal entry % is not balanced', target_entry_id;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_entries_must_balance on public.journal_lines;
create constraint trigger journal_entries_must_balance
after insert or update on public.journal_lines
deferrable initially deferred
for each row execute function public.assert_journal_entry_balanced();

create or replace function public.prevent_financial_history_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Posted financial history is append-only';
end;
$$;

drop trigger if exists journal_entries_append_only on public.journal_entries;
create trigger journal_entries_append_only
before update or delete on public.journal_entries
for each row execute function public.prevent_financial_history_mutation();

drop trigger if exists journal_lines_append_only on public.journal_lines;
create trigger journal_lines_append_only
before update or delete on public.journal_lines
for each row execute function public.prevent_financial_history_mutation();

drop trigger if exists audit_logs_append_only on public.audit_logs;
create trigger audit_logs_append_only
before update or delete on public.audit_logs
for each row execute function public.prevent_financial_history_mutation();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists applications_set_updated_at on public.membership_applications;
create trigger applications_set_updated_at before update on public.membership_applications
for each row execute function public.set_updated_at();
drop trigger if exists payment_intents_set_updated_at on public.payment_intents;
create trigger payment_intents_set_updated_at before update on public.payment_intents
for each row execute function public.set_updated_at();
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at before update on public.support_tickets
for each row execute function public.set_updated_at();
drop trigger if exists data_requests_set_updated_at on public.data_requests;
create trigger data_requests_set_updated_at before update on public.data_requests
for each row execute function public.set_updated_at();

create table if not exists public.feature_flags (
  flag_code text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.feature_flags (flag_code, enabled)
values
  ('live_payments', false),
  ('lending', false),
  ('investments', false),
  ('profit_distributions', false)
on conflict (flag_code) do nothing;

alter table public.chapters enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.policy_versions enable row level security;
alter table public.user_consents enable row level security;
alter table public.membership_applications enable row level security;
alter table public.memberships enable row level security;
alter table public.artist_profiles enable row level security;
alter table public.payment_intents enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.ledger_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.audit_logs enable row level security;
alter table public.events enable row level security;
alter table public.event_reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.data_requests enable row level security;
alter table public.feature_flags enable row level security;

drop policy if exists "Active chapters are public" on public.chapters;
create policy "Active chapters are public"
on public.chapters for select to anon, authenticated using (is_active);
drop policy if exists "Current policies are public" on public.policy_versions;
create policy "Current policies are public"
on public.policy_versions for select to anon, authenticated using (is_current);
drop policy if exists "Public artist profiles are opt in" on public.artist_profiles;
create policy "Public artist profiles are opt in"
on public.artist_profiles for select to anon, authenticated
using (is_public and verified_at is not null);


drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
on public.profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
drop policy if exists "Admins read profiles" on public.profiles;
create policy "Admins read profiles"
on public.profiles for select to authenticated
using (public.current_user_has_permission('applications.review'));

drop policy if exists "Users read own application" on public.membership_applications;
create policy "Users read own application"
on public.membership_applications for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists "Permitted officers read applications" on public.membership_applications;
create policy "Permitted officers read applications"
on public.membership_applications for select to authenticated
using (public.current_user_has_permission('applications.review'));

drop policy if exists "Users read own memberships" on public.memberships;
create policy "Users read own memberships"
on public.memberships for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Permitted officers read memberships" on public.memberships;
create policy "Permitted officers read memberships"
on public.memberships for select to authenticated
using (public.current_user_has_permission('applications.review'));

drop policy if exists "Users read own consent history" on public.user_consents;
create policy "Users read own consent history"
on public.user_consents for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users read own role assignments" on public.user_role_assignments;
create policy "Users read own role assignments"
on public.user_role_assignments for select to authenticated
using (user_id = (select auth.uid()) or public.current_user_has_permission('roles.manage'));
drop policy if exists "Authenticated users read role names" on public.roles;
create policy "Authenticated users read role names"
on public.roles for select to authenticated using (true);
drop policy if exists "Authenticated users read permission names" on public.permissions;
create policy "Authenticated users read permission names"
on public.permissions for select to authenticated using (true);
drop policy if exists "Authenticated users read role permission map" on public.role_permissions;
create policy "Authenticated users read role permission map"
on public.role_permissions for select to authenticated using (true);

drop policy if exists "Users read own payments" on public.payment_intents;
create policy "Users read own payments"
on public.payment_intents for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Finance officers read payments" on public.payment_intents;
create policy "Finance officers read payments"
on public.payment_intents for select to authenticated
using (public.current_user_has_permission('payments.reconcile'));

drop policy if exists "Public can read public event listings" on public.events;
create policy "Public can read public event listings"
on public.events for select to anon, authenticated
using (is_public and status = 'approved');
drop policy if exists "Members read their event proposals" on public.events;
create policy "Members read their event proposals"
on public.events for select to authenticated
using (created_by = (select auth.uid()));
drop policy if exists "Members submit event proposals" on public.events;
create policy "Members submit event proposals"
on public.events for insert to authenticated
with check (created_by = (select auth.uid()) and status = 'submitted' and not is_public);
drop policy if exists "Event officers read event proposals" on public.events;
create policy "Event officers read event proposals"
on public.events for select to authenticated
using (
  public.current_user_has_permission('events.review.national')
  or (state_code is not null and public.current_user_has_permission('events.review.state'))
);

drop policy if exists "Members read own notifications" on public.notifications;
create policy "Members read own notifications"
on public.notifications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Members mark own notifications read" on public.notifications;
create policy "Members mark own notifications read"
on public.notifications for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users manage own support tickets" on public.support_tickets;
create policy "Users manage own support tickets"
on public.support_tickets for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users submit support tickets" on public.support_tickets;
create policy "Users submit support tickets"
on public.support_tickets for insert to authenticated
with check (user_id = (select auth.uid()));
drop policy if exists "Support officers review tickets" on public.support_tickets;
create policy "Support officers review tickets"
on public.support_tickets for select to authenticated
using (public.current_user_has_permission('support.review'));

drop policy if exists "Users read own data requests" on public.data_requests;
create policy "Users read own data requests"
on public.data_requests for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users submit data requests" on public.data_requests;
create policy "Users submit data requests"
on public.data_requests for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'submitted');

drop policy if exists "National admins read audit log" on public.audit_logs;
create policy "National admins read audit log"
on public.audit_logs for select to authenticated
using (public.current_user_has_permission('reports.view.national'));
drop policy if exists "National admins read ledger accounts" on public.ledger_accounts;
create policy "National admins read ledger accounts"
on public.ledger_accounts for select to authenticated
using (public.current_user_has_permission('reports.view.national'));
drop policy if exists "National admins read journal entries" on public.journal_entries;
create policy "National admins read journal entries"
on public.journal_entries for select to authenticated
using (public.current_user_has_permission('reports.view.national') and not is_demo);
drop policy if exists "National admins read journal lines" on public.journal_lines;
create policy "National admins read journal lines"
on public.journal_lines for select to authenticated
using (
  public.current_user_has_permission('reports.view.national')
  and exists (
    select 1 from public.journal_entries je
    where je.id = journal_entry_id and not je.is_demo
  )
);
drop policy if exists "National admins read feature flags" on public.feature_flags;
create policy "National admins read feature flags"
on public.feature_flags for select to authenticated
using (public.current_user_has_permission('settings.manage'));

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant select on public.chapters, public.policy_versions, public.artist_profiles, public.events to anon;
grant select, update on public.profiles to authenticated;
grant select on public.roles, public.permissions, public.role_permissions,
  public.user_role_assignments, public.policy_versions, public.user_consents,
  public.membership_applications, public.memberships, public.payment_intents,
  public.events, public.notifications, public.support_tickets, public.data_requests to authenticated;
grant insert on public.events, public.support_tickets, public.data_requests to authenticated;
grant update on public.notifications to authenticated;
grant select on public.audit_logs, public.ledger_accounts, public.journal_entries,
  public.journal_lines, public.feature_flags to authenticated;
grant execute on function public.current_user_has_permission(text) to authenticated;
grant execute on function public.review_membership_application(uuid, public.application_status, text) to authenticated;
grant execute on function public.bootstrap_first_super_admin(uuid) to service_role;
grant execute on function public.process_verified_payment(text, text, text, bigint) to service_role;
grant execute on function public.process_demo_payment(text, bigint) to service_role;
revoke all on function public.current_user_has_permission(text) from public, anon;
revoke all on function public.review_membership_application(uuid, public.application_status, text) from public, anon;
revoke all on function public.bootstrap_first_super_admin(uuid) from public, anon, authenticated;
revoke all on function public.process_verified_payment(text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.process_demo_payment(text, bigint) from public, anon, authenticated;
revoke all on public.payment_webhook_events from anon, authenticated;
revoke all on public.ledger_accounts, public.journal_entries, public.journal_lines,
  public.audit_logs, public.feature_flags from anon;
