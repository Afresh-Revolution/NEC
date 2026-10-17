alter table public.payment_intents
  add column if not exists plan_code text
  check (plan_code is null or plan_code in ('monthly', 'yearly'));

drop index if exists public.payment_intents_one_live_attempt;
create unique index if not exists payment_intents_one_pending_attempt
  on public.payment_intents(application_id, provider)
  where status = 'pending';

create table if not exists public.membership_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  application_id uuid not null unique references public.membership_applications(id) on delete restrict,
  plan_code text not null check (plan_code in ('monthly', 'yearly')),
  amount_minor bigint not null check (amount_minor > 0),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'non_renewing', 'past_due', 'expired', 'cancelled')),
  auto_renew boolean not null default true,
  paystack_subscription_code text unique,
  paystack_email_token text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists membership_subscriptions_expiry
  on public.membership_subscriptions(current_period_end)
  where status in ('active', 'non_renewing');

create table if not exists public.membership_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.membership_subscriptions(id) on delete restrict,
  provider_transaction_id text not null unique,
  provider_reference text not null,
  amount_minor bigint not null check (amount_minor > 0),
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.member_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_id text not null unique,
  secure_url text not null,
  resource_type text not null check (resource_type in ('image', 'video')),
  format text not null,
  bytes bigint not null check (bytes > 0 and bytes <= 10485760),
  duration_seconds numeric,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  check (resource_type <> 'video' or (duration_seconds is not null and duration_seconds <= 60))
);

create index if not exists member_media_user_created
  on public.member_media(user_id, created_at desc);
create index if not exists member_media_public
  on public.member_media(created_at desc)
  where is_public;

alter table public.support_tickets
  add column if not exists details text not null default '';

update public.ledger_accounts
set account_name = 'Membership subscription fees'
where account_code = '4000-MEMBERSHIP-FEES';
update public.ledger_accounts
set account_name = 'Development test payments'
where account_code = '4090-DEMO-FEES';

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  attempts integer not null default 0,
  last_error text,
  locked_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_outbox_pending
  on public.email_outbox(created_at)
  where sent_at is null and attempts < 5;

create table if not exists public.email_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template text not null,
  period_end date not null,
  created_at timestamptz not null default now(),
  unique (user_id, template, period_end)
);

create or replace function public.review_membership_application(
  p_application_id uuid,
  p_decision text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_record public.membership_applications%rowtype;
  subscription_is_active boolean;
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
      select 1 from public.membership_subscriptions subscription
      where subscription.application_id = application_record.id
        and subscription.status in ('active', 'non_renewing')
        and subscription.current_period_end > now()
    ) into subscription_is_active;
    if not subscription_is_active then
      raise exception 'Membership cannot be activated without an active subscription';
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
