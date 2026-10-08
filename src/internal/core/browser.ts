import { ElmoError } from './errors';
import type { ResolvedOptions } from './types';

export function refuseBrowser(options: ResolvedOptions): void {
  if (options['dangerouslyAllowBrowser'] === true) return;
  const scope = globalThis as { document?: unknown; window?: unknown };
  if (scope.window === undefined || scope.document === undefined) return;
  throw new ElmoError(
    'This client was built in a browser, where every visitor to the page can read the credential it sends. Build it on a server instead. If the credential is meant to be public, or a proxy adds it, pass `dangerouslyAllowBrowser: true`.',
  );
}
