"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  Rocket,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-projects";
import { useExportHistory, useExportMetrics, useEnqueueExport, usePrismaDiagram } from "@/hooks/use-exports";
import type { ExportMetrics, ExportHistoryItem } from "@/hooks/use-exports";
import { getExportStatusDisplay, type ExportStatusDisplay } from "@/lib/export/status";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

type RouteParams = {
  id?: string;
};

type TimelineEntry = {
  id: string;
  status: ExportHistoryItem["status"];
  statusDisplay: ExportStatusDisplay;
  format: string;
  createdAt: Date;
  completedAt: Date | null;
  createdRelative: string;
  durationLabel: string | null;
  includeLedger: boolean;
  includePrisma: boolean;
  fileCount: number;
  isActive: boolean;
  downloadUrl: string | null;
  progressPercent: number | null;
  progressLabel: string | null;
  errorMessage: string | null;
};

type ExportStatusTone = ExportStatusDisplay["tone"];

const ACTIVE_STATUSES: ReadonlySet<ExportHistoryItem["status"]> = new Set(["pending", "queued", "in_progress"]);

const BADGE_CLASS_MAP: Record<ExportStatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  default: "border-border bg-muted/30 text-muted-foreground",
};

const MARKER_CLASS_MAP: Record<ExportStatusTone, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-600",
  warning: "border-amber-300 bg-amber-50 text-amber-600",
  destructive: "border-destructive bg-destructive/15 text-destructive",
  default: "border-border bg-background text-muted-foreground",
};

export default function ProjectExportPage() {
  const params = useParams<RouteParams>();
  const projectId = params?.id ?? null;

  const { data: projectData, isLoading: projectLoading } = useProject(projectId);
  const historyQuery = useExportHistory(projectId, 25);
  const metricsQuery = useExportMetrics(projectId);
  const diagramQuery = usePrismaDiagram(projectId);
  const enqueueMutation = useEnqueueExport(25);

  const project = projectData ?? null;
  const exportSettings = project?.settings.exports;

  const enabledFormats = exportSettings?.enabledFormats ?? [];
  const defaultFormat = exportSettings?.defaultFormat ?? enabledFormats[0] ?? "markdown";

  const [selectedFormat, setSelectedFormat] = useState<string>(defaultFormat);
  const [includeLedger, setIncludeLedger] = useState<boolean>(exportSettings?.includeLedgerExport ?? true);
  const [includePrisma, setIncludePrisma] = useState<boolean>(exportSettings?.includePrismaDiagram ?? true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const metrics = metricsQuery.data?.metrics ?? null;
  const history = historyQuery.data?.exports ?? [];
  const timelineEntries = useMemo(() => buildTimeline(history, projectId), [history, projectId]);
  const hasHistory = timelineEntries.length > 0;

  const formatOptions = useMemo(() => exportSettings?.enabledFormats ?? [], [exportSettings]);

  useEffect(() => {
    if (!project) {
      return;
    }

    const projectFormats = project.settings.exports.enabledFormats;
    const defaultProjectFormat = project.settings.exports.defaultFormat ?? projectFormats[0] ?? "markdown";
    setSelectedFormat(defaultProjectFormat);
    setIncludeLedger(project.settings.exports.includeLedgerExport);
    setIncludePrisma(project.settings.exports.includePrismaDiagram);
  }, [project?.id, project?.settings.exports]);

  const canSubmit = projectId && !enqueueMutation.isPending;

  const handleReset = () => {
    if (!project) {
      setSelectedFormat(defaultFormat);
      setIncludeLedger(true);
      setIncludePrisma(true);
      return;
    }

    const exportPrefs = project.settings.exports;
    setSelectedFormat(exportPrefs.defaultFormat ?? exportPrefs.enabledFormats[0] ?? "markdown");
    setIncludeLedger(exportPrefs.includeLedgerExport);
    setIncludePrisma(exportPrefs.includePrismaDiagram);
    setFeedbackMessage(null);
  };

  const handleSubmit = async () => {
    if (!projectId || !selectedFormat) {
      return;
    }

    setFeedbackMessage(null);

    enqueueMutation.mutate(
      {
        projectId,
        format: selectedFormat,
        includeLedger,
        includePrismaDiagram: includePrisma,
      },
      {
        onSuccess: () => {
          setFeedbackMessage("Export requested. You can monitor progress below.");
        },
        onError: (error) => {
          const message = (error as Error & { status?: number })?.message ?? "Unable to start export";
          setFeedbackMessage(message);
        },
      },
    );
  };

  const isLocatorStrict = project?.settings.locatorPolicy === "strict";

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          <Link href="/projects" className="transition hover:text-foreground/80">
            Projects
          </Link>{" "}
          <span className="mx-2 text-muted-foreground/70">/</span>
          <Link href={`/project/${projectId}/draft`} className="transition hover:text-foreground/80">
            Draft & Compose
          </Link>{" "}
          <span className="mx-2 text-muted-foreground/70">/</span>
          <span className="text-foreground/90">Export</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-3xl font-semibold text-foreground">
              <Rocket className="h-6 w-6 text-muted-foreground" />
              Export Workspace
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Bundle a manuscript, bibliography, and PRISMA summary directly from your current project state. Launch an export whenever your ledger is ready—progress updates in real time, and every download contains a manifest describing the bundle.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href={`/project/${projectId}/draft`}>Back to draft</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href={`/project/${projectId}/ledger`} className="text-sm">
                Review ledger checkpoint
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl">Configure new export</CardTitle>
              <FormatSummary
                selected={selectedFormat}
                includeLedger={includeLedger}
                includePrisma={includePrisma}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {projectLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-36 w-full" />
              </div>
            ) : (
              <FormatPicker
                formats={formatOptions}
                selected={selectedFormat}
                onSelect={setSelectedFormat}
              />
            )}

            <div className="space-y-4">
              <ToggleRow
                id="include-ledger"
                checked={includeLedger}
                onChange={setIncludeLedger}
                label="Include evidence ledger"
                description="Attach a BibTeX bibliography alongside the manuscript."
              />
              <ToggleRow
                id="include-prisma"
                checked={includePrisma}
                onChange={setIncludePrisma}
                label="Include PRISMA snapshot"
                description="Embed a PRISMA diagram summarising search and screening activity."
              />
            </div>

            {feedbackMessage ? (
              <Callout tone={enqueueMutation.isError ? "destructive" : "notice"}>
                {feedbackMessage}
              </Callout>
            ) : null}

            {isLocatorStrict ? (
              <Callout tone="warning">
                Locator policy is set to <span className="font-semibold">strict</span>. Add locators to every ledger item or relax the policy from project settings before exporting.
              </Callout>
            ) : null}

            <div className="flex items-center gap-3">
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {enqueueMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Start export
              </Button>
              <Button variant="ghost" type="button" onClick={handleReset} disabled={enqueueMutation.isPending}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>PRISMA snapshot</CardTitle>
            <Badge variant="outline" className="gap-1 text-[11px] uppercase tracking-wide">
              <Info className="h-3 w-3" />
              Keeps and excludes tracked automatically
            </Badge>
          </div>
          </CardHeader>
          <CardContent>
            {metricsQuery.isLoading || diagramQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : metrics && diagramQuery.data ? (
              <PrismaPreview metrics={metrics} svg={diagramQuery.data.svg} projectId={projectId} />
            ) : (
              <EmptyState message="Metrics unavailable. Run a search to generate PRISMA data." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Export history</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => historyQuery.refetch()} disabled={historyQuery.isFetching}>
              {historyQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <HistorySkeleton />
          ) : !hasHistory ? (
            <EmptyState message="No exports yet. Generate your first export to see it here." />
          ) : (
            <HistoryTimeline entries={timelineEntries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FormatPicker({
  formats,
  selected,
  onSelect,
}: {
  formats: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  if (formats.length === 0) {
    return (
      <Callout tone="warning">
        No export formats are enabled for this project yet. Update export settings to unlock DOCX, Markdown, or BibTeX bundles.
      </Callout>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {formats.map((format) => {
        const isActive = selected === format;
        return (
          <button
            key={format}
            type="button"
            onClick={() => onSelect(format)}
            className={`group rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              isActive ? "border-primary/80 bg-primary/5 shadow-sm" : "border-border hover:border-foreground/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide">{format}</span>
              {isActive ? <BadgeCheck className="h-4 w-4 text-primary" /> : null}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{formatDescription(format)}</p>
            <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground/70">
              Bundle includes {bundleSummaryForFormat(format)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function formatDescription(format: string) {
  switch (format) {
    case "docx":
      return "Structured manuscript in DOCX format.";
    case "markdown":
      return "Markdown report with export summary and sections.";
    case "bibtex":
      return "Bibliography export for reference managers.";
    default:
      return "Custom export format.";
  }
}

function bundleSummaryForFormat(format: string) {
  switch (format) {
    case "docx":
      return "manuscript (.docx), bibliography (.bib), PRISMA (.svg)";
    case "markdown":
      return "manuscript (.md), bibliography (.bib), PRISMA (.svg)";
    case "bibtex":
      return "bibliography (.bib)";
    default:
      return "all configured artifacts";
  }
}

function FormatSummary({
  selected,
  includeLedger,
  includePrisma,
}: {
  selected: string;
  includeLedger: boolean;
  includePrisma: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-foreground/80">Selected bundle</span>
        <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
          {selected}
        </Badge>
      </div>
      <p>
        {includeLedger ? "Bibliography attached." : "Bibliography excluded."} {includePrisma ? "PRISMA snapshot included." : "PRISMA snapshot skipped."}
      </p>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border border-muted-foreground/60 accent-primary"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}

function PrismaPreview({ metrics, svg, projectId }: { metrics: ExportMetrics; svg: string; projectId: string | null }) {
  const data = buildMetricsPresentation(metrics);
  const inlineSvg = svg.replace(/<\?xml[^>]*>\s*/i, "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{data.caption}</span>
        {projectId ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/api/projects/${projectId}/exports/prisma-diagram`} prefetch={false}>
              <ArrowDownToLine className="mr-2 h-3 w-3" /> Download SVG
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-white p-4" dangerouslySetInnerHTML={{ __html: inlineSvg }} />
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {data.kpis.map((item) => (
          <div key={item.label} className="rounded-md border border-border bg-muted/40 p-3">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="text-lg font-semibold text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function buildMetricsPresentation(metrics: ExportMetrics) {
  return {
    kpis: [
      { label: "Identified", value: metrics.totalIdentified },
      { label: "Stored", value: metrics.totalStored },
      { label: "Screened", value: metrics.screened },
      { label: "Included", value: metrics.included },
    ],
    caption: metrics.lastSearchCompletedAt
      ? `Last updated ${formatDistanceToNow(new Date(metrics.lastSearchCompletedAt), { addSuffix: true })}`
      : "No search job has completed yet.",
  };
}

type ParsedManifest = {
  includeLedger?: boolean;
  includePrismaDiagram?: boolean;
  files: Array<{ name: string; contentType: string }>;
};

function buildTimeline(entries: ExportHistoryItem[], projectId: string | null): TimelineEntry[] {
  return entries
    .map((item) => {
      const createdAt = safeDate(item.createdAt);
      if (!createdAt) {
        return null;
      }

      const completedAt = safeDate(item.completedAt);
      const manifest = parseExportManifest(item.options);
      const includeLedger = manifest?.includeLedger ?? deriveBooleanOption(item.options, ["includeLedger", "includeLedgerExport"]) ?? false;
      const includePrisma = manifest?.includePrismaDiagram ?? deriveBooleanOption(item.options, ["includePrismaDiagram", "includePrisma"]) ?? false;
      const fileCount = manifest?.files.length ?? 0;

      const statusDisplay = getExportStatusDisplay(item.status);
      const isActive = ACTIVE_STATUSES.has(item.status);
      const createdRelative = formatDistanceToNow(createdAt, { addSuffix: true });

      let durationLabel: string | null = null;
      if (completedAt) {
        const duration = completedAt.getTime() - createdAt.getTime();
        if (duration > 0) {
          durationLabel = formatDuration(duration);
        }
      } else if (isActive) {
        const elapsed = Date.now() - createdAt.getTime();
        if (elapsed > 0) {
          durationLabel = formatDuration(elapsed);
        }
      }

      const downloadUrl = item.status === "completed" && projectId ? `/api/projects/${projectId}/exports/${item.id}/download` : null;
      const progressPercent = deriveProgressPercent(item.job?.progress ?? null);
      const progressLabel = buildProgressLabel(item.status, progressPercent, item.job?.status ?? null);
      const errorMessage = deriveErrorMessage(item.error);

      return {
        id: item.id,
        status: item.status,
        statusDisplay,
        format: item.format,
        createdAt,
        completedAt,
        createdRelative,
        durationLabel,
        includeLedger,
        includePrisma,
        fileCount,
        isActive,
        downloadUrl,
        progressPercent,
        progressLabel,
        errorMessage,
      } satisfies TimelineEntry;
    })
    .filter((entry): entry is TimelineEntry => Boolean(entry));
}

function parseExportManifest(options: Record<string, unknown> | null | undefined): ParsedManifest | null {
  if (!options || typeof options !== "object") {
    return null;
  }

  const manifest = options as Partial<ParsedManifest>;
  const includeLedger = typeof manifest.includeLedger === "boolean" ? manifest.includeLedger : undefined;
  const includePrismaDiagram = typeof manifest.includePrismaDiagram === "boolean" ? manifest.includePrismaDiagram : undefined;
  const files = Array.isArray(manifest.files)
    ? manifest.files.filter(
        (file): file is ParsedManifest["files"][number] =>
          Boolean(file && typeof file.name === "string" && typeof file.contentType === "string"),
      )
    : [];

  return {
    includeLedger,
    includePrismaDiagram,
    files,
  };
}

function deriveBooleanOption(options: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = options[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return null;
}

function deriveProgressPercent(value: number | null): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(clamped * 100);
}

function buildProgressLabel(status: ExportHistoryItem["status"], percent: number | null, jobStatus: string | null): string | null {
  if (status === "completed") {
    return "Export ready";
  }

  if (status === "failed") {
    return "Export failed";
  }

  if (status === "in_progress") {
    if (percent !== null) {
      return `Processing export (${percent}%)`;
    }
    if (jobStatus) {
      return `Processing export (${jobStatus})`;
    }
    return "Processing export";
  }

  if (status === "queued") {
    return "Queued for worker";
  }

  if (status === "pending") {
    return "Awaiting worker";
  }

  return null;
}

function deriveErrorMessage(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value && "message" in value && typeof (value as { message?: unknown }).message === "string") {
    return String((value as { message: string }).message);
  }

  return "Export failed.";
}

function safeDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "<1s";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  if (totalSeconds < 1) {
    return "<1s";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ");
}

type CalloutTone = "notice" | "warning" | "destructive";

function Callout({ tone, children }: { tone: CalloutTone; children: React.ReactNode }) {
  const toneStyles: Record<CalloutTone, string> = {
    notice: "border-primary/30 bg-primary/5 text-primary",
    warning: "border-amber-400/80 bg-amber-50 text-amber-900",
    destructive: "border-destructive/50 bg-destructive/10 text-destructive",
  };

  return (
    <div className={`flex gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed ${toneStyles[tone]}`}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function HistoryTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <ol className="relative space-y-4 border-l border-border/60 pl-6">
      {entries.map((entry) => (
        <TimelineEntryItem key={entry.id} entry={entry} />
      ))}
    </ol>
  );
}

function TimelineEntryItem({ entry }: { entry: TimelineEntry }) {
  const Icon = entry.status === "completed" ? CheckCircle2 : entry.status === "failed" ? AlertTriangle : entry.status === "in_progress" ? Loader2 : Clock3;
  const markerClasses = MARKER_CLASS_MAP[entry.statusDisplay.tone];
  const badgeClasses = BADGE_CLASS_MAP[entry.statusDisplay.tone];
  const formatLabel = entry.format.toUpperCase();

  return (
    <li className="relative pl-8">
      <span
        className={cn(
          "absolute left-[-12px] top-6 flex h-6 w-6 items-center justify-center rounded-full border bg-background",
          markerClasses,
          entry.status === "in_progress" ? "ring-2 ring-primary/30" : null,
        )}
        aria-hidden
      >
        <Icon className={cn("h-3.5 w-3.5", entry.status === "in_progress" ? "animate-spin" : undefined)} />
      </span>

      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
            <Badge variant="outline" className="text-[11px] font-medium">
              {formatLabel}
            </Badge>
            <Badge
              variant="outline"
              className={cn("gap-1 text-[11px] font-medium", badgeClasses)}
            >
              {entry.statusDisplay.label}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{entry.createdRelative}</span>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {entry.includeLedger ? "Ledger attached" : "Ledger skipped"}
          </Badge>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {entry.includePrisma ? "PRISMA included" : "PRISMA skipped"}
          </Badge>
          {entry.fileCount > 0 ? (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {entry.fileCount} files
            </Badge>
          ) : null}
        </div>

        {entry.isActive ? (
          <div className="space-y-2">
            <ProgressBar value={entry.progressPercent} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{entry.progressLabel ?? "Processing export"}</span>
              {entry.durationLabel ? <span>• {entry.durationLabel} elapsed</span> : null}
            </div>
          </div>
        ) : entry.durationLabel ? (
          <p className="text-xs text-muted-foreground">Completed in {entry.durationLabel}</p>
        ) : null}

        {entry.status === "failed" && entry.errorMessage ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <span>{entry.errorMessage}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Started {format(entry.createdAt, "PPpp")}
            {entry.completedAt ? ` • Finished ${format(entry.completedAt, "PPpp")}` : ""}
          </span>
          {entry.downloadUrl ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={entry.downloadUrl} prefetch={false}>
                <ArrowDownToLine className="mr-2 h-4 w-4" /> Download bundle
              </Link>
            </Button>
          ) : entry.isActive ? (
            <span className="italic text-muted-foreground">Export running…</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ProgressBar({ value }: { value: number | null }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        role="presentation"
        aria-hidden
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="relative pl-8">
          <div className="absolute left-[-10px] top-6 h-3 w-3 rounded-full bg-muted" />
          <div className="space-y-3 rounded-lg border border-border/60 bg-card/70 p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-xs text-muted-foreground">
      <Rocket className="h-4 w-4 text-muted-foreground" />
      <span>{message}</span>
    </div>
  );
}
