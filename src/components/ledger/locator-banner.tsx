import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { LocatorStatusDisplay, LocatorStatusTone } from "@/lib/ledger/status";
import { cn } from "@/lib/utils";

type LocatorBannerProps = {
  display: LocatorStatusDisplay;
  tone: LocatorStatusTone;
  showVerify?: boolean;
  onVerify?: () => void;
  verifyLabel?: string;
  className?: string;
  actionSlot?: ReactNode;
};

const INSPECTOR_CLASS_MAP: Record<LocatorStatusTone, { container: string; title: string; body: string }> = {
  danger: {
    container: "space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive",
    title: "font-semibold uppercase tracking-wide",
    body: "text-destructive/80",
  },
  warning: {
    container: "space-y-2 rounded-md border border-amber-300/70 bg-amber-100/60 p-3 text-xs text-amber-700",
    title: "font-semibold uppercase tracking-wide",
    body: "text-amber-700",
  },
  success: {
    container: "space-y-1 rounded-md border border-primary/40 bg-primary/10 p-3 text-xs text-primary-foreground/80",
    title: "font-semibold uppercase tracking-wide text-primary",
    body: "text-primary-foreground/70",
  },
};

export function LocatorBanner({
  display,
  tone,
  showVerify,
  onVerify,
  verifyLabel = "Mark as verified",
  className,
  actionSlot,
}: LocatorBannerProps) {
  const styles = INSPECTOR_CLASS_MAP[tone];

  return (
    <div className={cn("mt-3", styles.container, className)}>
      <p className={styles.title}>{display.inspectorTitle}</p>
      <p className={styles.body}>{display.inspectorBody}</p>
      {actionSlot}
      {!actionSlot && showVerify ? (
        <Button type="button" size="sm" variant="outline" onClick={onVerify} className="text-xs">
          {verifyLabel}
        </Button>
      ) : null}
    </div>
  );
}
