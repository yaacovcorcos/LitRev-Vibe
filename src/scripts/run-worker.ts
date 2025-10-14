import "dotenv/config";

import { defaultWorker } from "../lib/queue/worker";
import { queues } from "../lib/queue/queue";
import { startIntegrityScheduler } from "../lib/integrity/scheduler";

async function main() {
  console.info('[worker] Worker is running. Adding sample heartbeat job.');
  await queues.default.add('heartbeat', { timestamp: new Date().toISOString() });

  startIntegrityScheduler();
}

main().catch((err) => {
  console.error('[worker] Failed to start worker', err);
  process.exit(1);
});
