import type { ReactNode } from "react";

import type { LocatorStatusDisplay, LocatorStatusTone } from "@/lib/ledger/status";
import { cn } from "@/lib/utils";

type LocatorBannerProps = {
  display: LocatorStatusDisplay;
  tone?: LocatorStatusTone;
  children?: ReactNode;
};

function getContainerClasses(tone: LocatorStatusTone) {
  switch (tone) {
    case "warning":
      return "space-y-2 rounded-md border border-amber-300/70 bg-amber-100/60 p-3 text-xs text-amber-700";
    case "success":
      return "space-y-1 rounded-md border border-primary/40 bg-primary/10 p-3 text-xs text-primary-foreground/80";
    case "danger":
    default:
      return "space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive";
  }
}

function getTitleClasses(tone: LocatorStatusTone) {
  return cn("font-semibold uppercase tracking-wide", {
    "text-primary": tone === "success",
  });
}

function getBodyClasses(tone: LocatorStatusTone) {
  switch (tone) {
    case "warning":
      return "text-amber-700";
    case "success":
      return "text-primary-foreground/70";
    case "danger":
    default:
      return "text-destructive/80";
  }
}

export function LocatorBanner({ display, tone: toneOverride, children }: LocatorBannerProps) {
  const tone = toneOverride ?? display.tone;

  return (
    <div className={getContainerClasses(tone)}>
      <p className={getTitleClasses(tone)}>{display.inspectorTitle}</p>
      <p className={getBodyClasses(tone)}>{display.inspectorBody}</p>
      {children ? <div className="pt-1">{children}</div> : null}
    </div>
  );
}
