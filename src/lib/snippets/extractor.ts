import { prisma } from "@/lib/prisma";

export type SnippetExtractionResult = {
  candidateId: string;
  snippetCount: number;
};

type ExtractOptions = {
  projectId: string;
  candidateIds?: string[];
};

function extractSentences(text: string, limit = 5) {
  const matches = text.match(/[^.!?]+[.!?]/g) ?? [text];
  return matches
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export async function extractLocatorSnippets({ projectId, candidateIds }: ExtractOptions) {
  const candidates = await prisma.candidate.findMany({
    where: {
      projectId,
      ...(candidateIds ? { id: { in: candidateIds } } : {}),
    },
    select: {
      id: true,
      metadata: true,
      locatorSnippets: true,
    },
  });

  const results: SnippetExtractionResult[] = [];

  for (const candidate of candidates) {
    const metadata = (candidate.metadata as Record<string, unknown>) ?? {};
    const abstract = typeof metadata.abstract === "string" ? metadata.abstract : "";
    const pdfText = typeof metadata.pdfText === "string" ? metadata.pdfText : "";
    const sourceText = pdfText || abstract;

    if (!sourceText.trim()) {
      continue;
    }

    const sentences = extractSentences(sourceText, 5);
    if (sentences.length === 0) {
      continue;
    }

    const snippets = sentences.map((sentence, index) => ({
      text: sentence,
      source: pdfText ? "PDF" : "Abstract",
      sentence,
      order: index,
    }));

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        locatorSnippets: snippets,
      },
    });

    results.push({ candidateId: candidate.id, snippetCount: snippets.length });
  }

  return results;
}
