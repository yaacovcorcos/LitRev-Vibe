"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { workspaceNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r bg-background lg:flex">
      <div className="flex h-16 items-center border-b px-6">
        <div className="text-base font-semibold text-foreground">LitRev-Vibe</div>
      </div>
      <nav className="flex-1 space-y-6 px-3 py-6">
        {workspaceNav.map((section) => (
          <div key={section.label} className="space-y-3">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = matchPath(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Button
                    asChild
                    key={item.href}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 px-3 text-sm font-medium",
                      isActive && "text-foreground"
                    )}
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t px-6 py-4">
        <div className="text-xs text-muted-foreground">Workspace status</div>
        <div className="mt-1 text-sm text-foreground">Parent Release · Single-user</div>
      </div>
    </aside>
  );
}

function matchPath(pathname: string, href: string) {
  if (href.includes('/:id')) {
    const base = href.split('/:id')[0];
    return pathname.startsWith(base);
  }

  return pathname === href;
}
