export type Contact = {
  id: string;
  name: string;
  email: string | null;
  emails: string[];
  phone: string | null;
  job_title: string | null;
  notes: string | null;
  source_system: string | null;
  source_properties: Record<string, unknown>;
  source_markdown_properties: Record<string, unknown>;
  source_body: string;
  linked_companies: ContactCompanySummary[];
  created_at: string;
  updated_at: string;
};

export type ContactCompanySummary = {
  id: string;
  name: string;
  kind: "current" | "previous";
};

export type ContactInput = {
  name: string;
  email: string | null;
  emails: string[];
  phone: string | null;
  job_title: string | null;
  notes: string | null;
};
