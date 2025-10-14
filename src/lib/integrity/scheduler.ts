import cron from "node-cron";
import pino from "pino";

import { enqueueIntegrityIngestionJob } from "@/lib/integrity/jobs";

const logger = pino({ name: "integrity-scheduler" });

let scheduled = false;

export function startIntegrityScheduler() {
  if (scheduled) {
    return;
  }

  const cronExpression = process.env.INTEGRITY_CRON ?? "0 3 * * *"; // 3 AM UTC by default

  if (!cron.validate(cronExpression)) {
    logger.error({ schedule: cronExpression }, "Invalid cron expression for integrity scheduler");
    return;
  }

  cron.schedule(cronExpression, async () => {
    try {
      const job = await enqueueIntegrityIngestionJob();
      logger.info({ jobId: job.id }, "Queued integrity ingestion job");
    } catch (error) {
      logger.error({ err: error }, "Failed to enqueue integrity ingestion job");
    }
  });

  logger.info({ schedule: cronExpression }, "Integrity scheduler started");
  scheduled = true;
}
