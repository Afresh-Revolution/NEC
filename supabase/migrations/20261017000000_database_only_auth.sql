-- Move application accounts from Supabase Auth to password-hashed PostgreSQL
-- accounts so runtime authentication needs only DATABASE_URL.
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  full_name text not null,
  profession text,
  home_state text,
  is_active boolean not null default true,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_users_email_lower_unique
  on public.app_users (lower(email));

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_sessions_expiry_idx
  on public.app_sessions (expires_at);

-- Preserve existing Auth users and their bcrypt password hashes where possible.
insert into public.app_users
  (id, email, password_hash, full_name, profession, home_state, email_verified_at, created_at)
select
  id,
  coalesce(lower(email), id::text || '@migrated.invalid'),
  coalesce(nullif(encrypted_password, ''), '$2b$12$C6UzMDM.H6dfI/f/IKcEe.6W5z2U7YjG0Z1aAgb6iN2l7i7a4a5uS'),
  coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), email, 'NEC Naija member'),
  nullif(raw_user_meta_data ->> 'profession', ''),
  nullif(raw_user_meta_data ->> 'home_state', ''),
  email_confirmed_at,
  created_at
from auth.users
on conflict (id) do nothing;

-- Retarget application foreign keys without modifying their existing row values.
do $$
declare
  fk record;
  local_column text;
  delete_action text;
begin
  for fk in
    select
      constraint_row.conrelid::regclass as table_name,
      constraint_row.conname,
      constraint_row.confdeltype,
      attribute_row.attname as column_name
    from pg_constraint constraint_row
    join pg_class table_row
      on table_row.oid = constraint_row.conrelid
    join pg_namespace schema_row
      on schema_row.oid = table_row.relnamespace
    join pg_attribute attribute_row
      on attribute_row.attrelid = constraint_row.conrelid
     and attribute_row.attnum = constraint_row.conkey[1]
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'auth.users'::regclass
      and schema_row.nspname = 'public'
  loop
    local_column := fk.column_name;
    delete_action := case fk.confdeltype
      when 'c' then 'cascade'
      when 'n' then 'set null'
      when 'd' then 'set default'
      when 'r' then 'restrict'
      else 'no action'
    end;

    execute format('alter table %s drop constraint %I', fk.table_name, fk.conname);
    execute format(
      'alter table %s add constraint %I foreign key (%I) references public.app_users(id) on delete %s not valid',
      fk.table_name,
      fk.conname,
      local_column,
      delete_action
    );
    execute format('alter table %s validate constraint %I', fk.table_name, fk.conname);
  end loop;
end $$;

drop trigger if exists on_auth_user_created on auth.users;

-- Prevent the old hosted-Auth-only bootstrap function from being used by the app.
revoke all on function public.bootstrap_first_super_admin(uuid) from public, anon, authenticated, service_role;
drop function if exists public.bootstrap_first_super_admin(uuid);

-- These tables are reached only through the server-side DATABASE_URL connection.
-- Client credentials never receive direct SQL access.
revoke all on public.app_users, public.app_sessions from anon, authenticated, service_role;
