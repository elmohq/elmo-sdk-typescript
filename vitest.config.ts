import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@elmohq/sdk': fileURLToPath(new URL('./src/index.ts', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    typecheck: { enabled: true, include: ['tests/**/*.test-d.ts'] },
    unstubEnvs: true,
    unstubGlobals: true,
    exclude: ['tests/build.test.ts', 'tests/live.test.ts', 'tests/readme.test.ts'],
  },
});
