"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowDownToLine, BadgeCheck, Info, Loader2, Rocket, Ban } from "lucide-react";

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

function HistoryItem({ projectId, item }: { projectId: string | null; item: ExportHistoryItem }) {
  const statusDisplay = getExportStatusDisplay(item.status);
  const createdAt = format(new Date(item.createdAt), "PPpp");
  const progress = item.job?.progress ?? null;
  const isInProgress = item.status === "queued" || item.status === "in_progress";
  const downloadUrl = item.status === "completed" && projectId
    ? `/api/projects/${projectId}/exports/${item.id}/download`
    : null;
  const manifest = parseManifest(item.options);

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
            <Button asChild size="sm" title="Download manuscript, bibliography, and PRISMA diagram">
              <Link href={downloadUrl} prefetch={false}>
                <ArrowDownToLine className="mr-2 h-4 w-4" /> Download bundle
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
      {manifest && manifest.files.length > 0 ? (
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Bundle contents</p>
          <ul className="space-y-1">
            {manifest.files.map((file) => (
              <li key={file.name} className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {file.contentType}
                </Badge>
                <span className="text-muted-foreground/80">{file.name}</span>
              </li>
            ))}
          </ul>
        </div>
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

type Manifest = {
  files: Array<{ name: string; contentType: string }>;
};

function parseManifest(options: Record<string, unknown>) {
  const isProd = process.env.NODE_ENV === "production";

  if (!options || typeof options !== "object") {
    if (!isProd) {
      console.warn("export: manifest options missing or invalid", options);
    }
    return null;
  }

  const manifest = options as Partial<Manifest>;
  const files = Array.isArray(manifest.files) ? manifest.files : undefined;

  if (!files) {
    if (!isProd) {
      console.warn("export: manifest missing files array", options);
    }
    return null;
  }

  const normalized = files.filter((file): file is Manifest["files"][number] => Boolean(file?.name));

  if (normalized.length === 0 && !isProd) {
    console.warn("export: manifest contains zero files", options);
  }

  return normalized.length > 0 ? { files: normalized } : null;
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
