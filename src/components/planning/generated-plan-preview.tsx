"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedPlanSuggestion } from "@/lib/ai/plan-generator";

type GeneratedPlanPreviewProps = {
  plan: GeneratedPlanSuggestion;
  onApply: () => void;
  onDismiss: () => void;
  disabled?: boolean;
};

export function GeneratedPlanPreview({
  plan,
  onApply,
  onDismiss,
  disabled = false,
}: GeneratedPlanPreviewProps) {
  return (
    <section className="space-y-4 rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI-generated suggestion</h2>
          {plan.rationale ? (
            <p className="mt-1 text-sm text-muted-foreground">{plan.rationale}</p>
          ) : null}
          {plan.targetSources.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Suggested sources: {plan.targetSources.join(", ")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="default" onClick={onApply} disabled={disabled}>
            Apply to form
          </Button>
          <Button variant="ghost" onClick={onDismiss} disabled={disabled}>
            Dismiss
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PreviewField label="Scope & PICO" value={plan.scope} />
        <PreviewField label="Key Questions" value={plan.questions} />
        <PreviewField label="Query Strategy" value={plan.queryStrategy} />
        <PreviewField label="Draft Outline" value={plan.outline} />
      </div>
    </section>
  );
}

type PreviewFieldProps = {
  label: string;
  value: string;
};

function PreviewField({ label, value }: PreviewFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Textarea value={value} readOnly className="min-h-[160px] bg-muted/40 font-mono text-sm" />
    </div>
  );
}
