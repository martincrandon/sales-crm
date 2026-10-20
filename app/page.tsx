import Companies from "@/components/companies/companies";
import type { Company } from "@/data/companies";
import type { CompanyLinkedContact } from "@/data/companies";
import WorkspaceNavigation from "@/components/workspace/workspace-navigation";
import { requireApprovedSession } from "@/lib/auth";

export default async function Home() {
  const { supabase, user } = await requireApprovedSession();
  let companies: Company[] = [];
  let loadError = false;

  try {
    const [companyResult, contactResult, relationshipResult] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, website, industry, notes, source_system, source_properties, source_markdown_properties, source_body, created_at, updated_at")
        .order("name", { ascending: true }),
      supabase.from("contacts").select("id, name, email, job_title"),
      supabase.from("contact_companies").select("contact_id, company_id, kind"),
    ]);

    if (companyResult.error || contactResult.error || relationshipResult.error) {
      loadError = true;
    } else {
      const contactById = new Map(
        (contactResult.data ?? []).map((contact) => [contact.id, contact]),
      );
      const links = relationshipResult.data ?? [];
      companies = (companyResult.data ?? []).map((company) => ({
        ...company,
        linked_contacts: links.flatMap((link): CompanyLinkedContact[] => {
          if (link.company_id !== company.id) return [];
          const contact = contactById.get(link.contact_id);
          return contact
            ? [{
                id: contact.id,
                name: contact.name,
                email: contact.email,
                job_title: contact.job_title,
                kind: link.kind as "current" | "previous",
              }]
            : [];
        }),
      })) as Company[];
    }
  } catch {
    loadError = true;
  }

  return (
    <main className="flex h-dvh max-w-full flex-col overflow-hidden lg:flex-row">
      <WorkspaceNavigation active="companies" />
      <Companies
        companies={companies}
        email={user.email}
        loadError={loadError}
      />
    </main>
  );
}
