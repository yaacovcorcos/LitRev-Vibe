import { QueueEvents, Worker, JobsOptions } from 'bullmq';
import pino from 'pino';

import { processSearchJob, searchJobSchema } from "@/lib/search/jobs";
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
        return processSearchJob(searchJobSchema.parse(job.data));
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
