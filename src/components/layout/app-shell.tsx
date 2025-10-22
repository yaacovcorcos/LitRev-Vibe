"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ReactNode, useCallback, useState } from "react";

import { Button } from "@/components/ui/button";

import { Header } from "./header";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleToggleMobileNav = useCallback(
    () => setMobileNavOpen((prev) => !prev),
    [],
  );
  const handleCloseMobileNav = useCallback(() => setMobileNavOpen(false), []);

  return (
    <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar variant="desktop" />
        <div className="flex flex-1 flex-col">
          <Header
            onToggleMobileNav={handleToggleMobileNav}
            isMobileNavOpen={mobileNavOpen}
          />
          <main className="flex-1 overflow-y-auto bg-muted/30 px-6 py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      <MobileNavOverlay onNavigate={handleCloseMobileNav} />
    </Dialog.Root>
  );
}

type MobileNavOverlayProps = {
  onNavigate: () => void;
};

function MobileNavOverlay({ onNavigate }: MobileNavOverlayProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm lg:hidden" />
      <Dialog.Content
        id="mobile-navigation"
        className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xs translate-x-0 bg-transparent focus:outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden"
      >
        <div className="relative flex h-full w-full">
          <Sidebar variant="mobile" onNavigate={onNavigate} className="h-full" />
          <Dialog.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
