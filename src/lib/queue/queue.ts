import { Queue } from 'bullmq';
import { createRedisConnection } from './redis';

const queues = (() => {
  if (process.env.MOCK_REDIS === '1') {
    const mockQueue = {
      name: 'default',
      async add(_name: string, _data: unknown) {
        return { id: `mock-${Date.now()}` };
      },
    } as unknown as Queue;

    return {
      default: mockQueue,
    };
  }

  const redis = createRedisConnection();

  return {
    default: new Queue('default', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
      },
    }),
  };
})();

export { queues };

export type QueueMap = typeof queues;
