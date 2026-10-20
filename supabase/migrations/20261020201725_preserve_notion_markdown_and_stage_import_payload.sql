alter table public.companies
  add column source_markdown_properties jsonb not null default '{}'::jsonb,
  add constraint companies_source_markdown_properties_object
    check (pg_catalog.jsonb_typeof(source_markdown_properties) = 'object');

alter table public.contacts
  add column source_markdown_properties jsonb not null default '{}'::jsonb,
  add constraint contacts_source_markdown_properties_object
    check (pg_catalog.jsonb_typeof(source_markdown_properties) = 'object');

create table private.crm_import_payload_chunks (
  batch_id uuid not null,
  part_index integer not null,
  part_count integer not null,
  expected_payload_bytes bigint not null,
  expected_payload_md5 text not null,
  expected_source_hash text not null,
  expected_counts jsonb not null,
  payload_chunk text not null,
  payload_bytes integer not null,
  payload_md5 text not null,
  constraint crm_import_payload_chunks_batch_part_pk
    primary key (batch_id, part_index),
  constraint crm_import_payload_chunks_part_range
    check (part_index >= 0 and part_count > 0 and part_index < part_count),
  constraint crm_import_payload_chunks_payload_size
    check (expected_payload_bytes > 0 and payload_bytes > 0
      and pg_catalog.octet_length(payload_chunk) = payload_bytes),
  constraint crm_import_payload_chunks_checksums_valid
    check (
      expected_payload_md5 ~ '^[0-9a-f]{32}$'
      and payload_md5 ~ '^[0-9a-f]{32}$'
      and payload_md5 = pg_catalog.md5(payload_chunk)
      and expected_source_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint crm_import_payload_chunks_counts_object
    check (pg_catalog.jsonb_typeof(expected_counts) = 'object')
);

alter table private.crm_import_payload_chunks enable row level security;
alter table private.crm_import_payload_chunks force row level security;
revoke all on table private.crm_import_payload_chunks
  from public, anon, authenticated, service_role;

grant select (
  id, name, website, industry, notes, source_system, source_id, notion_page_id,
  source_properties, source_markdown_properties, source_body, source_path,
  created_at, updated_at
) on table public.companies to authenticated;

grant select (
  id, name, email, emails, phone, job_title, notes, source_system, source_id,
  notion_page_id, source_properties, source_markdown_properties, source_body,
  source_path, created_at, updated_at
) on table public.contacts to authenticated;
