import Button from "@/components/_ui/button";
import SourceRecordDetails from "@/components/_common/source-record-details";
import WorkspaceNavigation from "@/components/workspace/workspace-navigation";
import { signOut } from "@/app/actions/auth";
import { requireApprovedSession } from "@/lib/auth";

type SourceDocument = {
  id: string;
  source_path: string;
  body: string;
  properties: Record<string, unknown>;
  reason: string;
  source_system: string;
};

function documentLabel(sourcePath: string) {
  return sourcePath.split(/[\\/]/).filter(Boolean).at(-1) || "Untitled source document";
}

export default async function SourceArchivePage() {
  const { supabase, user } = await requireApprovedSession();
  let documents: SourceDocument[] = [];
  let loadError = false;

  try {
    const result = await supabase
      .from("crm_source_documents")
      .select("id, source_system, source_path, body, properties, reason")
      .order("source_path", { ascending: true });

    if (result.error) loadError = true;
    else documents = (result.data ?? []) as SourceDocument[];
  } catch {
    loadError = true;
  }

  return (
    <main className="flex h-dvh max-w-full flex-col overflow-hidden lg:flex-row">
      <WorkspaceNavigation active="archive" />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="text-balance">Source archive</h1>
            <p className="caption-style text-subtle mt-1" role="status">
              {documents.length} standalone {documents.length === 1 ? "document" : "documents"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="caption-style text-subtle hidden max-w-48 truncate sm:inline">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" href="/forgot-password">
              Password
            </Button>
            <form action={signOut}>
              <Button variant="secondary" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          {loadError ? (
            <div className="flex min-h-0 items-center justify-center p-6">
              <div className="border-line-strong bg-card w-full max-w-md rounded-2xl border p-6 text-center shadow-overlay">
                <h2 className="text-balance">The source archive isn’t available</h2>
                <p className="p-style text-soft mt-3 text-pretty">
                  We couldn’t load the original source documents. Please try again in a moment.
                </p>
                <Button variant="secondary" size="md" className="mt-5 h-10" href="/archive">
                  Retry
                </Button>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex min-h-0 items-center justify-center p-6">
              <div className="border-line-strong bg-card w-full max-w-lg rounded-2xl border p-8 text-center shadow-overlay">
                <h2 className="text-balance">No standalone documents</h2>
                <p className="p-style text-soft mt-3 text-pretty">
                  Source pages that could not be safely linked to a contact or company will appear here for review.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {documents.map((document) => (
                <li key={document.id} className="px-4 py-5 sm:px-6">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="min-w-0">
                        <span className="lead-style block break-words">{documentLabel(document.source_path)}</span>
                        <span className="caption-style text-subtle mt-1 block break-words">{document.reason}</span>
                        <span className="caption-style text-subtle mt-1 block break-all">{document.source_path}</span>
                      </span>
                      <span className="caption-style text-soft shrink-0 group-open:hidden">Review</span>
                      <span className="caption-style text-soft hidden shrink-0 group-open:inline">Hide</span>
                    </summary>
                    <div className="mt-4 rounded-xl border border-border bg-card">
                      <SourceRecordDetails
                        properties={document.properties}
                        body={document.body}
                        sourceSystem={document.source_system}
                      />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
