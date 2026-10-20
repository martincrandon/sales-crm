import Contacts from "@/components/contacts/contacts";
import WorkspaceNavigation from "@/components/workspace/workspace-navigation";
import type { Contact, ContactCompanySummary } from "@/data/contacts";
import { requireApprovedSession } from "@/lib/auth";

export default async function ContactsPage() {
  const { supabase, user } = await requireApprovedSession();
  let contacts: Contact[] = [];
  let loadError = false;

  try {
    const [contactResult, relationshipResult, companyResult] = await Promise.all([
      supabase
        .from("contacts")
        .select("id, name, email, emails, phone, job_title, notes, source_system, source_properties, source_markdown_properties, source_body, created_at, updated_at")
        .order("name", { ascending: true }),
      supabase.from("contact_companies").select("contact_id, company_id, kind"),
      supabase.from("companies").select("id, name"),
    ]);

    if (contactResult.error || relationshipResult.error || companyResult.error) {
      loadError = true;
    } else {
      const companyById = new Map(
        (companyResult.data ?? []).map((company) => [company.id, company]),
      );
      const links = relationshipResult.data ?? [];
      contacts = (contactResult.data ?? []).map((contact) => ({
        ...contact,
        linked_companies: links.flatMap((link): ContactCompanySummary[] => {
          if (link.contact_id !== contact.id) return [];
          const company = companyById.get(link.company_id);
          return company
            ? [{
                id: company.id,
                name: company.name,
                kind: link.kind as "current" | "previous",
              }]
            : [];
        }),
      })) as Contact[];
    }
  } catch {
    loadError = true;
  }

  return (
    <main className="flex h-dvh max-w-full flex-col overflow-hidden lg:flex-row">
      <WorkspaceNavigation active="contacts" />
      <Contacts contacts={contacts} email={user.email} loadError={loadError} />
    </main>
  );
}
