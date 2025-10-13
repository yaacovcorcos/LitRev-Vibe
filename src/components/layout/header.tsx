"use client";

import { useState } from "react";
import { Bell, Command, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CommandMenu } from "./command-menu";

export function Header() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <header className="flex h-16 items-center border-b bg-background px-4 lg:px-6">
      <div className="flex flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsMobileNavOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">LitRev-Vibe</span>
      </div>
      <div className="flex items-center gap-2">
        <CommandTrigger />
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
      <CommandMenu />
    </header>
  );
}

function CommandTrigger() {
  return (
    <Button
      variant="outline"
      className={cn(
        "hidden items-center justify-between gap-2 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground focus:ring-1 lg:flex"
      )}
      aria-label="Open command palette"
    >
      <span>Search or jump to…</span>
      <kbd className="flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        <Command className="h-3 w-3" />
        K
      </kbd>
    </Button>
  );
}
