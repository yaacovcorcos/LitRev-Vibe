import "dotenv/config";

import { ingestIntegrityFeeds } from "@/lib/integrity/feeds";

async function main() {
  try {
    await ingestIntegrityFeeds();
    console.log("Integrity feed ingestion complete.");
  } catch (error) {
    console.error("Integrity feed ingestion failed:", error);
    process.exitCode = 1;
  }
}

void main();
