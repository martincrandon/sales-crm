# Sales CRM

A private, single-user CRM built with Next.js 16, React 19, and Supabase. It manages companies, contacts, and current or previous contact-company relationships. Imported Notion properties and original page text remain available in record details, while unassigned source pages are kept in the private source archive.

## Local development

```bash
npm ci
npm run dev
```

Set the environment variables in `.env.local`. Copy `.env.example` only if `.env.local` does not already exist. Never commit local environment files.

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key; never use a service-role key in the app |
| `NEXT_PUBLIC_SITE_URL` | The canonical app origin used for email redirects |
| `CRM_ALLOWED_EMAILS` | Comma-separated, server-only approved email addresses |

The app verifies the Supabase user on the server and requires a confirmed email present in `CRM_ALLOWED_EMAILS`. A missing or empty allowlist denies access. There is no public signup page or signup action.

## Supabase setup

1. Apply [`supabase/migrations/20261020180719_create_private_crm_companies.sql`](supabase/migrations/20261020180719_create_private_crm_companies.sql) to the project. This filename matches the already-applied initial migration recorded by Supabase; do not reapply it to an existing project.
2. Review and apply [`supabase/migrations/20261020201719_add_crm_contacts_and_notion_import.sql`](supabase/migrations/20261020201719_add_crm_contacts_and_notion_import.sql). It adds owner-scoped contacts, typed current/previous links, import provenance, and a private archive for source pages. It also removes company-name uniqueness so separate imported records with the same name can coexist.
3. Review and apply [`supabase/migrations/20261020201725_preserve_notion_markdown_and_stage_import_payload.sql`](supabase/migrations/20261020201725_preserve_notion_markdown_and_stage_import_payload.sql). It stores Markdown-export properties separately and creates a private import staging table with no application-role grants.
4. Keep email/password sign-in enabled. Disable public signups and anonymous sign-ins. Set the Supabase Site URL to the app origin and allow the app’s `/auth/callback` and `/auth/confirm` paths.
5. Add the one approved address to the private allowlist using the SQL Editor. Replace the example value with the address from the server environment; do not put an owner address in this repository:

   ```sql
   insert into private.crm_allowed_emails (email)
   values (lower(btrim('replace-with-approved-email@yourdomain.com')))
   on conflict (email) do nothing;
   ```

   The table has no authenticated write policy. Make allowlist changes with an administrative database role.
6. Dashboard invitations work with Supabase’s default email template; the app does not require custom SMTP to accept a default invitation. Supabase’s default mail service is restricted to addresses in the project organization and is rate-limited. The app consumes the default invite link’s access-token fragment, establishes the SSR cookie session, verifies the user and approved email on the server, and opens `/update-password`. It also accepts default password-recovery links that return an implicit-flow fragment. Password-reset requests made by the app continue to use the PKCE callback.

   If you later choose to customize the Invite User template, this token-hash link is also supported:

   ```html
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite&amp;next=/update-password">Accept invitation and set a password</a></p>
   ```

   The confirmation route accepts only `type=invite`, verifies the token, confirms the server-side approved email, and sends the user to `/update-password`. Redirect destinations are allowlisted in the app. Configure custom SMTP for branded templates or delivery to recipients outside the project organization; see [Supabase’s SMTP limits](https://supabase.com/docs/guides/auth/auth-smtp).
7. Confirm the `public` schema is exposed to the Supabase Data API if the project has changed its default API schema settings. The migrations grant `authenticated` only the owner-scoped columns/actions the app needs. The `private` schema is not an API schema, and the import payload staging table has no grants or RLS policies for application roles.

Supabase’s default templates are compatible with the app’s invite and password-reset flows. Custom SMTP is not required to consume those links, but Supabase’s default mail restrictions apply to delivery.

## Vercel setup

Set the four variables from `.env.example` in the Vercel Development and Production environments. Keep `CRM_ALLOWED_EMAILS` server-only. Set `NEXT_PUBLIC_SITE_URL` separately for each environment to its canonical origin. Do not set a service-role key.

## Data and access model

- Company records are owned by the authenticated Supabase user through `user_id`, which references `auth.users(id)` and defaults to `auth.uid()`.
- RLS requires both the current owner ID and an email in `private.crm_allowed_emails` for reads and writes. The `UPDATE` policy has both `USING` and `WITH CHECK` clauses.
- Authenticated users have no `INSERT` or `UPDATE` privilege on `user_id`; server actions accept only company fields and rely on the database default.
- The initial database is empty. A missing allowlist seed causes RLS to return no company rows and reject writes.
- CSV export includes only the current filtered company list and protects formula-like cell values.
- Contacts and companies are linked through `contact_companies`; composite owner-aware foreign keys prevent cross-user links.
- Authenticated users can read source properties and original page bodies but cannot change source metadata or import provenance through the app.
- `/archive` shows source pages that were not assigned to a contact or company. It renders Markdown as plain text and does not interpret embedded HTML.

## Preparing a Notion import

The importer accepts the normalized JSON contract (`version: 1`, `source: "notion-export"`) and validates identifiers, both source-property maps, bodies, database field constraints, and relationship targets. Prepare the large import as a sequence of small, private SQL files:

```bash
node scripts/import-notion-crm.mjs --check \
  --input /private/path/normalized-import.json --owner "$OWNER_UUID"
node scripts/import-notion-crm.mjs --prepare \
  --input /private/path/normalized-import.json --owner "$OWNER_UUID" \
  --out-dir /private/path/import-artifacts
```

`--prepare` writes a private manifest listing every upload file in order, its byte size, and the separate finalization and rollback SQL paths. Each upload file contains one UTF-8 payload chunk encoded as hex, is below 20,000 bytes, and uses an idempotent insert that rejects a different value for an already-staged part. Run all upload files in manifest order through an administrative SQL session. Then run the finalization SQL once. It checks the complete part sequence, reconstructed UTF-8 byte length and checksum, expected record counts, normalized payload envelope and manifest, approved owner, and relationship targets before inserting CRM records. It reconstructs JSON as data; it does not execute uploaded payload text as SQL. The transaction skips existing `(user_id, source_system, source_id)` records without overwriting edits and deletes staging chunks only when the full import commits. A failed finalization rolls back its changes and leaves staged chunks available for retry.

Keep the normalized JSON, stage SQL, stage manifest, finalization SQL, and batch-scoped rollback artifact outside the repository in a directory restricted to the owner. The SQL files contain sensitive source content, even though upload chunks are hex encoded. The application uses no service-role key or privileged database function.

## Backups

Review the Supabase Dashboard’s Database → Backups page and confirm the project’s backup coverage and retention. Store exports away from the app repository. For an additional logical backup, provide the database connection string through a secure shell environment variable and run:

```bash
npx supabase db dump --db-url "$SUPABASE_DB_URL" --file sales-crm-backup.sql
```

Treat the dump as sensitive CRM data: encrypt it, restrict access, and keep it out of Git. Verify restore steps before relying on a backup. Supabase database backups do not include Storage objects; this initial CRM does not upload files.

## Commands

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start local development |
| `npm run build` | Create a production build |
| `npm run start` | Serve a production build |
| `npm run lint` | Run ESLint |
