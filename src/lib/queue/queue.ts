import { Queue } from 'bullmq';
import { createRedisConnection } from './redis';

let queues: { default: Queue };

if (process.env.MOCK_REDIS === '1') {
  const mockQueue = {
    add: async (_name: string, _data: unknown) => ({ id: `mock-${Date.now()}` }),
  } as unknown as Queue;

  queues = { default: mockQueue };
} else {
  const redis = createRedisConnection();
  queues = {
    default: new Queue('default', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
      },
    }),
  };
}

export { queues };

export type QueueMap = typeof queues;
