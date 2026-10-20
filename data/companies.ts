export type Company = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyInput = {
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
};
