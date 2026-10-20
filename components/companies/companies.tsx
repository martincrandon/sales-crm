"use client";

import { useMemo, useState } from "react";
import Button from "@/components/_ui/button";
import { Input } from "@/components/_ui/input";
import type { Company } from "@/data/companies";
import { companiesCsvRows, formatCompanyDate } from "@/lib/companies";
import { downloadCsv } from "@/lib/csv";
import { signOut } from "@/app/actions/auth";
import CompanyEditorDialog from "./company-editor-dialog";
import CompanyRecordDialog from "./company-record-dialog";
import BuildingIcon from "@/public/assets/images/companies/sidebar/building.svg";
import ShareIcon from "@/public/assets/images/companies/toolbar/share.svg";
import PlusIcon from "@/public/assets/images/_common/plus.svg";

type CompaniesProps = {
  companies: Company[];
  email: string;
  loadError?: boolean;
};

export default function Companies({
  companies,
  email,
  loadError = false,
}: CompaniesProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "updated">("name");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const filteredCompanies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return companies
      .filter((company) =>
        [company.name, company.website, company.industry, company.notes].some(
          (value) => value !== null && value.toLowerCase().includes(needle),
        ),
      )
      .sort((left, right) =>
        sortBy === "name"
          ? left.name.localeCompare(right.name)
          : right.updated_at.localeCompare(left.updated_at),
      );
  }, [companies, query, sortBy]);

  const editingCompany =
    companies.find((company) => company.id === editingId) ?? null;
  const detailsCompany =
    companies.find((company) => company.id === detailsId) ?? null;

  function openNewCompany() {
    setEditingId(null);
    setEditorOpen(true);
  }

  function openEditCompany(company: Company) {
    setDetailsId(null);
    setEditingId(company.id);
    setEditorOpen(true);
  }

  function exportCsv() {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`companies-${date}.csv`, companiesCsvRows(filteredCompanies));
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-balance">Companies</h1>
          <p className="caption-style text-subtle mt-1">
            {companies.length} {companies.length === 1 ? "company" : "companies"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="caption-style text-subtle hidden max-w-48 truncate sm:inline">
            {email}
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

      {loadError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="border-line-strong bg-card w-full max-w-md rounded-2xl border p-6 text-center shadow-overlay">
            <h2 className="text-balance">Companies aren’t available yet</h2>
            <p className="p-style text-soft mt-3 text-pretty">
              We couldn’t load your companies right now. Please try again in a
              moment.
            </p>
            <Button
              variant="secondary"
              size="md"
              className="mt-5 h-10"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="search"
                aria-label="Search companies"
                placeholder="Search companies"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 sm:w-64"
              />
              <label className="caption-style text-subtle flex items-center gap-2">
                Sort
                <select
                  aria-label="Sort companies"
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as "name" | "updated")
                  }
                  className="border-line-strong bg-secondary text-foreground h-10 rounded-lg border px-3 text-[13px] outline-none focus-visible:border-ring"
                >
                  <option value="name">Name</option>
                  <option value="updated">Recently updated</option>
                </select>
              </label>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="md"
                className="h-10"
                onClick={exportCsv}
                disabled={filteredCompanies.length === 0}
              >
                <ShareIcon aria-hidden className="size-3.5" />
                Export CSV
              </Button>
              <Button
                variant="primary"
                size="md"
                className="h-10"
                onClick={openNewCompany}
              >
                <PlusIcon aria-hidden className="size-3.5" />
                New company
              </Button>
            </div>
          </div>

          {companies.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <div className="border-line-strong bg-card w-full max-w-lg rounded-2xl border p-8 text-center shadow-overlay">
                <span className="bg-secondary text-soft mx-auto flex size-12 items-center justify-center rounded-xl">
                  <BuildingIcon aria-hidden className="size-5" />
                </span>
                <h2 className="mt-5 text-balance">No companies yet</h2>
                <p className="p-style text-soft mt-3 text-pretty">
                  Add a company to start building your private CRM. Your company
                  list starts empty.
                </p>
                <p className="caption-style text-subtle mt-3 text-pretty">
                  If you expected to see records, ask an administrator to confirm
                  the database access setup.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="mt-5 h-10"
                  onClick={openNewCompany}
                >
                  <PlusIcon aria-hidden className="size-3.5" />
                  Add first company
                </Button>
              </div>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="border-border text-soft flex min-h-0 flex-1 items-center justify-center border-t px-6 text-center">
              <p>No companies match that search.</p>
            </div>
          ) : (
            <div className="border-border min-h-0 flex-1 overflow-auto border-t">
              <div className="hidden min-w-[720px] md:block">
                <table className="w-full border-collapse text-left text-[14px]">
                  <thead className="caption-style text-subtle sticky top-0 z-10 bg-background">
                    <tr className="border-border border-b">
                      <th scope="col" className="h-11 px-4 font-normal sm:px-6">
                        Company
                      </th>
                      <th scope="col" className="h-11 px-4 font-normal">
                        Website
                      </th>
                      <th scope="col" className="h-11 px-4 font-normal">
                        Industry
                      </th>
                      <th scope="col" className="h-11 px-4 font-normal">
                        Updated
                      </th>
                      <th scope="col" className="h-11 px-4 font-normal">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company) => (
                      <tr
                        key={company.id}
                        className="border-border hover:bg-card/60 border-b transition-colors duration-150"
                      >
                        <td className="h-14 px-4 sm:px-6">
                          <Button
                            variant="ghost"
                            size="none"
                            className="max-w-full truncate text-left font-medium"
                            onClick={() => setDetailsId(company.id)}
                          >
                            {company.name}
                          </Button>
                        </td>
                        <td className="text-soft h-14 max-w-64 truncate px-4">
                          {company.website ? (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-foreground underline decoration-white/20 underline-offset-4"
                            >
                              {company.website}
                            </a>
                          ) : (
                            <span className="text-subtle">—</span>
                          )}
                        </td>
                        <td className="text-soft h-14 px-4">
                          {company.industry || (
                            <span className="text-subtle">—</span>
                          )}
                        </td>
                        <td className="text-soft tabular-nums h-14 whitespace-nowrap px-4">
                          {formatCompanyDate(company.updated_at)}
                        </td>
                        <td className="h-14 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-9"
                            onClick={() => openEditCompany(company)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-border divide-y md:hidden">
                {filteredCompanies.map((company) => (
                  <li key={company.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Button
                          variant="ghost"
                          size="none"
                          className="max-w-full truncate text-left font-medium"
                          onClick={() => setDetailsId(company.id)}
                        >
                          {company.name}
                        </Button>
                        <p className="caption-style text-soft mt-1 truncate">
                          {company.industry || "No industry set"}
                        </p>
                        {company.website && (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noreferrer"
                            className="caption-style text-subtle mt-2 block truncate underline decoration-white/20 underline-offset-4"
                          >
                            {company.website}
                          </a>
                        )}
                        <p className="caption-style text-subtle tabular-nums mt-2">
                          Updated {formatCompanyDate(company.updated_at)}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-9"
                        onClick={() => openEditCompany(company)}
                      >
                        Edit
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {editorOpen && (
        <CompanyEditorDialog
          key={editingId ?? "new-company"}
          company={editingCompany}
          open={editorOpen}
          onOpenChange={setEditorOpen}
        />
      )}
      {detailsCompany && (
        <CompanyRecordDialog
          company={detailsCompany}
          open
          onOpenChange={(open) => {
            if (!open) setDetailsId(null);
          }}
          onEdit={openEditCompany}
        />
      )}
    </section>
  );
}
