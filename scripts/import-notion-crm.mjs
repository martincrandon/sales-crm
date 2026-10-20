import { createHash } from "node:crypto";
import { chmod, mkdir, open, readFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_SYSTEM = "notion-export";
const BATCH_SIZE = 100;
const STAGING_CHUNK_BYTES = 6000;

function fail(message) {
  throw new Error(message);
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + " must be an object.");
  }
  return value;
}

function array(value, label) {
  if (!Array.isArray(value)) fail(label + " must be an array.");
  return value;
}

function text(value, label, options = {}) {
  if (options.nullable && value === null) return null;
  if (typeof value !== "string") {
    fail(label + " must be a string" + (options.nullable ? " or null." : "."));
  }
  if (value.includes(String.fromCharCode(0))) {
    fail(label + " contains a NUL character that PostgreSQL cannot store.");
  }
  if (options.nonempty && value.trim() === "") fail(label + " cannot be empty.");
  return value;
}

function assertJsonText(value, label) {
  if (typeof value === "string") {
    if (value.includes(String.fromCharCode(0))) {
      fail(label + " contains a NUL character that PostgreSQL cannot store.");
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonText(item, label + "[" + index + "]"));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertJsonText(key, label + " property name");
      assertJsonText(item, label + "." + key);
    }
  }
}

function properties(value, label) {
  const record = object(value, label);
  assertJsonText(record, label);
  return record;
}

function nullableText(value, label) {
  return value === null ? null : text(value, label);
}

function recordName(value, label) {
  const name = text(value, label, { nonempty: true });
  if (name !== name.trim()) fail(label + " must not start or end with whitespace.");
  return name;
}

function companyWebsite(value, label) {
  const website = nullableText(value, label);
  if (website !== null && (website.length > 2048 || !/^https?:\/\/\S+$/i.test(website))) {
    fail(label + " must be an HTTP(S) URL of at most 2048 characters.");
  }
  return website;
}

function uniqueBy(items, key, label) {
  const seen = new Set();
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) fail(label + " contains duplicate source IDs.");
    seen.add(value);
  }
}

function validateContract(input) {
  object(input, "Import file");
  if (input.version !== 1) fail("Import version must be 1.");
  if (input.source !== SOURCE_SYSTEM) fail("Import source must be '" + SOURCE_SYSTEM + "'.");

  const manifest = properties(input.manifest, "manifest");
  const unresolved = array(input.unresolved_relationships, "unresolved_relationships");
  assertJsonText(unresolved, "unresolved_relationships");

  const companies = array(input.companies, "companies").map((item, index) => {
    const label = "companies[" + index + "]";
    object(item, label);
    return {
      source_id: text(item.source_id, label + ".source_id", { nonempty: true }),
      notion_page_id: nullableText(item.notion_page_id, label + ".notion_page_id"),
      name: recordName(item.name, label + ".name"),
      website: companyWebsite(item.website, label + ".website"),
      industry: nullableText(item.industry, label + ".industry"),
      notes: nullableText(item.notes, label + ".notes"),
      source_properties: properties(item.source_properties, label + ".source_properties"),
      source_markdown_properties: properties(
        item.source_markdown_properties ?? {},
        label + ".source_markdown_properties",
      ),
      source_body: text(item.source_body, label + ".source_body"),
      source_path: text(item.source_path, label + ".source_path", { nonempty: true }),
    };
  });

  const contacts = array(input.contacts, "contacts").map((item, index) => {
    const label = "contacts[" + index + "]";
    object(item, label);
    return {
      source_id: text(item.source_id, label + ".source_id", { nonempty: true }),
      notion_page_id: nullableText(item.notion_page_id, label + ".notion_page_id"),
      name: recordName(item.name, label + ".name"),
      email: nullableText(item.email, label + ".email"),
      emails: array(item.emails, label + ".emails").map((value, emailIndex) =>
        text(value, label + ".emails[" + emailIndex + "]"),
      ),
      phone: nullableText(item.phone, label + ".phone"),
      job_title: nullableText(item.job_title, label + ".job_title"),
      notes: nullableText(item.notes ?? null, label + ".notes"),
      source_properties: properties(item.source_properties, label + ".source_properties"),
      source_markdown_properties: properties(
        item.source_markdown_properties ?? {},
        label + ".source_markdown_properties",
      ),
      source_body: text(item.source_body, label + ".source_body"),
      source_path: text(item.source_path, label + ".source_path", { nonempty: true }),
    };
  });

  const relationships = array(input.relationships, "relationships").map((item, index) => {
    const label = "relationships[" + index + "]";
    object(item, label);
    if (item.kind !== "current" && item.kind !== "previous") {
      fail(label + ".kind must be 'current' or 'previous'.");
    }
    return {
      contact_source_id: text(item.contact_source_id, label + ".contact_source_id", { nonempty: true }),
      company_source_id: text(item.company_source_id, label + ".company_source_id", { nonempty: true }),
      kind: item.kind,
      source_evidence: properties(item.source_evidence, label + ".source_evidence"),
    };
  });

  const sourceDocuments = array(input.source_documents, "source_documents").map((item, index) => {
    const label = "source_documents[" + index + "]";
    object(item, label);
    return {
      source_id: text(item.source_id, label + ".source_id", { nonempty: true }),
      path: text(item.path, label + ".path", { nonempty: true }),
      notion_page_id: nullableText(item.notion_page_id, label + ".notion_page_id"),
      body: text(item.body, label + ".body"),
      properties: properties(item.properties, label + ".properties"),
      reason: text(item.reason, label + ".reason"),
    };
  });

  uniqueBy(companies, (item) => item.source_id, "companies");
  uniqueBy(contacts, (item) => item.source_id, "contacts");
  uniqueBy(sourceDocuments, (item) => item.source_id, "source_documents");

  const companyIds = new Set(companies.map((item) => item.source_id));
  const contactIds = new Set(contacts.map((item) => item.source_id));
  const relationshipKeys = new Set();
  for (const item of relationships) {
    if (!contactIds.has(item.contact_source_id)) {
      fail("A relationship references a contact that is not present in this import.");
    }
    if (!companyIds.has(item.company_source_id)) {
      fail("A relationship references a company that is not present in this import.");
    }
    const key = JSON.stringify([item.contact_source_id, item.company_source_id, item.kind]);
    if (relationshipKeys.has(key)) {
      fail("relationships contains duplicate contact/company/kind links.");
    }
    relationshipKeys.add(key);
  }

  const normalized = {
    version: 1,
    source: SOURCE_SYSTEM,
    companies,
    contacts,
    relationships,
    source_documents: sourceDocuments,
    unresolved_relationships: unresolved,
    manifest,
  };
  assertJsonText(normalized, "Import file");
  return normalized;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function sqlText(value) {
  if (value === null) return "null";
  const escaped = value
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "''")
    .replaceAll("\b", "\\b")
    .replaceAll("\f", "\\f")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")
    .replaceAll("\v", "\\v");
  return "E'" + escaped + "'";
}

function sqlJson(value) {
  return sqlText(JSON.stringify(value)) + "::jsonb";
}

function sqlTextArray(values) {
  if (values.length === 0) return "array[]::text[]";
  return "array[" + values.map(sqlText).join(", ") + "]::text[]";
}

function valuesStatements(items, mapper, columns, tableName) {
  if (items.length === 0) {
    return "select 1 where false;";
  }
  const statements = [];
  for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
    const rows = items.slice(offset, offset + BATCH_SIZE).map((item) => "(" + mapper(item) + ")");
    statements.push(
      "insert into " + tableName + " (" + columns + ") values\n" + rows.join(",\n") + ";",
    );
  }
  return statements.join("\n\n");
}

function uuidFromHash(hex) {
  const bytes = Buffer.from(hex.slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = bytes.toString("hex");
  return value.slice(0, 8) + "-" + value.slice(8, 12) + "-" +
    value.slice(12, 16) + "-" + value.slice(16, 20) + "-" + value.slice(20);
}

function renderImportSql(data, ownerId, sourceHash, batchId) {
  const counts = {
    companies: data.companies.length,
    contacts: data.contacts.length,
    relationships: data.relationships.length,
    source_documents: data.source_documents.length,
    unresolved_relationships: data.unresolved_relationships.length,
  };
  const companyRows = valuesStatements(
    data.companies,
    (row) => [
      sqlText(row.source_id),
      sqlText(row.notion_page_id),
      sqlText(row.name),
      sqlText(row.website),
      sqlText(row.industry),
      sqlText(row.notes),
      sqlJson(row.source_properties),
      sqlJson(row.source_markdown_properties),
      sqlText(row.source_body),
      sqlText(row.source_path),
    ].join(", "),
    "source_id, notion_page_id, name, website, industry, notes, source_properties, source_markdown_properties, source_body, source_path",
    "_crm_stage_companies",
  );
  const contactRows = valuesStatements(
    data.contacts,
    (row) => [
      sqlText(row.source_id),
      sqlText(row.notion_page_id),
      sqlText(row.name),
      sqlText(row.email),
      sqlTextArray(row.emails),
      sqlText(row.phone),
      sqlText(row.job_title),
      sqlText(row.notes),
      sqlJson(row.source_properties),
      sqlJson(row.source_markdown_properties),
      sqlText(row.source_body),
      sqlText(row.source_path),
    ].join(", "),
    "source_id, notion_page_id, name, email, emails, phone, job_title, notes, source_properties, source_markdown_properties, source_body, source_path",
    "_crm_stage_contacts",
  );
  const relationshipRows = valuesStatements(
    data.relationships,
    (row) => [
      sqlText(row.contact_source_id),
      sqlText(row.company_source_id),
      sqlText(row.kind),
      sqlJson(row.source_evidence),
    ].join(", "),
    "contact_source_id, company_source_id, kind, source_evidence",
    "_crm_stage_relationships",
  );
  const documentRows = valuesStatements(
    data.source_documents,
    (row) => [
      sqlText(row.source_id),
      sqlText(row.path),
      sqlText(row.notion_page_id),
      sqlText(row.body),
      sqlJson(row.properties),
      sqlText(row.reason),
    ].join(", "),
    "source_id, source_path, notion_page_id, body, properties, reason",
    "_crm_stage_documents",
  );

  const lines = [
    "begin;",
    "",
    "do $$",
    "begin",
    "  if not exists (",
    "    select 1 from auth.users as account",
    "    join private.crm_allowed_emails as allowed",
    "      on allowed.email = pg_catalog.lower(coalesce(account.email, ''))",
    "    where account.id = '" + ownerId + "'::uuid",
    "  ) then",
    "    raise exception 'Import owner is not present in the approved-email allowlist.';",
    "  end if;",
    "end;",
    "$$;",
    "",
    "insert into public.crm_import_batches (",
    "  id, user_id, source_system, source_hash, source_version, manifest,",
    "  unresolved_relationships, expected_counts",
    ") values (",
    "  '" + batchId + "'::uuid, '" + ownerId + "'::uuid, 'notion-export', '" + sourceHash + "', 1,",
    "  " + sqlJson(data.manifest) + ", " + sqlJson(data.unresolved_relationships) + ", " + sqlJson(counts),
    ")",
    "on conflict (user_id, source_system, source_hash) do nothing;",
    "",
    "create temporary table _crm_batch_context on commit drop as",
    "select id from public.crm_import_batches",
    "where user_id = '" + ownerId + "'::uuid",
    "  and source_system = 'notion-export'",
    "  and source_hash = '" + sourceHash + "';",
    "",
    "do $$",
    "begin",
    "  if (select pg_catalog.count(*) from _crm_batch_context) <> 1 then",
    "    raise exception 'Import batch identity is ambiguous.';",
    "  end if;",
    "end;",
    "$$;",
    "",
    "create temporary table _crm_stage_companies (",
    "  source_id text primary key, notion_page_id text, name text not null, website text,",
    "  industry text, notes text, source_properties jsonb not null, source_markdown_properties jsonb not null, source_body text not null,",
    "  source_path text not null",
    ") on commit drop;",
    "",
    companyRows,
    "",
    "create temporary table _crm_stage_contacts (",
    "  source_id text primary key, notion_page_id text, name text not null, email text,",
    "  emails text[] not null, phone text, job_title text, notes text, source_properties jsonb not null, source_markdown_properties jsonb not null,",
    "  source_body text not null, source_path text not null",
    ") on commit drop;",
    "",
    contactRows,
    "",
    "create temporary table _crm_stage_relationships (",
    "  contact_source_id text not null, company_source_id text not null, kind text not null,",
    "  source_evidence jsonb not null, primary key (contact_source_id, company_source_id, kind)",
    ") on commit drop;",
    "",
    relationshipRows,
    "",
    "create temporary table _crm_stage_documents (",
    "  source_id text primary key, source_path text not null, notion_page_id text,",
    "  body text not null, properties jsonb not null, reason text not null",
    ") on commit drop;",
    "",
    documentRows,
    "",
    "create temporary table _crm_added_companies (id uuid primary key) on commit drop;",
    "create temporary table _crm_added_contacts (id uuid primary key) on commit drop;",
    "create temporary table _crm_added_relationships (id uuid primary key) on commit drop;",
    "create temporary table _crm_added_documents (id uuid primary key) on commit drop;",
    "",
    "with inserted as (",
    "  insert into public.companies (",
    "    user_id, name, website, industry, notes, source_system, source_id,",
    "    notion_page_id, source_properties, source_markdown_properties, source_body, source_path, source_batch_id",
    "  )",
    "  select '" + ownerId + "'::uuid, staged.name, staged.website, staged.industry, staged.notes,",
    "    'notion-export', staged.source_id, staged.notion_page_id, staged.source_properties, staged.source_markdown_properties,",
    "    staged.source_body, staged.source_path, batch.id",
    "  from _crm_stage_companies as staged cross join _crm_batch_context as batch",
    "  on conflict (user_id, source_system, source_id)",
    "    where source_system is not null and source_id is not null do nothing",
    "  returning id",
    ") insert into _crm_added_companies (id) select id from inserted;",
    "",
    "with inserted as (",
    "  insert into public.contacts (",
    "    user_id, name, email, emails, phone, job_title, notes, source_system, source_id,",
    "    notion_page_id, source_properties, source_markdown_properties, source_body, source_path, source_batch_id",
    "  )",
    "  select '" + ownerId + "'::uuid, staged.name, staged.email, staged.emails, staged.phone,",
    "    staged.job_title, staged.notes, 'notion-export', staged.source_id, staged.notion_page_id,",
    "    staged.source_properties, staged.source_markdown_properties, staged.source_body, staged.source_path, batch.id",
    "  from _crm_stage_contacts as staged cross join _crm_batch_context as batch",
    "  on conflict (user_id, source_system, source_id)",
    "    where source_system is not null and source_id is not null do nothing",
    "  returning id",
    ") insert into _crm_added_contacts (id) select id from inserted;",
    "",
    "with inserted as (",
    "  insert into public.contact_companies (",
    "    user_id, contact_id, company_id, kind, source_evidence, source_batch_id",
    "  )",
    "  select '" + ownerId + "'::uuid, contact.id, company.id, staged.kind, staged.source_evidence, batch.id",
    "  from _crm_stage_relationships as staged",
    "  join public.contacts as contact on contact.user_id = '" + ownerId + "'::uuid",
    "    and contact.source_system = 'notion-export' and contact.source_id = staged.contact_source_id",
    "  join public.companies as company on company.user_id = '" + ownerId + "'::uuid",
    "    and company.source_system = 'notion-export' and company.source_id = staged.company_source_id",
    "  cross join _crm_batch_context as batch",
    "  on conflict (user_id, contact_id, company_id, kind) do nothing",
    "  returning id",
    ") insert into _crm_added_relationships (id) select id from inserted;",
    "",
    "with inserted as (",
    "  insert into public.crm_source_documents (",
    "    user_id, import_batch_id, source_system, source_id, source_path,",
    "    notion_page_id, body, properties, reason",
    "  )",
    "  select '" + ownerId + "'::uuid, batch.id, 'notion-export', staged.source_id,",
    "    staged.source_path, staged.notion_page_id, staged.body, staged.properties, staged.reason",
    "  from _crm_stage_documents as staged cross join _crm_batch_context as batch",
    "  on conflict (user_id, source_system, source_id) do nothing",
    "  returning id",
    ") insert into _crm_added_documents (id) select id from inserted;",
    "",
    "do $$",
    "declare actual_count bigint;",
    "begin",
    "  select pg_catalog.count(*) into actual_count",
    "  from public.companies as target join _crm_stage_companies as staged on staged.source_id = target.source_id",
    "  where target.user_id = '" + ownerId + "'::uuid and target.source_system = 'notion-export';",
    "  if actual_count <> " + counts.companies + " then",
    "    raise exception 'Company source ID assertion failed: expected %, found %', " + counts.companies + ", actual_count;",
    "  end if;",
    "  select pg_catalog.count(*) into actual_count",
    "  from public.contacts as target join _crm_stage_contacts as staged on staged.source_id = target.source_id",
    "  where target.user_id = '" + ownerId + "'::uuid and target.source_system = 'notion-export';",
    "  if actual_count <> " + counts.contacts + " then",
    "    raise exception 'Contact source ID assertion failed: expected %, found %', " + counts.contacts + ", actual_count;",
    "  end if;",
    "  select pg_catalog.count(*) into actual_count",
    "  from _crm_stage_relationships as staged",
    "  join public.contacts as contact on contact.user_id = '" + ownerId + "'::uuid",
    "    and contact.source_system = 'notion-export' and contact.source_id = staged.contact_source_id",
    "  join public.companies as company on company.user_id = '" + ownerId + "'::uuid",
    "    and company.source_system = 'notion-export' and company.source_id = staged.company_source_id",
    "  join public.contact_companies as link on link.user_id = '" + ownerId + "'::uuid",
    "    and link.contact_id = contact.id and link.company_id = company.id and link.kind = staged.kind;",
    "  if actual_count <> " + counts.relationships + " then",
    "    raise exception 'Relationship assertion failed: expected %, found %', " + counts.relationships + ", actual_count;",
    "  end if;",
    "  select pg_catalog.count(*) into actual_count",
    "  from public.crm_source_documents as target join _crm_stage_documents as staged on staged.source_id = target.source_id",
    "  where target.user_id = '" + ownerId + "'::uuid and target.source_system = 'notion-export';",
    "  if actual_count <> " + counts.source_documents + " then",
    "    raise exception 'Source document assertion failed: expected %, found %', " + counts.source_documents + ", actual_count;",
    "  end if;",
    "end;",
    "$$;",
    "",
    "update public.crm_import_batches as batch",
    "set inserted_counts = jsonb_build_object(",
    "      'companies', (select pg_catalog.count(*) from _crm_added_companies),",
    "      'contacts', (select pg_catalog.count(*) from _crm_added_contacts),",
    "      'relationships', (select pg_catalog.count(*) from _crm_added_relationships),",
    "      'source_documents', (select pg_catalog.count(*) from _crm_added_documents)",
    "    ),",
    "    completed_at = pg_catalog.clock_timestamp()",
    "from _crm_batch_context as context",
    "where batch.id = context.id and batch.user_id = '" + ownerId + "'::uuid",
    "  and batch.completed_at is null;",
    "",
    "commit;",
  ];
  return lines.join("\n") + "\n";
}

function splitUtf8Chunks(value, maxBytes) {
  const chunks = [];
  let current = "";
  let currentBytes = 0;

  for (const character of value) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    if (current && currentBytes + characterBytes > maxBytes) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += character;
    currentBytes += characterBytes;
  }

  if (current) chunks.push(current);
  return chunks;
}

function renderPayloadChunkSql({ batchId, index, chunks, payloadBytes, payloadMd5, sourceHash, counts }) {
  const chunk = chunks[index];
  const chunkHex = Buffer.from(chunk, "utf8").toString("hex");
  const chunkBytes = Buffer.byteLength(chunk, "utf8");
  const chunkMd5 = createHash("md5").update(chunk, "utf8").digest("hex");
  const chunkExpression = "pg_catalog.convert_from(pg_catalog.decode('" + chunkHex + "', 'hex'), 'UTF8')";

  return [
    "begin;",
    "do $stage$",
    "declare affected_rows integer;",
    "begin",
    "  insert into private.crm_import_payload_chunks (",
    "    batch_id, part_index, part_count, expected_payload_bytes, expected_payload_md5,",
    "    expected_source_hash, expected_counts, payload_chunk, payload_bytes, payload_md5",
    "  ) values (",
    "    '" + batchId + "'::uuid, " + index + ", " + chunks.length + ", " + payloadBytes + ",",
    "    '" + payloadMd5 + "', '" + sourceHash + "', " + sqlJson(counts) + ",",
    "    " + chunkExpression + ", " + chunkBytes + ", '" + chunkMd5 + "'",
    "  )",
    "  on conflict (batch_id, part_index) do update",
    "  set payload_chunk = excluded.payload_chunk",
    "  where private.crm_import_payload_chunks.part_count = excluded.part_count",
    "    and private.crm_import_payload_chunks.expected_payload_bytes = excluded.expected_payload_bytes",
    "    and private.crm_import_payload_chunks.expected_payload_md5 = excluded.expected_payload_md5",
    "    and private.crm_import_payload_chunks.expected_source_hash = excluded.expected_source_hash",
    "    and private.crm_import_payload_chunks.expected_counts = excluded.expected_counts",
    "    and private.crm_import_payload_chunks.payload_chunk = excluded.payload_chunk",
    "    and private.crm_import_payload_chunks.payload_bytes = excluded.payload_bytes",
    "    and private.crm_import_payload_chunks.payload_md5 = excluded.payload_md5;",
    "  get diagnostics affected_rows = row_count;",
    "  if affected_rows <> 1 then",
    "    raise exception 'Staged import chunk conflicts with a different existing value.';",
    "  end if;",
    "end;",
    "$stage$;",
    "commit;",
    "",
  ].join("\n");
}

function renderStagedFinalizeSql(ownerId, sourceHash, batchId, payloadBytes, payloadMd5, counts, partCount) {
  const expectedCounts = sqlJson(counts);
  const lines = [
    "begin;",
    "",
    "create temporary table _crm_import_chunk_meta on commit drop as",
    "select part_count, expected_payload_bytes, expected_payload_md5, expected_source_hash, expected_counts",
    "from private.crm_import_payload_chunks",
    "where batch_id = '" + batchId + "'::uuid",
    "order by part_index",
    "limit 1;",
    "",
    "do $preflight$",
    "declare context_row record; part_rows bigint; first_part integer; last_part integer;",
    "begin",
    "  select * into context_row from _crm_import_chunk_meta;",
    "  if not found then raise exception 'Import staging payload is missing.'; end if;",
    "  select count(*), min(part_index), max(part_index) into part_rows, first_part, last_part",
    "  from private.crm_import_payload_chunks where batch_id = '" + batchId + "'::uuid;",
    "  if context_row.part_count <> " + partCount + " or part_rows <> context_row.part_count",
    "    or first_part <> 0 or last_part <> context_row.part_count - 1 then",
    "    raise exception 'Import staging chunk count or order is incomplete.';",
    "  end if;",
    "  if context_row.expected_payload_bytes <> " + payloadBytes + "",
    "    or context_row.expected_payload_md5 <> '" + payloadMd5 + "'",
    "    or context_row.expected_source_hash <> '" + sourceHash + "'",
    "    or context_row.expected_counts <> " + expectedCounts + " then",
    "    raise exception 'Import staging manifest does not match the prepared import.';",
    "  end if;",
    "  if exists (",
    "    select 1 from private.crm_import_payload_chunks as staged",
    "    where staged.batch_id = '" + batchId + "'::uuid",
    "      and (staged.part_count is distinct from context_row.part_count",
    "        or staged.expected_payload_bytes is distinct from context_row.expected_payload_bytes",
    "        or staged.expected_payload_md5 is distinct from context_row.expected_payload_md5",
    "        or staged.expected_source_hash is distinct from context_row.expected_source_hash",
    "        or staged.expected_counts is distinct from context_row.expected_counts)",
    "  ) then raise exception 'Import staging chunks contain inconsistent manifest values.'; end if;",
    "end;",
    "$preflight$;",
    "",
    "create temporary table _crm_payload_text on commit drop as",
    "select pg_catalog.string_agg(payload_chunk, '' order by part_index) as payload_text",
    "from private.crm_import_payload_chunks where batch_id = '" + batchId + "'::uuid;",
    "",
    "do $preflight$",
    "declare context_row record; payload_text_value text;",
    "begin",
    "  select * into context_row from _crm_import_chunk_meta;",
    "  select payload_text into payload_text_value from _crm_payload_text;",
    "  if pg_catalog.octet_length(payload_text_value) <> context_row.expected_payload_bytes",
    "    or pg_catalog.md5(payload_text_value) <> context_row.expected_payload_md5 then",
    "    raise exception 'Reconstructed import payload failed its byte length or checksum.';",
    "  end if;",
    "end;",
    "$preflight$;",
    "",
    "create temporary table _crm_payload on commit drop as",
    "select payload_text::jsonb as data from _crm_payload_text;",
    "",
    "do $preflight$",
    "declare payload jsonb; expected jsonb;",
    "begin",
    "  select data into payload from _crm_payload;",
    "  select expected_counts into expected from _crm_import_chunk_meta;",
    "  if pg_catalog.jsonb_typeof(payload) is distinct from 'object'",
    "    or payload ->> 'source' is distinct from 'notion-export'",
    "    or payload ->> 'version' is distinct from '1'",
    "    or pg_catalog.jsonb_typeof(payload -> 'manifest') is distinct from 'object' then",
    "    raise exception 'Import payload envelope or manifest is invalid.';",
    "  end if;",
    "  if pg_catalog.jsonb_typeof(payload -> 'companies') is distinct from 'array'",
    "    or pg_catalog.jsonb_typeof(payload -> 'contacts') is distinct from 'array'",
    "    or pg_catalog.jsonb_typeof(payload -> 'relationships') is distinct from 'array'",
    "    or pg_catalog.jsonb_typeof(payload -> 'source_documents') is distinct from 'array'",
    "    or pg_catalog.jsonb_typeof(payload -> 'unresolved_relationships') is distinct from 'array' then",
    "    raise exception 'Import payload arrays are incomplete.';",
    "  end if;",
    "  if pg_catalog.jsonb_array_length(payload -> 'companies') <> (expected ->> 'companies')::integer",
    "    or pg_catalog.jsonb_array_length(payload -> 'contacts') <> (expected ->> 'contacts')::integer",
    "    or pg_catalog.jsonb_array_length(payload -> 'relationships') <> (expected ->> 'relationships')::integer",
    "    or pg_catalog.jsonb_array_length(payload -> 'source_documents') <> (expected ->> 'source_documents')::integer",
    "    or pg_catalog.jsonb_array_length(payload -> 'unresolved_relationships') <> (expected ->> 'unresolved_relationships')::integer then",
    "    raise exception 'Import payload manifest counts do not match the prepared import.';",
    "  end if;",
    "end;",
    "$preflight$;",
    "",
    "create temporary table _crm_stage_companies (",
    "  source_id text primary key, notion_page_id text, name text not null, website text,",
    "  industry text, notes text, source_properties jsonb not null, source_markdown_properties jsonb not null,",
    "  source_body text not null, source_path text not null",
    ") on commit drop;",
    "insert into _crm_stage_companies",
    "select item.value ->> 'source_id', item.value ->> 'notion_page_id', item.value ->> 'name',",
    "  item.value ->> 'website', item.value ->> 'industry', item.value ->> 'notes',",
    "  item.value -> 'source_properties', coalesce(item.value -> 'source_markdown_properties', '{}'::jsonb),",
    "  item.value ->> 'source_body', item.value ->> 'source_path'",
    "from _crm_payload as payload",
    "cross join lateral pg_catalog.jsonb_array_elements(payload.data -> 'companies') as item(value);",
    "",
    "create temporary table _crm_stage_contacts (",
    "  source_id text primary key, notion_page_id text, name text not null, email text, emails text[] not null,",
    "  phone text, job_title text, notes text, source_properties jsonb not null,",
    "  source_markdown_properties jsonb not null, source_body text not null, source_path text not null",
    ") on commit drop;",
    "insert into _crm_stage_contacts",
    "select item.value ->> 'source_id', item.value ->> 'notion_page_id', item.value ->> 'name',",
    "  item.value ->> 'email', array(select email.value from pg_catalog.jsonb_array_elements_text(item.value -> 'emails') as email(value)),",
    "  item.value ->> 'phone', item.value ->> 'job_title', item.value ->> 'notes',",
    "  item.value -> 'source_properties', coalesce(item.value -> 'source_markdown_properties', '{}'::jsonb),",
    "  item.value ->> 'source_body', item.value ->> 'source_path'",
    "from _crm_payload as payload",
    "cross join lateral pg_catalog.jsonb_array_elements(payload.data -> 'contacts') as item(value);",
    "",
    "create temporary table _crm_stage_relationships (",
    "  contact_source_id text not null, company_source_id text not null, kind text not null,",
    "  source_evidence jsonb not null, primary key (contact_source_id, company_source_id, kind)",
    ") on commit drop;",
    "insert into _crm_stage_relationships",
    "select item.value ->> 'contact_source_id', item.value ->> 'company_source_id',",
    "  item.value ->> 'kind', item.value -> 'source_evidence'",
    "from _crm_payload as payload",
    "cross join lateral pg_catalog.jsonb_array_elements(payload.data -> 'relationships') as item(value);",
    "",
    "create temporary table _crm_stage_documents (",
    "  source_id text primary key, source_path text not null, notion_page_id text,",
    "  body text not null, properties jsonb not null, reason text not null",
    ") on commit drop;",
    "insert into _crm_stage_documents",
    "select item.value ->> 'source_id', item.value ->> 'path', item.value ->> 'notion_page_id',",
    "  item.value ->> 'body', item.value -> 'properties', item.value ->> 'reason'",
    "from _crm_payload as payload",
    "cross join lateral pg_catalog.jsonb_array_elements(payload.data -> 'source_documents') as item(value);",
    "",
    "do $preflight$",
    "begin",
    "  if exists (",
    "    select 1 from _crm_stage_relationships as relationship",
    "    left join _crm_stage_contacts as contact on contact.source_id = relationship.contact_source_id",
    "    left join _crm_stage_companies as company on company.source_id = relationship.company_source_id",
    "    where contact.source_id is null or company.source_id is null",
    "  ) then raise exception 'Import relationship references a missing staged record.'; end if;",
    "  if not exists (",
    "    select 1 from auth.users as account",
    "    join private.crm_allowed_emails as allowed",
    "      on allowed.email = pg_catalog.lower(coalesce(account.email, ''))",
    "    where account.id = '" + ownerId + "'::uuid",
    "  ) then raise exception 'Import owner is not present in the approved-email allowlist.'; end if;",
    "  if exists (select 1 from public.crm_import_batches where user_id = '" + ownerId + "'::uuid",
    "    and source_system = 'notion-export' and source_hash = '" + sourceHash + "'",
    "    and id <> '" + batchId + "'::uuid)",
    "    or exists (select 1 from public.crm_import_batches where id = '" + batchId + "'::uuid",
    "      and (user_id <> '" + ownerId + "'::uuid or source_system <> 'notion-export' or source_hash <> '" + sourceHash + "')) then",
    "    raise exception 'Import batch identity conflicts with an existing batch.';",
    "  end if;",
    "  if exists (select 1 from public.crm_import_batches where id = '" + batchId + "'::uuid",
    "    and (manifest <> (select data -> 'manifest' from _crm_payload)",
    "      or expected_counts <> " + expectedCounts + ")) then",
    "    raise exception 'Existing import batch metadata does not match the prepared import.';",
    "  end if;",
    "end;",
    "$preflight$;",
    "",
    "create temporary table _crm_added_companies (id uuid primary key) on commit drop;",
    "create temporary table _crm_added_contacts (id uuid primary key) on commit drop;",
    "create temporary table _crm_added_relationships (id uuid primary key) on commit drop;",
    "create temporary table _crm_added_documents (id uuid primary key) on commit drop;",
    "",
    "insert into public.crm_import_batches (id, user_id, source_system, source_hash, source_version, manifest, unresolved_relationships, expected_counts)",
    "select '" + batchId + "'::uuid, '" + ownerId + "'::uuid, 'notion-export', '" + sourceHash + "', 1,",
    "  payload.data -> 'manifest', payload.data -> 'unresolved_relationships', " + expectedCounts,
    "from _crm_payload as payload",
    "on conflict (user_id, source_system, source_hash) do nothing;",
    "",
    "create temporary table _crm_batch_context on commit drop as",
    "select id from public.crm_import_batches where user_id = '" + ownerId + "'::uuid",
    "  and source_system = 'notion-export' and source_hash = '" + sourceHash + "';",
    "do $preflight$ begin",
    "  if (select count(*) from _crm_batch_context) <> 1 or",
    "    (select id from _crm_batch_context) <> '" + batchId + "'::uuid then",
    "    raise exception 'Import batch identity is ambiguous.';",
    "  end if;",
    "end; $preflight$;",
    "",
    "with inserted as (",
    "  insert into public.companies (user_id, name, website, industry, notes, source_system, source_id, notion_page_id, source_properties, source_markdown_properties, source_body, source_path, source_batch_id)",
    "  select '" + ownerId + "'::uuid, staged.name, staged.website, staged.industry, staged.notes,",
    "    'notion-export', staged.source_id, staged.notion_page_id, staged.source_properties,",
    "    staged.source_markdown_properties, staged.source_body, staged.source_path, batch.id",
    "  from _crm_stage_companies as staged cross join _crm_batch_context as batch",
    "  on conflict (user_id, source_system, source_id) where source_system is not null and source_id is not null do nothing",
    "  returning id",
    ") insert into _crm_added_companies (id) select id from inserted;",
    "",
    "with inserted as (",
    "  insert into public.contacts (user_id, name, email, emails, phone, job_title, notes, source_system, source_id, notion_page_id, source_properties, source_markdown_properties, source_body, source_path, source_batch_id)",
    "  select '" + ownerId + "'::uuid, staged.name, staged.email, staged.emails, staged.phone, staged.job_title, staged.notes,",
    "    'notion-export', staged.source_id, staged.notion_page_id, staged.source_properties,",
    "    staged.source_markdown_properties, staged.source_body, staged.source_path, batch.id",
    "  from _crm_stage_contacts as staged cross join _crm_batch_context as batch",
    "  on conflict (user_id, source_system, source_id) where source_system is not null and source_id is not null do nothing",
    "  returning id",
    ") insert into _crm_added_contacts (id) select id from inserted;",
    "",
    "with inserted as (",
    "  insert into public.contact_companies (user_id, contact_id, company_id, kind, source_evidence, source_batch_id)",
    "  select '" + ownerId + "'::uuid, contact.id, company.id, staged.kind, staged.source_evidence, batch.id",
    "  from _crm_stage_relationships as staged",
    "  join public.contacts as contact on contact.user_id = '" + ownerId + "'::uuid",
    "    and contact.source_system = 'notion-export' and contact.source_id = staged.contact_source_id",
    "  join public.companies as company on company.user_id = '" + ownerId + "'::uuid",
    "    and company.source_system = 'notion-export' and company.source_id = staged.company_source_id",
    "  cross join _crm_batch_context as batch",
    "  on conflict (user_id, contact_id, company_id, kind) do nothing",
    "  returning id",
    ") insert into _crm_added_relationships (id) select id from inserted;",
    "",
    "with inserted as (",
    "  insert into public.crm_source_documents (user_id, import_batch_id, source_system, source_id, source_path, notion_page_id, body, properties, reason)",
    "  select '" + ownerId + "'::uuid, batch.id, 'notion-export', staged.source_id, staged.source_path,",
    "    staged.notion_page_id, staged.body, staged.properties, staged.reason",
    "  from _crm_stage_documents as staged cross join _crm_batch_context as batch",
    "  on conflict (user_id, source_system, source_id) do nothing",
    "  returning id",
    ") insert into _crm_added_documents (id) select id from inserted;",
    "",
    "do $assertions$",
    "declare actual_count bigint;",
    "begin",
    "  select count(*) into actual_count from public.companies as target",
    "  join _crm_stage_companies as staged on staged.source_id = target.source_id",
    "  where target.user_id = '" + ownerId + "'::uuid and target.source_system = 'notion-export';",
    "  if actual_count <> " + counts.companies + " then raise exception 'Company source ID assertion failed: expected %, found %', " + counts.companies + ", actual_count; end if;",
    "  select count(*) into actual_count from public.contacts as target",
    "  join _crm_stage_contacts as staged on staged.source_id = target.source_id",
    "  where target.user_id = '" + ownerId + "'::uuid and target.source_system = 'notion-export';",
    "  if actual_count <> " + counts.contacts + " then raise exception 'Contact source ID assertion failed: expected %, found %', " + counts.contacts + ", actual_count; end if;",
    "  select count(*) into actual_count from _crm_stage_relationships as staged",
    "  join public.contacts as contact on contact.user_id = '" + ownerId + "'::uuid and contact.source_system = 'notion-export' and contact.source_id = staged.contact_source_id",
    "  join public.companies as company on company.user_id = '" + ownerId + "'::uuid and company.source_system = 'notion-export' and company.source_id = staged.company_source_id",
    "  join public.contact_companies as link on link.user_id = '" + ownerId + "'::uuid and link.contact_id = contact.id and link.company_id = company.id and link.kind = staged.kind;",
    "  if actual_count <> " + counts.relationships + " then raise exception 'Relationship assertion failed: expected %, found %', " + counts.relationships + ", actual_count; end if;",
    "  select count(*) into actual_count from public.crm_source_documents as target",
    "  join _crm_stage_documents as staged on staged.source_id = target.source_id",
    "  where target.user_id = '" + ownerId + "'::uuid and target.source_system = 'notion-export';",
    "  if actual_count <> " + counts.source_documents + " then raise exception 'Source document assertion failed: expected %, found %', " + counts.source_documents + ", actual_count; end if;",
    "end;",
    "$assertions$;",
    "",
    "update public.crm_import_batches as batch",
    "set inserted_counts = jsonb_build_object(",
    "      'companies', (select count(*) from _crm_added_companies),",
    "      'contacts', (select count(*) from _crm_added_contacts),",
    "      'relationships', (select count(*) from _crm_added_relationships),",
    "      'source_documents', (select count(*) from _crm_added_documents)",
    "    ), completed_at = pg_catalog.clock_timestamp()",
    "from _crm_batch_context as context",
    "where batch.id = context.id and batch.user_id = '" + ownerId + "'::uuid and batch.completed_at is null;",
    "",
    "delete from private.crm_import_payload_chunks where batch_id = '" + batchId + "'::uuid;",
    "commit;",
    "",
  ];

  return lines.join("\n");
}

function renderRollbackSql(ownerId, batchId) {
  return [
    "begin;",
    "",
    "do $rollback$",
    "declare",
    "  owner_id uuid := '" + ownerId + "'::uuid;",
    "  batch_id uuid := '" + batchId + "'::uuid;",
    "  batch_completed_at timestamptz;",
    "begin",
    "  select completed_at into batch_completed_at from public.crm_import_batches",
    "  where id = batch_id and user_id = owner_id;",
    "  if not found or batch_completed_at is null then",
    "    raise exception 'Import batch is missing or incomplete; nothing was removed.';",
    "  end if;",
    "",
    "  if exists (select 1 from public.companies where user_id = owner_id",
    "    and source_batch_id = batch_id and updated_at > batch_completed_at)",
    "  or exists (select 1 from public.contacts where user_id = owner_id",
    "    and source_batch_id = batch_id and updated_at > batch_completed_at)",
    "  or exists (select 1 from public.contact_companies where user_id = owner_id",
    "    and source_batch_id = batch_id and updated_at > batch_completed_at)",
    "  or exists (select 1 from public.crm_source_documents where user_id = owner_id",
    "    and import_batch_id = batch_id and updated_at > batch_completed_at) then",
    "    raise exception 'Import batch has records edited after import; resolve conflicts before rollback.';",
    "  end if;",
    "",
    "  if exists (",
    "    select 1 from public.contact_companies as link",
    "    left join public.contacts as contact on contact.user_id = link.user_id and contact.id = link.contact_id",
    "    left join public.companies as company on company.user_id = link.user_id and company.id = link.company_id",
    "    where link.user_id = owner_id and link.source_batch_id is distinct from batch_id",
    "      and (contact.source_batch_id = batch_id or company.source_batch_id = batch_id)",
    "  ) then",
    "    raise exception 'Imported contacts or companies have later relationships; resolve conflicts before rollback.';",
    "  end if;",
    "",
    "  delete from public.contact_companies where user_id = owner_id and source_batch_id = batch_id;",
    "  delete from public.crm_source_documents where user_id = owner_id and import_batch_id = batch_id;",
    "  delete from public.contacts where user_id = owner_id and source_batch_id = batch_id;",
    "  delete from public.companies where user_id = owner_id and source_batch_id = batch_id;",
    "  delete from public.crm_import_batches where id = batch_id and user_id = owner_id;",
    "end;",
    "$rollback$;",
    "",
    "commit;",
    "",
  ].join("\n");
}

async function writePrivateFile(targetPath, contents) {
  const temporaryPath = targetPath + ".tmp-" + process.pid;
  const handle = await open(temporaryPath, "wx", 0o600);
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporaryPath, targetPath);
  await chmod(targetPath, 0o600);
}

async function writePreparedImportFiles(outputDirectory, data, ownerId, sourceHash, batchId, counts) {
  const payload = JSON.stringify(data);
  const payloadBytes = Buffer.byteLength(payload, "utf8");
  const payloadMd5 = createHash("md5").update(payload, "utf8").digest("hex");
  const chunks = splitUtf8Chunks(payload, STAGING_CHUNK_BYTES);
  if (chunks.length === 0) fail("The normalized import payload is empty.");

  const stagingDirectory = path.join(outputDirectory, "notion-crm-stage-" + batchId);
  await mkdir(stagingDirectory, { recursive: true, mode: 0o700 });
  await chmod(stagingDirectory, 0o700);

  const uploadFiles = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const ordinal = String(index + 1).padStart(4, "0");
    const filePath = path.join(stagingDirectory, "upload-" + ordinal + ".sql");
    const contents = renderPayloadChunkSql({
      batchId,
      index,
      chunks,
      payloadBytes,
      payloadMd5,
      sourceHash,
      counts,
    });
    const fileBytes = Buffer.byteLength(contents, "utf8");
    if (fileBytes >= 20_000) fail("Generated upload SQL exceeded the 20,000-byte safety limit.");
    await writePrivateFile(filePath, contents);
    uploadFiles.push({
      uploadOrder: index + 1,
      partIndex: index,
      path: filePath,
      bytes: fileBytes,
    });
  }

  const finalizationPath = path.join(outputDirectory, "notion-crm-finalize-" + batchId + ".sql");
  const finalizationSql = renderStagedFinalizeSql(
    ownerId,
    sourceHash,
    batchId,
    payloadBytes,
    payloadMd5,
    counts,
    chunks.length,
  );
  if (Buffer.byteLength(finalizationSql, "utf8") >= 25_000) {
    fail("Generated finalization SQL exceeded the 25,000-byte safety limit.");
  }
  await writePrivateFile(finalizationPath, finalizationSql);

  const rollbackPath = path.join(outputDirectory, "notion-crm-rollback-" + batchId + ".sql");
  await writePrivateFile(rollbackPath, renderRollbackSql(ownerId, batchId));

  const manifestPath = path.join(outputDirectory, "notion-crm-stage-manifest-" + batchId + ".json");
  const manifest = {
    formatVersion: 1,
    batchId,
    sourceHash,
    payloadBytes,
    payloadMd5,
    expectedCounts: counts,
    partCount: chunks.length,
    maxPayloadChunkBytes: STAGING_CHUNK_BYTES,
    uploadFiles,
    finalizationPath,
    rollbackPath,
  };
  await writePrivateFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  return {
    stagingDirectory,
    manifestPath,
    finalizationPath,
    rollbackPath,
    partCount: chunks.length,
    maxUploadSqlBytes: Math.max(...uploadFiles.map((file) => file.bytes)),
    finalizationBytes: Buffer.byteLength(finalizationSql, "utf8"),
  };
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--help" || value === "-h") options.help = true;
    else if (value === "--check" || value === "--write" || value === "--prepare") {
      if (options.mode) fail("Choose only one of --check, --write, or --prepare.");
      options.mode = value.slice(2);
    } else if (value === "--input" || value === "--owner" || value === "--out-dir") {
      const next = args[index + 1];
      if (!next || next.startsWith("--")) fail(value + " requires a value.");
      options[value.slice(2)] = next;
      index += 1;
    } else {
      fail("Unknown option: " + value);
    }
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/import-notion-crm.mjs --check --input <normalized-import.json> --owner <uuid>",
    "  node scripts/import-notion-crm.mjs --write --input <normalized-import.json> --owner <uuid> [--out-dir <private-directory>]",
    "  node scripts/import-notion-crm.mjs --prepare --input <normalized-import.json> --owner <uuid> [--out-dir <private-directory>]",
  ].join("\n");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage() + "\n");
    return;
  }
  if (!options.mode || !options.input || !options.owner) fail(usage());
  if (!UUID_PATTERN.test(options.owner)) fail("--owner must be a UUID.");
  const ownerId = options.owner.toLowerCase();

  const inputPath = path.resolve(options.input);
  const data = validateContract(JSON.parse(await readFile(inputPath, "utf8")));
  const sourceHash = createHash("sha256").update(JSON.stringify(canonical(data))).digest("hex");
  const batchId = uuidFromHash(
    createHash("sha256").update(ownerId + ":" + SOURCE_SYSTEM + ":" + sourceHash).digest("hex"),
  );
  const counts = {
    companies: data.companies.length,
    contacts: data.contacts.length,
    relationships: data.relationships.length,
    source_documents: data.source_documents.length,
    unresolved_relationships: data.unresolved_relationships.length,
  };

  if (options.mode === "check") {
    process.stdout.write(JSON.stringify({ valid: true, counts }) + "\n");
    return;
  }

  const outputDirectory = path.resolve(options["out-dir"] ?? path.dirname(inputPath));
  const relativeToRepository = path.relative(REPOSITORY_ROOT, outputDirectory);
  if (
    relativeToRepository === "" ||
    (relativeToRepository !== ".." && !relativeToRepository.startsWith(".." + path.sep))
  ) {
    fail("--out-dir must be outside the repository so private import data cannot enter Git.");
  }
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  await chmod(outputDirectory, 0o700);

  if (options.mode === "prepare") {
    const prepared = await writePreparedImportFiles(
      outputDirectory,
      data,
      ownerId,
      sourceHash,
      batchId,
      counts,
    );
    process.stdout.write(JSON.stringify({ generated: true, mode: "prepare", counts, ...prepared }) + "\n");
    return;
  }

  const importPath = path.join(outputDirectory, "notion-crm-import-" + sourceHash.slice(0, 12) + ".sql");
  const rollbackPath = path.join(outputDirectory, "notion-crm-rollback-" + batchId + ".sql");
  await writePrivateFile(importPath, renderImportSql(data, ownerId, sourceHash, batchId));
  await writePrivateFile(rollbackPath, renderRollbackSql(ownerId, batchId));
  process.stdout.write(JSON.stringify({ generated: true, mode: "write", counts, importPath, rollbackPath }) + "\n");
}

main().catch((error) => {
  process.stderr.write((error instanceof Error ? error.message : "Import preparation failed.") + "\n");
  process.exitCode = 1;
});
