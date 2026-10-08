import { Elmo } from '@elmohq/sdk';
import { expect, it } from 'vitest';

import { standIn, success } from './stand-in';

it('sends a call again after 429', async () => {
  const api = standIn([
    { headers: { 'retry-after': '0' }, status: 429 },
    { headers: { 'retry-after': '0' }, status: 429 },
    success,
  ]);
  const client = new Elmo({ apiKey: 'elmo_test', fetch: api.fetch });
  await client.me.get();
  expect(api.requests).toHaveLength(3);
});

it('sends a call again no more times than it was told', async () => {
  const api = standIn([{ headers: { 'retry-after': '0' }, status: 429 }]);
  const client = new Elmo({
    apiKey: 'elmo_test',
    maxRetries: 1,
    fetch: api.fetch,
  });
  await expect(client.me.get()).rejects.toBeInstanceOf(Elmo.RateLimitError);
  expect(api.requests).toHaveLength(2);
});

it('sends a call once with retry off', async () => {
  const api = standIn([{ headers: { 'retry-after': '0' }, status: 429 }]);
  const client = new Elmo({
    apiKey: 'elmo_test',
    retry: false,
    fetch: api.fetch,
  });
  await expect(client.me.get()).rejects.toBeInstanceOf(Elmo.RateLimitError);
  expect(api.requests).toHaveLength(1);
});
