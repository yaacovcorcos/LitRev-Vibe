import { Queue } from 'bullmq';
import { createRedisConnection } from './redis';

const queues = (() => {
  if (process.env.MOCK_REDIS === '1') {
    let mockJobCounter = 0;
    const mockProcessKey = typeof process.pid === 'number' ? process.pid : 'mock';
    const mockQueue = {
      name: 'default',
      async add(_name: string, _data: unknown) {
        mockJobCounter += 1;
        return { id: `mock-${mockProcessKey}-${mockJobCounter}` };
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
