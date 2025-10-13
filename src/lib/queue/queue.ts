import { Queue } from 'bullmq';
import { createRedisConnection } from './redis';

const redis = createRedisConnection();

export const queues = {
  default: new Queue('default', {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 100,
    },
  }),
};

export type QueueMap = typeof queues;
