import { Elmo } from '@elmohq/sdk';
import { expect, it } from 'vitest';

it('answers a call on the live API', async () => {
  const client = new Elmo();
  const { response } = await client.me.get().withResponse();
  expect(response.status).toBe(200);
});
