import { Elmo } from '@elmohq/sdk';
import { expectTypeOf, it } from 'vitest';

const client = new Elmo({ apiKey: 'test' });

it('returns the reply each call declares', async () => {
  expectTypeOf(await client.me.get()).toEqualTypeOf<Elmo.APIKeyIdentity>();
  expectTypeOf(await client.models.list()).toEqualTypeOf<Elmo.ModelList>();
});

it('refuses a call without the arguments it needs', () => {
  // @ts-expect-error
  client.brands.create();
  // @ts-expect-error
  client.brands.get();
  // @ts-expect-error
  client.brands.update();
  // @ts-expect-error
  client.brands.analytics.get();
  // @ts-expect-error
  client.brands.citations.domains.list();
  // @ts-expect-error
  client.brands.citations.urls.list();
  // @ts-expect-error
  client.brands.opportunities.get();
  // @ts-expect-error
  client.brands.promptPerformance.list();
  // @ts-expect-error
  client.brands.queryFanout.get();
  // @ts-expect-error
  client.brands.tags.list();
  // @ts-expect-error
  client.competitors.create();
  // @ts-expect-error
  client.competitors.delete();
  // @ts-expect-error
  client.competitors.get();
  // @ts-expect-error
  client.competitors.update();
  // @ts-expect-error
  client.organizations.get();
  // @ts-expect-error
  client.organizations.billing.get();
  // @ts-expect-error
  client.prompts.create();
  // @ts-expect-error
  client.prompts.delete();
  // @ts-expect-error
  client.prompts.get();
  // @ts-expect-error
  client.prompts.update();
  // @ts-expect-error
  client.prompts.runs.list();
  // @ts-expect-error
  client.prompts.runs.get();
  // @ts-expect-error
  client.prompts.snapshot.get();
  // @ts-expect-error
  client.reports.create();
  // @ts-expect-error
  client.reports.get();
  // @ts-expect-error
  client.tools.analyze();
});
