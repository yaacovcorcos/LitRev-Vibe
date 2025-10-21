"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowDownToLine, BadgeCheck, Loader2, Rocket, Ban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-projects";
import { useExportHistory, useExportMetrics, useEnqueueExport, usePrismaDiagram } from "@/hooks/use-exports";
import type { ExportMetrics, ExportHistoryItem } from "@/hooks/use-exports";
import { getExportStatusDisplay } from "@/lib/export/status";
import { formatDistanceToNow, format } from "date-fns";

type RouteParams = {
  id?: string;
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
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Rocket className="h-6 w-6 text-muted-foreground" />
              Export Workspace
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Generate manuscript, bibliography, or PRISMA artifacts based on the current project state. Exports run in the
              background and appear in the history timeline once complete.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/project/${projectId}/draft`}>Back to draft</Link>
          </Button>
        </div>
      </header>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {projectLoading ? (
              <Skeleton className="h-24 w-full" />
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
                description="Attach a bibliography export alongside the manuscript."
              />
              <ToggleRow
                id="include-prisma"
                checked={includePrisma}
                onChange={setIncludePrisma}
                label="Include PRISMA snapshot"
                description="Embed search and triage counts in the export package."
              />
            </div>

            {feedbackMessage ? <p className="text-sm text-muted-foreground">{feedbackMessage}</p> : null}

            {isLocatorStrict ? (
              <p className="text-xs text-muted-foreground">
                Locator policy: <span className="font-medium">strict</span>. Exports are blocked while ledger items are missing
                locator details.
              </p>
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
          <CardTitle>PRISMA snapshot</CardTitle>
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
          ) : history.length === 0 ? (
            <EmptyState message="No exports yet. Generate your first export to see it here." />
          ) : (
            <ul className="space-y-4">
              {history.map((item) => (
                <HistoryItem key={item.id} projectId={projectId} item={item} />
              ))}
            </ul>
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
    return <EmptyState message="No export formats enabled for this project." />;
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
            className={`rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              isActive ? "border-primary bg-primary/5" : "border-border hover:border-foreground/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide">{format}</span>
              {isActive ? <BadgeCheck className="h-4 w-4 text-primary" /> : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{formatDescription(format)}</p>
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

function HistoryItem({ projectId, item }: { projectId: string | null; item: ExportHistoryItem }) {
  const statusDisplay = getExportStatusDisplay(item.status);
  const createdAt = format(new Date(item.createdAt), "PPpp");
  const progress = item.job?.progress ?? null;
  const isInProgress = item.status === "queued" || item.status === "in_progress";
  const downloadUrl = item.status === "completed" && projectId
    ? `/api/projects/${projectId}/exports/${item.id}/download`
    : null;

  return (
    <li className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="uppercase tracking-wide">
              {item.format}
            </Badge>
            <StatusBadge status={statusDisplay} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Requested {createdAt}</p>
        </div>
        <div className="flex items-center gap-2">
          {downloadUrl ? (
            <Button asChild size="sm">
              <Link href={downloadUrl} prefetch={false}>
                <ArrowDownToLine className="mr-2 h-4 w-4" /> Download
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      {isInProgress ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Exporting…</span>
            <span>{progress !== null ? `${Math.round(progress * 100)}%` : ""}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded bg-primary transition-all"
              style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}
      {item.status === "failed" && item.error ? (
        <p className="mt-3 flex items-start gap-2 text-xs text-destructive">
          <Ban className="mt-0.5 h-4 w-4" />
          <span>{renderErrorMessage(item.error)}</span>
        </p>
      ) : null}
    </li>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof getExportStatusDisplay> }) {
  const variant = status.tone === "success" ? "default" : status.tone === "destructive" ? "destructive" : "outline";
  return <Badge variant={variant}>{status.label}</Badge>;
}

function renderErrorMessage(value: unknown) {
  if (!value) {
    return "Export failed.";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value && "message" in value && typeof value.message === "string") {
    return value.message;
  }

  return "Export failed.";
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
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
