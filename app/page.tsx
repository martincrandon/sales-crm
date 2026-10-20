import Button from "@/components/_ui/button";
import Companies from "@/components/companies/companies";
import type { Company } from "@/data/companies";
import { requireApprovedSession } from "@/lib/auth";
import Logo from "@/public/assets/images/_common/logo.svg";
import BuildingIcon from "@/public/assets/images/companies/sidebar/building.svg";

export default async function Home() {
  const { supabase, user } = await requireApprovedSession();
  let companies: Company[] = [];
  let loadError = false;

  try {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, website, industry, notes, created_at, updated_at")
      .order("name", { ascending: true });

    if (error) {
      loadError = true;
    } else {
      companies = (data ?? []) as Company[];
    }
  } catch {
    loadError = true;
  }

  return (
    <main className="flex h-dvh max-w-full overflow-hidden">
      <aside className="border-sidebar-border bg-sidebar hidden w-[254px] shrink-0 border-r lg:flex lg:flex-col">
        <div className="border-sidebar-border bg-sidebar-accent flex shrink-0 items-center gap-2 border-b p-3">
          <Logo aria-hidden className="size-8 shrink-0 overflow-visible" />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="lead-style block truncate font-medium tracking-[-0.01em]">
              Sales CRM
            </span>
            <span className="caption-style text-subtle block truncate">
              Private workspace
            </span>
          </div>
        </div>

        <nav aria-label="Primary" className="flex-1 p-3">
          <Button
            variant="nav"
            size="md"
            href="/"
            data-active="true"
            aria-current="page"
            className="h-9"
          >
            <BuildingIcon aria-hidden className="text-icon size-3.5 shrink-0" />
            Companies
          </Button>
        </nav>

        <div className="border-sidebar-border bg-sidebar-accent border-t p-4">
          <p className="caption-style text-subtle">Single-user workspace</p>
        </div>
      </aside>

      <Companies
        companies={companies}
        email={user.email}
        loadError={loadError}
      />
    </main>
  );
}
