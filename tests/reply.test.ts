import { Elmo } from '@elmohq/sdk';
import { expect, it } from 'vitest';

import { standIn, success } from './stand-in';

it('hands back the reply with what it decoded', async () => {
  const api = standIn([{ ...success, headers: { 'x-test': 'test' } }]);
  const client = new Elmo({ apiKey: 'test', fetch: api.fetch });
  const { response } = await client.me.get().withResponse();
  expect(response.status).toBe(200);
  expect(response.headers.get('x-test')).toBe('test');
});

it('hands back a reply with no body unread', async () => {
  const api = standIn([{ status: 204 }]);
  const client = new Elmo({ apiKey: 'test', fetch: api.fetch });
  const response = await client.me.get().asResponse();
  expect(response.status).toBe(204);
  expect(response.body).toBeNull();
});

it('sends a call again when its reply breaks off', async () => {
  const api = standIn([{ cut: 'broken', status: 200 }]);
  const client = new Elmo({
    apiKey: 'test',
    retry: { delay: 0, maxRetries: 1 },
    fetch: api.fetch,
  });
  await expect(client.me.get()).rejects.toBeInstanceOf(Elmo.TransportError);
  expect(api.requests).toHaveLength(2);
});

it('throws a decode error when a success has no body', async () => {
  const api = standIn([{ status: 200 }]);
  const client = new Elmo({ apiKey: 'test', fetch: api.fetch });
  await expect(client.me.get()).rejects.toBeInstanceOf(Elmo.DecodeError);
  expect(api.requests).toHaveLength(1);
});
