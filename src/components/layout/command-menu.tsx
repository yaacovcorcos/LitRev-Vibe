"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { NavItem, NavSection } from "@/lib/navigation";
import { workspaceNav } from "@/lib/navigation";

type PaletteItem = {
  id: string;
  title: string;
  href: string;
  section: string;
  icon: NavItem["icon"];
  description?: string;
  disabled?: boolean;
  isActive?: boolean;
};

export function CommandMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeProjectId = useMemo(() => extractProjectId(pathname), [pathname]);

  const navItems = useMemo(
    () => flattenNav(workspaceNav, activeProjectId, pathname),
    [activeProjectId, pathname],
  );

  const groupedItems = useMemo(() => groupBySection(navItems), [navItems]);

  const handleOpen = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        handleOpen();
      }
    };

    const onExternalOpen = () => handleOpen();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("litrev:command-open", onExternalOpen);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("litrev:command-open", onExternalOpen);
    };
  }, [handleOpen]);

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      if (item.href !== pathname) {
        router.push(item.href);
      }
    },
    [pathname, router],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Search pages and actions…" autoFocus />
        <CommandList>
          <CommandEmpty>No matches found.</CommandEmpty>
          {groupedItems.map((group, index) => (
            <Fragment key={group.section}>
              <CommandGroup heading={group.section}>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.section}`}
                      onSelect={() => handleSelect(item)}
                      disabled={item.disabled}
                    >
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm text-foreground">
                          {item.title}
                        </span>
                        {item.description || item.disabled ? (
                          <span className="text-xs text-muted-foreground">
                            {item.description ??
                              "Open a project to access this workspace."}
                          </span>
                        ) : null}
                      </div>
                      {item.isActive ? (
                        <span className="text-xs uppercase tracking-wide text-primary">
                          Current
                        </span>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {index < groupedItems.length - 1 ? <CommandSeparator /> : null}
            </Fragment>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

function flattenNav(
  sections: NavSection[],
  activeProjectId: string | null,
  pathname: string | null,
): PaletteItem[] {
  return sections.flatMap((section) =>
    section.items.map((item) => {
      const requiresProject = item.href.includes("/:id");
      const resolvedHref = requiresProject
        ? resolveProjectHref(item.href, activeProjectId)
        : item.href;

      const href = resolvedHref ?? item.href;

      return {
        id: `${section.label}:${item.href}`,
        title: item.title,
        href,
        section: section.label,
        icon: item.icon,
        description: item.description,
        disabled: requiresProject && !resolvedHref,
        isActive: Boolean(pathname && resolvedHref && isActivePath(pathname, href)),
      };
    }),
  );
}

function groupBySection(items: PaletteItem[]) {
  const groups = new Map<string, PaletteItem[]>();

  for (const item of items) {
    if (!groups.has(item.section)) {
      groups.set(item.section, []);
    }
    groups.get(item.section)!.push(item);
  }

  return Array.from(groups.entries()).map(([section, sectionItems]) => ({
    section,
    items: sectionItems,
  }));
}

function resolveProjectHref(href: string, projectId: string | null) {
  if (!projectId) {
    return null;
  }

  return href.replace("/:id", `/${projectId}`);
}

function extractProjectId(pathname: string | null) {
  if (!pathname) {
    return null;
  }

  const match = pathname.match(/\/project\/([^/]+)/);
  return match ? match[1] : null;
}

function isActivePath(pathname: string, target: string) {
  if (target === "/") {
    return pathname === "/";
  }

  return pathname === target || pathname.startsWith(`${target}/`);
}
