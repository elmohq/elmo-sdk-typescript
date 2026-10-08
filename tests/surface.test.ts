import { VERSION } from '@elmohq/sdk';
import { expect, it } from 'vitest';

import manifest from '../package.json';

it('reports the version its manifest states', () => {
  expect(VERSION).toBe(manifest.version);
});
