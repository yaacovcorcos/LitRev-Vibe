import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LocatorBanner } from "@/components/ledger/locator-banner";
import { getLocatorStatusDisplay, type LocatorStatus } from "@/lib/ledger/status";
import { LocatorSummary } from "@/app/project/[id]/ledger/page";
import { cn } from "@/lib/utils";

const sampleEntries = [
  {
    id: "entry-pending",
    title: "Mindfulness Interventions for Hypertension",
    authors: "Smith, L.; Patel, H.",
    venue: "Journal of Integrative Medicine",
    keptAt: "2025-09-01T10:00:00.000Z",
    status: "pending_locator" as LocatorStatus,
    locators: [],
  },
  {
    id: "entry-review",
    title: "Plant-based Diets in Cardiovascular Care",
    authors: "Chang, W.; Gomez, J.",
    venue: "CardioCare Studies",
    keptAt: "2025-09-05T08:30:00.000Z",
    status: "locator_pending_review" as LocatorStatus,
    locators: [
      {
        text: "Participants following the plant-based diet showed a 12% reduction in systolic blood pressure.",
        source: "PDF • Page 7",
      },
    ],
  },
  {
    id: "entry-verified",
    title: "Telehealth Monitoring for Blood Pressure Management",
    authors: "Rivera, K.; Johansson, P.",
    venue: "Digital Health Advances",
    keptAt: "2025-09-10T12:15:00.000Z",
    status: "locator_verified" as LocatorStatus,
    locators: [
      {
        text: "Remote monitoring led to a sustained 5 mmHg decrease in diastolic pressure over six months.",
        source: "PDF • Page 4",
      },
    ],
  },
];

const meta: Meta = {
  title: "Ledger/LedgerPage",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj;

export const ResponsiveLayout: Story = {
  render: () => {
    return (
      <div className="min-h-screen bg-muted p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="space-y-2">
            <p className="text-sm text-muted-foreground">Projects / Hypertension Review / Evidence Ledger</p>
            <h1 className="text-2xl font-semibold text-foreground">Evidence Ledger</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Track vetted references ready for composition. Each entry includes provenance, integrity notes, and verified locator coverage.
            </p>
          </header>

          <Separator />

          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card className="border-muted-foreground/20 shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-semibold text-foreground">Ledger entries</CardTitle>
                <p className="text-sm text-muted-foreground">Select an entry to review locators, provenance, and integrity signals.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {sampleEntries.map((entry) => {
                  const display = getLocatorStatusDisplay(entry.status);
                  const badgeTone = display.tone;

                  const badgeClasses =
                    badgeTone === "danger"
                      ? "border-destructive/40 text-destructive"
                      : badgeTone === "warning"
                        ? "border-amber-300 text-amber-700"
                        : "border-primary/40 text-primary";

                  return (
                    <Card key={entry.id} className="border border-transparent bg-card p-4 transition hover:border-primary hover:bg-muted/60">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                          <p className="text-xs text-muted-foreground">{entry.authors}</p>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
                            {entry.venue} · {new Date(entry.keptAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={display.badgeVariant} className={cn("uppercase text-[11px]", badgeClasses)}>
                          {display.label}
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                Ledger list collapses to a single column on mobile and expands on desktop.
              </CardFooter>
            </Card>

            <Card className="border-muted-foreground/20 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Inspector preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <LocatorBanner display={getLocatorStatusDisplay("locator_pending_review")} tone="warning" />
                <LocatorSummary
                  locator={{
                    text: sampleEntries[1].locators[0].text,
                    source: sampleEntries[1].locators[0].source,
                  }}
                />
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Loading state</p>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    );
  },
};

export const LocatorStatusStates: Story = {
  render: () => {
    const statuses: LocatorStatus[] = ["pending_locator", "locator_pending_review", "locator_verified"];

    return (
      <div className="space-y-4 p-6">
        {statuses.map((status) => {
          const display = getLocatorStatusDisplay(status);
          return (
            <LocatorBanner key={status} display={display}>
              {status === "locator_pending_review" ? (
                <Button size="sm" variant="outline">
                  Mark as verified
                </Button>
              ) : null}
            </LocatorBanner>
          );
        })}
      </div>
    );
  },
};
