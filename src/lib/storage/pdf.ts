import { promises as fs } from "fs";
import path from "path";

export type StoredPdfArtifact = {
  storagePath: string;
  storageUrl: string | null;
};

const PDF_STORAGE_ROOT = process.env.PDF_STORAGE_ROOT
  ? path.resolve(process.env.PDF_STORAGE_ROOT)
  : path.join(process.cwd(), "data", "pdfs");

export async function storeCandidatePdf(projectId: string, candidateId: string, data: Buffer): Promise<StoredPdfArtifact> {
  const projectDir = path.join(PDF_STORAGE_ROOT, projectId);
  await fs.mkdir(projectDir, { recursive: true });

  const filename = `${candidateId}.pdf`;
  const filePath = path.join(projectDir, filename);
  await fs.writeFile(filePath, data);

  const storagePath = path.relative(PDF_STORAGE_ROOT, filePath);

  return {
    storagePath,
    storageUrl: null,
  };
}

export function resolveStoredPdfPath(storagePath: string) {
  return path.join(PDF_STORAGE_ROOT, storagePath);
}
