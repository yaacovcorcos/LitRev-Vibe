import { promises as fs } from "fs";
import path from "path";

type ExportArtifact = {
  data: Buffer | Uint8Array | string;
  extension: string;
  contentType: string;
  filename?: string;
};

export type StoredExportArtifact = {
  storagePath: string;
  storageUrl: string | null;
};

const EXPORT_STORAGE_ROOT = process.env.EXPORT_STORAGE_ROOT
  ? path.resolve(process.env.EXPORT_STORAGE_ROOT)
  : path.join(process.cwd(), "data", "exports");

export async function storeExportArtifact(
  projectId: string,
  exportId: string,
  artifact: ExportArtifact,
): Promise<StoredExportArtifact> {
  const projectDir = path.join(EXPORT_STORAGE_ROOT, projectId);
  await fs.mkdir(projectDir, { recursive: true });

  const baseName = artifact.filename ?? `${exportId}.${artifact.extension}`;
  const filePath = path.join(projectDir, baseName);

  const buffer =
    typeof artifact.data === "string"
      ? Buffer.from(artifact.data, "utf-8")
      : Buffer.from(artifact.data);

  await fs.writeFile(filePath, buffer);

  const storagePath = path.relative(EXPORT_STORAGE_ROOT, filePath);

  return {
    storagePath,
    storageUrl: null,
  };
}

export function resolveStoredExportPath(storagePath: string) {
  return path.join(EXPORT_STORAGE_ROOT, storagePath);
}

export function inferContentType(format: string) {
  switch (format) {
    case "markdown":
      return "text/markdown";
    case "bibtex":
      return "application/x-bibtex";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

export type { ExportArtifact };
