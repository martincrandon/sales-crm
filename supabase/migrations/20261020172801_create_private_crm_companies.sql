create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table private.crm_allowed_emails (
  email text primary key,
  created_at timestamptz not null default pg_catalog.now(),
  constraint crm_allowed_emails_canonical_email
    check (email = pg_catalog.lower(pg_catalog.btrim(email)) and email <> '')
);

alter table private.crm_allowed_emails enable row level security;
alter table private.crm_allowed_emails force row level security;

revoke all on table private.crm_allowed_emails from public, anon, authenticated;
grant select on table private.crm_allowed_emails to authenticated;

create policy crm_allowed_emails_read_own_address
  on private.crm_allowed_emails
  for select
  to authenticated
  using (
    email = pg_catalog.lower(
      coalesce((select auth.jwt() ->> 'email'), '')
    )
    and (select auth.jwt() ->> 'is_anonymous') = 'false'
  );

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  website text,
  industry text,
  notes text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint companies_name_valid
    check (
      pg_catalog.char_length(name) between 1 and 160
      and name = pg_catalog.btrim(name)
      and name ~ '[^[:space:]]'
    ),
  constraint companies_website_valid
    check (
      website is null
      or (
        pg_catalog.char_length(website) <= 2048
        and website ~* '^https?://[^[:space:]]+$'
      )
    ),
  constraint companies_industry_valid
    check (industry is null or pg_catalog.char_length(industry) <= 120),
  constraint companies_notes_valid
    check (notes is null or pg_catalog.char_length(notes) <= 5000)
);

create unique index companies_user_name_unique
  on public.companies (user_id, pg_catalog.lower(name));

create index companies_user_updated_at_idx
  on public.companies (user_id, updated_at desc);

alter table public.companies enable row level security;
alter table public.companies force row level security;

revoke all on table public.companies from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select (id, name, website, industry, notes, created_at, updated_at)
  on table public.companies to authenticated;
grant insert (name, website, industry, notes)
  on table public.companies to authenticated;
grant update (name, website, industry, notes)
  on table public.companies to authenticated;
grant delete on table public.companies to authenticated;

create policy companies_select_approved_owner
  on public.companies
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'is_anonymous') = 'false'
    and exists (
      select 1
      from private.crm_allowed_emails as allowed
      where allowed.email = pg_catalog.lower(
        coalesce((select auth.jwt() ->> 'email'), '')
      )
    )
  );

create policy companies_insert_approved_owner
  on public.companies
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'is_anonymous') = 'false'
    and exists (
      select 1
      from private.crm_allowed_emails as allowed
      where allowed.email = pg_catalog.lower(
        coalesce((select auth.jwt() ->> 'email'), '')
      )
    )
  );

create policy companies_update_approved_owner
  on public.companies
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'is_anonymous') = 'false'
    and exists (
      select 1
      from private.crm_allowed_emails as allowed
      where allowed.email = pg_catalog.lower(
        coalesce((select auth.jwt() ->> 'email'), '')
      )
    )
  )
  with check (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'is_anonymous') = 'false'
    and exists (
      select 1
      from private.crm_allowed_emails as allowed
      where allowed.email = pg_catalog.lower(
        coalesce((select auth.jwt() ->> 'email'), '')
      )
    )
  );

create policy companies_delete_approved_owner
  on public.companies
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'is_anonymous') = 'false'
    and exists (
      select 1
      from private.crm_allowed_emails as allowed
      where allowed.email = pg_catalog.lower(
        coalesce((select auth.jwt() ->> 'email'), '')
      )
    )
  );

create function private.set_companies_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function private.set_companies_updated_at() from public, anon, authenticated;

create trigger companies_set_updated_at
  before update on public.companies
  for each row
  execute function private.set_companies_updated_at();
