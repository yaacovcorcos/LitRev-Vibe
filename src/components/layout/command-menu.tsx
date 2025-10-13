"use client";

import { useEffect, useState } from "react";

import { workspaceNav } from "@/lib/navigation";

export function CommandMenu() {
  // Full command palette implementation will arrive in a later commit.
  const [_open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}
