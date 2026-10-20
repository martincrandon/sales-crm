create table public.crm_import_batches (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_system text not null,
  source_hash text not null,
  source_version integer not null default 1,
  manifest jsonb not null default '{}'::jsonb,
  unresolved_relationships jsonb not null default '[]'::jsonb,
  expected_counts jsonb not null default '{}'::jsonb,
  inserted_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  completed_at timestamptz,
  constraint crm_import_batches_source_system_valid
    check (source_system <> '' and pg_catalog.char_length(source_system) <= 80),
  constraint crm_import_batches_source_hash_valid
    check (source_hash ~ '^[0-9a-f]{64}$'),
  constraint crm_import_batches_source_version_valid
    check (source_version > 0),
  constraint crm_import_batches_manifest_object
    check (pg_catalog.jsonb_typeof(manifest) = 'object'),
  constraint crm_import_batches_unresolved_array
    check (pg_catalog.jsonb_typeof(unresolved_relationships) = 'array'),
  constraint crm_import_batches_expected_counts_object
    check (pg_catalog.jsonb_typeof(expected_counts) = 'object'),
  constraint crm_import_batches_inserted_counts_object
    check (pg_catalog.jsonb_typeof(inserted_counts) = 'object'),
  constraint crm_import_batches_user_id_id_unique unique (user_id, id),
  constraint crm_import_batches_owner_source_hash_unique
    unique (user_id, source_system, source_hash)
);

create table public.crm_source_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  import_batch_id uuid not null,
  source_system text not null,
  source_id text not null,
  source_path text not null,
  notion_page_id text,
  body text not null default '',
  properties jsonb not null default '{}'::jsonb,
  reason text not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint crm_source_documents_properties_object
    check (pg_catalog.jsonb_typeof(properties) = 'object'),
  constraint crm_source_documents_owner_source_unique
    unique (user_id, source_system, source_id),
  constraint crm_source_documents_owner_batch_fk
    foreign key (user_id, import_batch_id)
    references public.crm_import_batches (user_id, id) on delete restrict
);

create index crm_source_documents_owner_batch_idx
  on public.crm_source_documents (user_id, import_batch_id);

alter table public.companies
  drop constraint companies_name_valid,
  drop constraint companies_industry_valid,
  drop constraint companies_notes_valid;

drop index public.companies_user_name_unique;

alter table public.companies
  add constraint companies_name_valid
    check (
      name = pg_catalog.btrim(name)
      and name ~ '[^[:space:]]'
    ),
  add constraint companies_user_id_id_unique unique (user_id, id),
  add column source_system text,
  add column source_id text,
  add column notion_page_id text,
  add column source_properties jsonb not null default '{}'::jsonb,
  add column source_body text not null default '',
  add column source_path text,
  add column source_batch_id uuid,
  add constraint companies_source_properties_object
    check (pg_catalog.jsonb_typeof(source_properties) = 'object'),
  add constraint companies_source_identity_pair
    check ((source_system is null) = (source_id is null)),
  add constraint companies_source_batch_requires_identity
    check (source_batch_id is null or source_system is not null),
  add constraint companies_owner_source_batch_fk
    foreign key (user_id, source_batch_id)
    references public.crm_import_batches (user_id, id) on delete restrict;

create unique index companies_user_source_id_unique
  on public.companies (user_id, source_system, source_id)
  where source_system is not null and source_id is not null;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  email text,
  emails text[] not null default array[]::text[],
  phone text,
  job_title text,
  notes text,
  source_system text,
  source_id text,
  notion_page_id text,
  source_properties jsonb not null default '{}'::jsonb,
  source_body text not null default '',
  source_path text,
  source_batch_id uuid,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint contacts_name_valid
    check (
      name = pg_catalog.btrim(name)
      and name ~ '[^[:space:]]'
    ),
  constraint contacts_emails_valid
    check (pg_catalog.array_position(emails, null) is null),
  constraint contacts_source_properties_object
    check (pg_catalog.jsonb_typeof(source_properties) = 'object'),
  constraint contacts_source_identity_pair
    check ((source_system is null) = (source_id is null)),
  constraint contacts_source_batch_requires_identity
    check (source_batch_id is null or source_system is not null),
  constraint contacts_user_id_id_unique unique (user_id, id),
  constraint contacts_owner_source_batch_fk
    foreign key (user_id, source_batch_id)
    references public.crm_import_batches (user_id, id) on delete restrict
);

create unique index contacts_user_source_id_unique
  on public.contacts (user_id, source_system, source_id)
  where source_system is not null and source_id is not null;

create index contacts_user_updated_at_idx
  on public.contacts (user_id, updated_at desc);

create table public.contact_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contact_id uuid not null,
  company_id uuid not null,
  kind text not null,
  source_evidence jsonb not null default '{}'::jsonb,
  source_batch_id uuid,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint contact_companies_kind_valid
    check (kind in ('current', 'previous')),
  constraint contact_companies_source_evidence_object
    check (pg_catalog.jsonb_typeof(source_evidence) = 'object'),
  constraint contact_companies_owner_contact_company_kind_unique
    unique (user_id, contact_id, company_id, kind),
  constraint contact_companies_owner_contact_fk
    foreign key (user_id, contact_id)
    references public.contacts (user_id, id) on delete cascade,
  constraint contact_companies_owner_company_fk
    foreign key (user_id, company_id)
    references public.companies (user_id, id) on delete cascade,
  constraint contact_companies_owner_source_batch_fk
    foreign key (user_id, source_batch_id)
    references public.crm_import_batches (user_id, id) on delete restrict
);

create index contact_companies_user_company_idx
  on public.contact_companies (user_id, company_id);

create index contact_companies_user_source_batch_idx
  on public.contact_companies (user_id, source_batch_id)
  where source_batch_id is not null;

create function private.set_contacts_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function private.set_contacts_updated_at() from public, anon, authenticated;

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row
  execute function private.set_contacts_updated_at();

create function private.set_contact_companies_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function private.set_contact_companies_updated_at() from public, anon, authenticated;

create trigger contact_companies_set_updated_at
  before update on public.contact_companies
  for each row
  execute function private.set_contact_companies_updated_at();

create function private.set_crm_source_documents_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function private.set_crm_source_documents_updated_at() from public, anon, authenticated;

create trigger crm_source_documents_set_updated_at
  before update on public.crm_source_documents
  for each row
  execute function private.set_crm_source_documents_updated_at();

alter table public.crm_import_batches enable row level security;
alter table public.crm_import_batches force row level security;
alter table public.crm_source_documents enable row level security;
alter table public.crm_source_documents force row level security;
alter table public.companies enable row level security;
alter table public.companies force row level security;
alter table public.contacts enable row level security;
alter table public.contacts force row level security;
alter table public.contact_companies enable row level security;
alter table public.contact_companies force row level security;

create policy crm_import_batches_select_approved_owner
  on public.crm_import_batches
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

create policy crm_source_documents_select_approved_owner
  on public.crm_source_documents
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

create policy contacts_select_approved_owner
  on public.contacts
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

create policy contacts_insert_approved_owner
  on public.contacts
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

create policy contacts_update_approved_owner
  on public.contacts
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

create policy contacts_delete_approved_owner
  on public.contacts
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

create policy contact_companies_select_approved_owner
  on public.contact_companies
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

revoke all on table public.companies from public, anon, authenticated;
revoke all on table public.contacts from public, anon, authenticated;
revoke all on table public.contact_companies from public, anon, authenticated;
revoke all on table public.crm_import_batches from public, anon, authenticated;
revoke all on table public.crm_source_documents from public, anon, authenticated;

grant select (
  id, name, website, industry, notes, source_system, source_id, notion_page_id,
  source_properties, source_body, source_path, created_at, updated_at
) on table public.companies to authenticated;
grant insert (name, website, industry, notes)
  on table public.companies to authenticated;
grant update (name, website, industry, notes)
  on table public.companies to authenticated;
grant delete on table public.companies to authenticated;

grant select (
  id, name, email, emails, phone, job_title, notes, source_system, source_id,
  notion_page_id, source_properties, source_body, source_path, created_at, updated_at
) on table public.contacts to authenticated;
grant insert (name, email, emails, phone, job_title, notes)
  on table public.contacts to authenticated;
grant update (name, email, emails, phone, job_title, notes)
  on table public.contacts to authenticated;
grant delete on table public.contacts to authenticated;

grant select (id, contact_id, company_id, kind, source_evidence, created_at)
  on table public.contact_companies to authenticated;
grant select (
  id, source_system, source_hash, source_version, manifest,
  unresolved_relationships, expected_counts, inserted_counts, created_at, completed_at
) on table public.crm_import_batches to authenticated;
grant select (
  id, import_batch_id, source_system, source_id, source_path, notion_page_id,
  body, properties, reason, created_at
) on table public.crm_source_documents to authenticated;
