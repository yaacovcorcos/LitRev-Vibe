"use client";

import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/activity-log";

export type ActivityTimelineProps = {
  entries: ActivityEntry[];
  className?: string;
};

export function ActivityTimeline({ entries, className }: ActivityTimelineProps) {
  if (!entries.length) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="space-y-2 py-10 text-center text-sm text-muted-foreground">
          <p>No activity recorded yet.</p>
          <p className="text-xs text-muted-foreground/80">
            Actions such as search runs, triage decisions, and compose jobs will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {entries.map((entry) => (
        <ActivityItem key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

type ActivityItemProps = {
  entry: ActivityEntry;
};

function ActivityItem({ entry }: ActivityItemProps) {
  return (
    <Card className="border-muted-foreground/10 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <Badge variant="outline" className="uppercase tracking-wide text-xs">
            {entry.actor}
          </Badge>
          <time className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
          </time>
        </div>
        <p className="text-sm text-foreground">{entry.action}</p>
        {entry.payload ? (
          <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            {JSON.stringify(entry.payload, null, 2)}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}
