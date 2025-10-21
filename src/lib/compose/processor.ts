import { Prisma } from "@/generated/prisma";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import { updateJobRecord } from "@/lib/jobs";

import { assertCitationsValid } from "./citation-validator";
import { ensureDraftSectionVersion, recordDraftSectionVersion } from "./versions";
import {
  type ComposeJobQueuePayload,
  type ComposeJobState,
  type ComposeSectionStatus,
  composeJobQueuePayloadSchema,
  composeJobStateSchema,
} from "./jobs";

export type ComposeJobResult = {
  completedSections: number;
  totalSections: number;
};

type LedgerEntryForCompose = {
  id: string;
  citationKey: string;
  metadata: Prisma.JsonValue;
  locators: Prisma.JsonValue;
  verifiedByHuman: boolean;
};

export async function processComposeJob(data: unknown): Promise<ComposeJobResult> {
  const payload = composeJobQueuePayloadSchema.parse(data);

  const { jobId, projectId } = payload;
  const totalSections = payload.sections.length;
  let state = cloneState(payload.state);

  const persisted = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      resumableState: true,
    },
  });

  if (persisted?.resumableState) {
    const parsed = composeJobStateSchema.safeParse(persisted.resumableState);
    if (parsed.success) {
      state = mergeStateWithPayload(parsed.data, payload);
    }
  }

  try {
    await updateJobRecord({
      jobId,
      status: "in_progress",
      progress: calculateProgress(state, totalSections),
      resumableState: state,
    });

    for (let index = 0; index < payload.sections.length; index++) {
      const sectionInput = payload.sections[index];
      const sectionState = ensureSectionState(state, sectionInput, index);

      if (sectionState.status === "completed" && sectionState.draftSectionId) {
        continue;
      }

      const nowIso = new Date().toISOString();
      state.currentSectionIndex = index;
      setSectionState(sectionState, "running", nowIso);
      sectionState.attempts += 1;

      await updateJobRecord({
        jobId,
        status: "in_progress",
        progress: calculateProgress(state, totalSections),
        resumableState: state,
      });

      const ledgerEntries = await fetchLedgerEntries(projectId, sectionState.ledgerEntryIds);

      validateCitations(sectionState.key, sectionState.ledgerEntryIds, ledgerEntries);

      const content = buildDraftContent(sectionInput.title, sectionInput.sectionType, payload.researchQuestion, payload.narrativeVoice, ledgerEntries);
      const existingSectionId = sectionState.draftSectionId ?? sectionInput.sectionId ?? null;

      const draftSection = await prisma.$transaction(async (tx) => {
        const existing = existingSectionId
          ? await tx.draftSection.findUnique({
            where: { id: existingSectionId },
          })
          : null;

        const sanitizedContent = toJson(content);

        if (existing && existing.projectId !== projectId) {
          throw new Error(`Draft section ${existing.id} does not belong to project ${projectId}`);
        }

        if (existing) {
          await ensureDraftSectionVersion(tx, {
            id: existing.id,
            version: existing.version,
            status: existing.status,
            content: existing.content,
          });
        }

        const record = existing
          ? await tx.draftSection.update({
            where: { id: existing.id },
            data: {
              content: sanitizedContent,
              version: existing.version + 1,
              status: "draft",
              approvedAt: null,
            },
          })
          : await tx.draftSection.create({
            data: {
              projectId,
              sectionType: sectionInput.sectionType,
              content: sanitizedContent,
              status: "draft",
              version: 1,
            },
          });

        await recordDraftSectionVersion(tx, {
          id: record.id,
          version: record.version,
          status: record.status,
          content: record.content,
        });

        await tx.draftSectionOnLedger.deleteMany({
          where: { draftSectionId: record.id },
        });

        await tx.draftSectionOnLedger.createMany({
          data: ledgerEntries.map((entry) => ({
            draftSectionId: record.id,
            ledgerEntryId: entry.id,
            locator: primaryLocator(entry) ?? Prisma.JsonNull,
          })),
        });

        return record;
      });

      setSectionState(sectionState, "completed", new Date().toISOString());
      sectionState.draftSectionId = draftSection.id;

      await logActivity({
        projectId,
        action: "draft.section_generated",
        payload: {
          jobId,
          draftSectionId: draftSection.id,
          sectionKey: sectionState.key,
          sectionType: draftSection.sectionType,
          ledgerEntryIds: ledgerEntries.map((entry) => entry.id),
        },
      });

      const progress = calculateProgress(state, totalSections);
      const isFinalSection = progress === 1;

      await updateJobRecord({
        jobId,
        status: isFinalSection ? "completed" : "in_progress",
        progress,
        resumableState: state,
        ...(isFinalSection ? { completedAt: new Date() } : {}),
      });
    }

    const finalRatio = calculateProgress(state, totalSections);
    if (finalRatio === 1) {
      await updateJobRecord({
        jobId,
        status: "completed",
        progress: finalRatio,
        resumableState: state,
        completedAt: new Date(),
      });
    }

    return {
      completedSections: Math.round(finalRatio * totalSections),
      totalSections,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const nowIso = new Date().toISOString();

    if (typeof state.currentSectionIndex === "number") {
      const current = state.sections[state.currentSectionIndex];
      setSectionState(current, "failed", nowIso, message);
    }

    await updateJobRecord({
      jobId,
      status: "failed",
      logs: {
        error: message,
        sectionKey: typeof state.currentSectionIndex === "number" ? state.sections[state.currentSectionIndex].key : null,
      },
      resumableState: state,
    });

    throw error;
  }
}

function setSectionState(section: ComposeJobState["sections"][number], status: ComposeSectionStatus, updatedAtIso: string, lastError?: string) {
  section.status = status;
  section.lastUpdatedAt = updatedAtIso;
  if (lastError) {
    section.lastError = lastError;
  } else {
    delete section.lastError;
  }
}

export function ensureSectionState(state: ComposeJobState, sectionInput: ComposeJobQueuePayload["sections"][number], index: number) {
  if (!state.sections[index]) {
    state.sections[index] = {
      key: sectionInput.sectionId ?? fallbackSectionKey(sectionInput.sectionType, index),
      sectionType: sectionInput.sectionType,
      ledgerEntryIds: sectionInput.ledgerEntryIds,
      status: "pending",
      attempts: 0,
    };
  } else {
    state.sections[index].ledgerEntryIds = sectionInput.ledgerEntryIds;
    state.sections[index].sectionType = sectionInput.sectionType;
    state.sections[index].key ||= fallbackSectionKey(sectionInput.sectionType, index);
  }

  return state.sections[index];
}

export function mergeStateWithPayload(persisted: ComposeJobState, payload: ComposeJobQueuePayload) {
  const hydrated = cloneState(persisted);

  payload.sections.forEach((section, index) => {
    if (!hydrated.sections[index]) {
      hydrated.sections[index] = {
        key: section.sectionId ?? fallbackSectionKey(section.sectionType, index),
        sectionType: section.sectionType,
        ledgerEntryIds: section.ledgerEntryIds,
        status: "pending",
        attempts: 0,
      };
    } else {
      hydrated.sections[index].ledgerEntryIds = section.ledgerEntryIds;
      hydrated.sections[index].key ||= fallbackSectionKey(section.sectionType, index);
    }
  });

  return hydrated;
}

export function completedRatio(state: ComposeJobState, totalSections: number) {
  if (totalSections === 0) {
    return 1;
  }
  const count = state.sections.filter((section) => section.status === "completed").length;
  return Math.min(1, count / totalSections);
}

export function calculateProgress(state: ComposeJobState, totalSections: number) {
  if (totalSections === 0) {
    return 1;
  }

  const completed = state.sections.filter((section) => section.status === "completed").length;
  const runningCount = state.sections.filter((section) => section.status === "running").length;
  const pendingCount = state.sections.filter((section) => section.status === "pending").length;

  const runningContribution = runningCount > 0 ? runningCount * 0.5 : 0;
  const baseProgress = (completed + runningContribution) / totalSections;

  if (pendingCount === totalSections && runningCount === 0) {
    return 0;
  }

  return Math.min(1, baseProgress);
}

function fallbackSectionKey(sectionType: string, index: number) {
  return `${sectionType}-${index + 1}`;
}

async function fetchLedgerEntries(projectId: string, ledgerIds: string[]) {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      projectId,
      id: { in: ledgerIds },
    },
    select: {
      id: true,
      citationKey: true,
      metadata: true,
      locators: true,
      verifiedByHuman: true,
    },
  });

  const ledgerMap = new Map(entries.map((entry) => [entry.id, entry]));

  const missing = ledgerIds.filter((id) => !ledgerMap.has(id));
  if (missing.length > 0) {
    throw new Error(`Missing ledger entries: ${missing.join(", ")}`);
  }

  return ledgerIds.map((id) => ledgerMap.get(id)!) as LedgerEntryForCompose[];
}

function validateCitations(sectionKey: string, ledgerIds: string[], ledgerEntries: LedgerEntryForCompose[]) {
  const references = ledgerIds.map((ledgerId, index) => ({
    id: `${sectionKey}-citation-${index + 1}`,
    ledgerEntryId: ledgerId,
  }));

  const ledgerRecords = ledgerEntries.map((entry) => ({
    id: entry.id,
    verifiedByHuman: entry.verifiedByHuman,
    locators: entry.locators,
  }));

  assertCitationsValid(references, ledgerRecords);
}

function buildDraftContent(
  title: string | undefined,
  sectionType: ComposeJobQueuePayload["sections"][number]["sectionType"],
  researchQuestion: string | undefined,
  narrativeVoice: ComposeJobQueuePayload["narrativeVoice"],
  ledgerEntries: LedgerEntryForCompose[],
) {
  const heading = title ?? defaultHeading(sectionType);
  const voicePrefix = narrativeVoicePrefix(narrativeVoice);

  const paragraphs = ledgerEntries.map((entry, index) => {
    const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
    const studyTitle = typeof metadata.title === "string" && metadata.title.trim().length > 0
      ? metadata.title.trim()
      : `Source ${index + 1}`;
    const journal = typeof metadata.journal === "string" ? metadata.journal : null;
    const year = typeof metadata.publishedAt === "string" ? metadata.publishedAt : null;

    const citationHint = journal || year
      ? ` (${[journal, year].filter(Boolean).join(", ")})`
      : "";

    const narrativeSuffix = researchQuestion
      ? ` This evidence relates to the research question: ${researchQuestion.trim()}.`
      : "";

    const prefix = voicePrefix ? `${voicePrefix} ` : "";

    return `${prefix}${studyTitle}${citationHint} contributes to the literature review.${narrativeSuffix} [${entry.citationKey}]`;
  });

  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: heading }],
      },
      ...paragraphs.map((text) => ({
        type: "paragraph",
        content: [{ type: "text", text }],
      })),
    ],
  };
}

function defaultHeading(sectionType: ComposeJobQueuePayload["sections"][number]["sectionType"]) {
  switch (sectionType) {
    case "literature_review":
      return "Literature Review";
    case "introduction":
      return "Introduction";
    case "methods":
      return "Methods";
    case "results":
      return "Results";
    case "discussion":
      return "Discussion";
    case "conclusion":
      return "Conclusion";
    default:
      return "Draft Section";
  }
}

function narrativeVoicePrefix(narrativeVoice: ComposeJobQueuePayload["narrativeVoice"]) {
  switch (narrativeVoice) {
    case "confident":
      return "The evidence strongly suggests that";
    case "cautious":
      return "The available evidence indicates that";
    default:
      return "";
  }
}

function primaryLocator(entry: LedgerEntryForCompose) {
  const locators = Array.isArray(entry.locators) ? entry.locators : [];
  return locators.length > 0 ? toJson(locators[0]) : null;
}

function toJson<T>(value: T) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function cloneState(state: ComposeJobState) {
  return JSON.parse(JSON.stringify(state)) as ComposeJobState;
}
