import cron from "node-cron";

import { enqueueIntegrityIngestionJob } from "@/lib/integrity/jobs";

let scheduled = false;

export function startIntegrityScheduler() {
  if (scheduled) {
    return;
  }

  const cronExpression = process.env.INTEGRITY_CRON ?? "0 3 * * *"; // 3 AM UTC by default

cron.schedule(cronExpression, async () => {
  try {
    const job = await enqueueIntegrityIngestionJob();
    console.log(`[integrity-scheduler] queued job ${job.id}`);
  } catch (error) {
    console.error("[integrity-scheduler] failed to enqueue job", error);
  }
});

scheduled = true;
}
PATCH
