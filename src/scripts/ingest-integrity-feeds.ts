import "dotenv/config";

import { enqueueIntegrityIngestionJob } from "@/lib/integrity/jobs";

async function main() {
  try {
    const job = await enqueueIntegrityIngestionJob();
    console.log(`Integrity ingestion job queued (id=${job.id}). Ensure the queue worker is running to process it.`);
  } catch (error) {
    console.error("Integrity feed ingestion failed:", error);
    process.exitCode = 1;
  }
}

void main();
