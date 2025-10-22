"use client";

import Link from "next/link";

import { Activity, Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const UPCOMING_FEATURES = [
  {
    title: "Search job alerts",
    description: "Get notified when queued search jobs complete or fail.",
    status: "Planned",
  },
  {
    title: "Integrity feed updates",
    description: "Surface nightly integrity ingestion outcomes for quick triage.",
    status: "In design",
  },
  {
    title: "Draft review reminders",
    description: "Schedule nudges when drafts await approval or locator verification.",
    status: "Backlog",
  },
] as const;

export default function NotificationsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          <Link href="/projects" className="transition hover:text-foreground/80">
            Projects
          </Link>{" "}
          <span className="mx-2 text-muted-foreground/70">/</span>
          <span className="text-foreground/90">Notifications</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Bell className="h-5 w-5 text-muted-foreground" />
              Notifications
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Central clearinghouse for automation alerts across search, integrity, compose, and export workflows.
              Live feeds are landing in an upcoming milestone.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/runs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              View runs dashboard
            </Link>
          </Button>
        </div>
      </header>

      <Separator />

      <section>
        <Card className="border-dashed border-muted-foreground/40 bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              Coming soon
            </CardTitle>
            <CardDescription>
              This space will stream notification events once the automation feeds are live. Until then, use the runs
              dashboard and activity log to monitor long-running jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {UPCOMING_FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="space-y-2 rounded-md border border-muted-foreground/20 bg-background p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-foreground">{feature.title}</h2>
                  <Badge variant="outline" className="uppercase text-[11px] tracking-wide">
                    {feature.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
