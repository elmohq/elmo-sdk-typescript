import { Elmo } from '@elmohq/sdk';
import { expect, it } from 'vitest';

import { standIn } from './stand-in';

it.each([
  [400, Elmo.BadRequestError],
  [401, Elmo.AuthenticationError],
  [402, Elmo.PaymentRequiredError],
  [403, Elmo.PermissionDeniedError],
  [404, Elmo.NotFoundError],
  [409, Elmo.ConflictError],
  [422, Elmo.UnprocessableEntityError],
  [429, Elmo.RateLimitError],
  [500, Elmo.InternalServerError],
])('throws the class named for the status %i', async (status, error) => {
  const api = standIn([{ status }]);
  const client = new Elmo({
    apiKey: 'elmo_test',
    retry: false,
    fetch: api.fetch,
  });
  await expect(client.me.get()).rejects.toBeInstanceOf(error);
});
