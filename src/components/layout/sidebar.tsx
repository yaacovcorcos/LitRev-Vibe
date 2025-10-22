"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { workspaceNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type SidebarProps = {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
  className?: string;
};

export function Sidebar({
  variant = "desktop",
  onNavigate,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const isMobile = variant === "mobile";

  return (
    <aside
      className={cn(
        "flex flex-col bg-background",
        isMobile
          ? "h-full w-full max-w-xs border-r shadow-xl"
          : "hidden w-64 border-r lg:flex",
        className,
      )}
      aria-label="Primary navigation"
    >
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
                    onClick={onNavigate}
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
