import Redis from 'ioredis';
import { EventEmitter } from 'events';

let client: Redis | null = null;

export function createRedisConnection(): Redis {
  if (client) {
    return client;
  }

  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error('REDIS_URL is not set. Please configure Redis before running the queue worker.');
  }

  if (process.env.MOCK_REDIS === '1') {
    class MockRedis extends EventEmitter {
      duplicate() {
        return this;
      }

      async quit() {
        return undefined;
      }
    }

    const mock = new MockRedis() as unknown as Redis;
    client = mock;
    return mock;
  }

  client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('error', (err) => {
    console.error('[queue] Redis connection error:', err);
  });

  client.on('connect', () => {
    console.info('[queue] Redis connection established');
  });

  return client;
}

export async function closeRedisConnection(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
