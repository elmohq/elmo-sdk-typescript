import { Elmo } from '@elmohq/sdk';
import { expect, it, vi } from 'vitest';

import { recorder, standIn, success } from './stand-in';

it('logs nothing unless asked to', async () => {
  vi.stubEnv('ELMO_LOG', undefined);
  const log = recorder();
  const api = standIn([success]);
  const client = new Elmo({
    apiKey: 'test',
    logger: log.logger,
    fetch: api.fetch,
  });
  await client.me.get();
  expect(log.lines).toEqual([]);
});

it('never logs the credential', async () => {
  const log = recorder();
  const api = standIn([success]);
  const client = new Elmo({
    apiKey: 'test',
    logLevel: 'debug',
    logger: log.logger,
    fetch: api.fetch,
  });
  await client.me.get();
  expect(log.lines).not.toEqual([]);
  expect(log.lines.join('\n')).not.toContain('test');
});
