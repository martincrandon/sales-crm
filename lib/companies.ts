import type { Company, CompanyInput } from "@/data/companies";

export type CompanyValidation =
  | { data: CompanyInput; error?: never }
  | { data?: never; error: string };

export function validateCompanyInput(input: {
  name: unknown;
  website: unknown;
  industry: unknown;
  notes: unknown;
}): CompanyValidation {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const website =
    typeof input.website === "string" ? input.website.trim() : "";
  const industry =
    typeof input.industry === "string" ? input.industry.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (!name) return { error: "Enter a company name." };
  if (website.length > 2048) {
    return { error: "Website addresses can be up to 2,048 characters." };
  }

  let normalizedWebsite: string | null = null;
  if (website) {
    try {
      const parsed = new URL(website);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        !parsed.hostname ||
        parsed.username ||
        parsed.password
      ) {
        return { error: "Enter a valid http or https website address." };
      }
      normalizedWebsite = parsed.toString();
    } catch {
      return { error: "Enter a valid http or https website address." };
    }
  }

  return {
    data: {
      name,
      website: normalizedWebsite,
      industry: industry || null,
      notes: notes || null,
    },
  };
}

export function companiesCsvRows(companies: Company[]) {
  return [
    ["Company", "Website", "Industry", "Notes", "Created", "Updated"],
    ...companies.map((company) => [
      company.name,
      company.website ?? "",
      company.industry ?? "",
      company.notes ?? "",
      company.created_at,
      company.updated_at,
    ]),
  ];
}

export function formatCompanyDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
