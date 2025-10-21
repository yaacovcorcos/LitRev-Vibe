import fs from "fs/promises";
import path from "path";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { toNullableInputJson } from "@/lib/prisma/json";

export type IntegrityFlag = {
  label: string;
  severity: "info" | "warning" | "critical";
  source: "retraction-watch" | "doaj" | string;
  reason?: string;
  details?: string;
};

type CandidateIntegrityUpdate = {
  candidateId: string;
  flags: IntegrityFlag[];
};

const DATA_ROOT = process.env.INTEGRITY_DATA_DIR ?? path.join(process.cwd(), "data/integrity");

type RetractionRecord = {
  title: string;
  doi: string;
  eventDate?: string;
};

type DoajRecord = {
  journalTitle: string;
  issn?: string;
  publisher?: string;
};

async function loadJSONFile<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(DATA_ROOT, filename);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Integrity feed file missing or invalid: ${filename}`);
    return null;
  }
}

async function loadRetractionRecords(): Promise<RetractionRecord[]> {
  const data = await loadJSONFile<RetractionRecord[]>("retraction-watch.json");
  return data ?? [];
}

async function loadDoajRecords(): Promise<DoajRecord[]> {
  const data = await loadJSONFile<DoajRecord[]>("doaj.json");
  return data ?? [];
}

export async function applyIntegrityFlags(updates: CandidateIntegrityUpdate[], onUpdate?: () => void) {
  if (updates.length === 0) {
    return;
  }

  await Promise.all(
    updates.map((update) =>
      prisma.candidate.update({
        where: { id: update.candidateId },
        data: {
          integrityFlags: toNullableInputJson(update.flags),
        },
      }).then(() => {
        onUpdate?.();
      }),
    ),
  );
}

type IngestOptions = {
  onCandidateUpdate?: () => void;
};

export async function ingestIntegrityFeeds(options: IngestOptions = {}) {
  const [retractions, doaj] = await Promise.all([loadRetractionRecords(), loadDoajRecords()]);

  if (retractions.length === 0 && doaj.length === 0) {
    console.warn("No integrity feed data available; skipping updates.");
    return;
  }

  const doiMap = new Map<string, RetractionRecord>();
  retractions.forEach((record) => {
    if (record.doi) {
      doiMap.set(record.doi.toLowerCase(), record);
    }
  });

  const journalMap = new Map<string, DoajRecord>();
  doaj.forEach((record) => {
    if (record.journalTitle) {
      journalMap.set(record.journalTitle.toLowerCase(), record);
    }
  });

  const issnSet = new Set<string>();
  doaj.forEach((record) => {
    if (record.issn) {
      issnSet.add(record.issn.replace(/[^0-9xX]/g, ""));
    }
  });

  const candidates = await prisma.candidate.findMany({
    select: {
      id: true,
      metadata: true,
    },
  });

  const updates: CandidateIntegrityUpdate[] = [];

  for (const candidate of candidates) {
    const metadata = (candidate.metadata as Record<string, unknown>) ?? {};
    const doi = typeof metadata.doi === "string" ? metadata.doi.toLowerCase() : undefined;
    const journal = typeof metadata.journal === "string" ? metadata.journal.toLowerCase() : undefined;
    const issn = typeof metadata.issn === "string" ? metadata.issn.replace(/[^0-9xX]/g, "") : undefined;

    const flags: IntegrityFlag[] = [];

    if (doi && doiMap.has(doi)) {
      const record = doiMap.get(doi)!;
      flags.push({
        label: "Retracted",
        severity: "critical",
        source: "retraction-watch",
        reason: record.eventDate ? `Retraction date: ${record.eventDate}` : undefined,
        details: record.title,
      });
    }

    if (journal && journalMap.has(journal)) {
      const record = journalMap.get(journal)!;
      flags.push({
        label: "Untrusted Journal",
        severity: "warning",
        source: "doaj",
        reason: record.publisher ? `Publisher: ${record.publisher}` : undefined,
        details: record.journalTitle,
      });
    } else if (issn && issnSet.has(issn)) {
      const record = doaj.find((entry) => entry.issn && entry.issn.replace(/[^0-9xX]/g, "") === issn);
      if (record) {
        flags.push({
          label: "Untrusted Journal",
          severity: "warning",
          source: "doaj",
          reason: record.publisher ? `Publisher: ${record.publisher}` : undefined,
          details: record.journalTitle,
        });
      }
    }

    if (flags.length > 0) {
      updates.push({ candidateId: candidate.id, flags });
    }
  }

  if (updates.length === 0) {
    console.info("Integrity feeds ingested: no matching candidates flagged.");
    return;
  }

  await applyIntegrityFlags(updates, options.onCandidateUpdate);
  console.info(`Integrity feeds ingested: updated ${updates.length} candidates.`);
}
