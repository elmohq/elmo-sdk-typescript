import { Elmo, ElmoError } from '@elmohq/sdk';
import { expect, it, vi } from 'vitest';

import { standIn, success, unanswered } from './stand-in';

it('builds the client', () => {
  expect(new Elmo({ apiKey: 'test' })).toBeInstanceOf(Elmo);
});

it('sends calls to the base URL it was given', async () => {
  const api = standIn([success]);
  const client = new Elmo({
    apiKey: 'test',
    baseURL: 'https://api.test/v1',
    fetch: api.fetch,
  });
  await client.me.get();
  expect(api.requests[0].url).toMatch(/^https:\/\/api\.test\/v1\//);
});

it('sends the headers it was given with every call', async () => {
  const api = standIn([success]);
  const client = new Elmo({
    apiKey: 'test',
    defaultHeaders: { 'x-test': 'test' },
    fetch: api.fetch,
  });
  await client.me.get();
  expect(api.requests[0].headers.get('x-test')).toBe('test');
});

it('sends no content type with a call that has no body', async () => {
  const api = standIn([success]);
  const client = new Elmo({ apiKey: 'test', fetch: api.fetch });
  await client.me.get();
  expect(api.requests[0].headers.has('content-type')).toBe(false);
});

it('throws an abort, not a timeout, when the caller calls it off', async () => {
  const client = new Elmo({
    apiKey: 'test',
    fetch: unanswered,
    retry: false,
  });
  const controller = new AbortController();
  const pending = client.me.get({ signal: controller.signal }).catch((error: unknown) => error);
  controller.abort();
  const error = await pending;
  expect(error).toBeInstanceOf(Elmo.AbortError);
  expect(error).not.toBeInstanceOf(Elmo.TimeoutError);
});

it('throws an abort when the caller calls it off as the reply arrives', async () => {
  const api = standIn([success]);
  const controller = new AbortController();
  const client = new Elmo({
    apiKey: 'test',
    fetch: (input: string, init: RequestInit) => {
      controller.abort();
      return api.fetch(input, init);
    },
    retry: false,
  });
  await expect(client.me.get({ signal: controller.signal })).rejects.toBeInstanceOf(
    Elmo.AbortError,
  );
  expect(api.requests).toHaveLength(1);
});

it('refuses to be built in a browser', async () => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', {});
  expect(() => {
    new Elmo({ apiKey: 'test' });
  }).toThrow(ElmoError);
  expect(() => {
    new Elmo({ apiKey: 'test', dangerouslyAllowBrowser: true });
  }).not.toThrow();
});

it('sends the credential in the authorization header', async () => {
  const api = standIn([success]);
  const client = new Elmo({ apiKey: 'test', fetch: api.fetch });
  await client.me.get();
  expect(api.requests[0].headers.get('authorization')).toContain('test');
});

it('reads the credential from ELMO_API_KEY', async () => {
  vi.stubEnv('ELMO_API_KEY', 'test');
  const api = standIn([success]);
  const client = new Elmo({ fetch: api.fetch });
  await client.me.get();
  expect(api.requests[0].headers.get('authorization')).toContain('test');
});
