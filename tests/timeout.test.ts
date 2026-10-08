import { Elmo } from '@elmohq/sdk';
import { expect, it } from 'vitest';

import { standIn, unanswered } from './stand-in';

it('throws when the API does not answer in time', async () => {
  const client = new Elmo({
    apiKey: 'test',
    fetch: unanswered,
    retry: false,
    timeout: 10,
  });
  await expect(client.me.get()).rejects.toBeInstanceOf(Elmo.TimeoutError);
});

it('throws a timeout when its reply stops arriving', async () => {
  const api = standIn([{ cut: 'stalled', status: 200 }]);
  const client = new Elmo({
    apiKey: 'test',
    retry: false,
    timeout: 10,
    fetch: api.fetch,
  });
  await expect(client.me.get()).rejects.toBeInstanceOf(Elmo.TimeoutError);
  expect(api.requests).toHaveLength(1);
});
