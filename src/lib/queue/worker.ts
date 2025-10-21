import { QueueEvents, Worker, JobsOptions } from 'bullmq';
import pino from 'pino';

import { COMPOSE_QUEUE_JOB_NAME } from "@/lib/compose/jobs";
import { processComposeJob } from "@/lib/compose/processor";
import { processSearchJob } from "@/lib/search/jobs";
import { processTriageRationaleJob } from "@/lib/ai/jobs";
import { processIntegrityIngestionJob } from "@/lib/integrity/jobs";
import { processSnippetExtractionJob } from "@/lib/snippets/jobs";
import { EXPORT_QUEUE_JOB_NAME } from "@/lib/export/jobs";
import { processExportJob } from "@/lib/export/processor";
import { queues } from "./queue";
import { createRedisConnection } from "./redis";

const logger = pino({
  name: 'queue-worker',
  level: process.env.LOG_LEVEL || 'info',
});

const redisConnection = createRedisConnection();

export const defaultWorker = new Worker(
  'default',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing job');

    switch (job.name) {
      case 'search:execute':
        return processSearchJob(job.data);
      case 'triage:rationale':
        return processTriageRationaleJob(job.data);
      case 'integrity:ingest':
        return processIntegrityIngestionJob();
      case 'snippets:extract':
        return processSnippetExtractionJob(job.data);
      case COMPOSE_QUEUE_JOB_NAME:
        return processComposeJob(job.data);
      case EXPORT_QUEUE_JOB_NAME:
        return processExportJob(job.data);
      default:
        logger.warn({ jobName: job.name }, 'Unhandled job type, echoing payload');
        return job.data;
    }
  },
  {
    connection: redisConnection,
    maxStalledCount: 1,
  },
);

const queueEvents = new QueueEvents('default', {
  connection: redisConnection,
});

queueEvents.on('completed', ({ jobId }) => {
  logger.info({ jobId }, 'Job completed');
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, 'Job failed');
});

process.on('SIGINT', async () => {
  logger.info('Shutting down worker...');
  await Promise.all([queueEvents.close(), defaultWorker.close(), redisConnection.quit()]);
  process.exit(0);
});

export type QueueJobOptions = JobsOptions;
export { queues };
