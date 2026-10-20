import Button from "@/components/_ui/button";
import Logo from "@/public/assets/images/_common/logo.svg";
import BuildingIcon from "@/public/assets/images/companies/sidebar/building.svg";
import UsersIcon from "@/public/assets/images/companies/sidebar/users.svg";
import ArchiveIcon from "@/public/assets/images/companies/sidebar/book-closed.svg";

type WorkspaceNavigationProps = {
  active: "companies" | "contacts" | "archive";
};

export default function WorkspaceNavigation({ active }: WorkspaceNavigationProps) {
  return (
    <>
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
            data-active={active === "companies"}
            aria-current={active === "companies" ? "page" : undefined}
            className="h-9"
          >
            <BuildingIcon aria-hidden className="text-icon size-3.5 shrink-0" />
            Companies
          </Button>
          <Button
            variant="nav"
            size="md"
            href="/contacts"
            data-active={active === "contacts"}
            aria-current={active === "contacts" ? "page" : undefined}
            className="mt-1 h-9"
          >
            <UsersIcon aria-hidden className="text-icon size-3.5 shrink-0" />
            Contacts
          </Button>
          <Button
            variant="nav"
            size="md"
            href="/archive"
            data-active={active === "archive"}
            aria-current={active === "archive" ? "page" : undefined}
            className="mt-1 h-9"
          >
            <ArchiveIcon aria-hidden className="text-icon size-3.5 shrink-0" />
            Source archive
          </Button>
        </nav>

        <div className="border-sidebar-border bg-sidebar-accent border-t p-4">
          <p className="caption-style text-subtle">Single-user workspace</p>
        </div>
      </aside>

      <nav
        aria-label="Primary"
        className="border-sidebar-border bg-sidebar flex shrink-0 gap-1 border-b p-2 lg:hidden"
      >
        <Button
          variant="nav"
          size="md"
          href="/"
          data-active={active === "companies"}
          aria-current={active === "companies" ? "page" : undefined}
          className="h-10 flex-1 justify-center"
        >
          <BuildingIcon aria-hidden className="text-icon size-3.5 shrink-0" />
          Companies
        </Button>
        <Button
          variant="nav"
          size="md"
          href="/contacts"
          data-active={active === "contacts"}
          aria-current={active === "contacts" ? "page" : undefined}
          className="h-10 flex-1 justify-center"
        >
          <UsersIcon aria-hidden className="text-icon size-3.5 shrink-0" />
          Contacts
        </Button>
        <Button
          variant="nav"
          size="md"
          href="/archive"
          data-active={active === "archive"}
          aria-current={active === "archive" ? "page" : undefined}
          className="h-10 flex-1 justify-center"
        >
          <ArchiveIcon aria-hidden className="text-icon size-3.5 shrink-0" />
          Archive
        </Button>
      </nav>
    </>
  );
}
