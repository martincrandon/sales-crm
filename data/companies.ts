export type Company = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  source_system: string | null;
  source_properties: Record<string, unknown>;
  source_markdown_properties: Record<string, unknown>;
  source_body: string;
  linked_contacts: CompanyLinkedContact[];
  created_at: string;
  updated_at: string;
};

export type CompanyLinkedContact = {
  id: string;
  name: string;
  email: string | null;
  job_title: string | null;
  kind: "current" | "previous";
};

export type CompanyInput = {
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
};
