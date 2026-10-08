import type { CredentialSpec, ResolvedOptions } from './types';

const LAYER_ALIASES: Readonly<Record<string, string>> = {
  defaultHeaders: 'headers',
  defaultPath: 'path',
  defaultQuery: 'query',
};

export function applyAliases(
  config: Partial<ResolvedOptions>,
  aliases: Readonly<Record<string, string>> | undefined,
): Partial<ResolvedOptions> {
  let applied: Record<string, unknown> | undefined;
  for (const [alias, canonical] of Object.entries(
    aliases ? { ...LAYER_ALIASES, ...aliases } : LAYER_ALIASES,
  )) {
    if (!(alias in config)) continue;
    applied ??= { ...config };
    if (applied[canonical] === undefined) applied[canonical] = applied[alias];
    delete applied[alias];
  }

  return (applied as Partial<ResolvedOptions> | undefined) ?? config;
}

export function applyCredentials(
  config: Partial<ResolvedOptions>,
  credentials: Readonly<Record<string, CredentialSpec>> | undefined,
): Partial<ResolvedOptions> {
  if (!credentials) return config;

  let applied: Record<string, unknown> | undefined;
  for (const [name, spec] of Object.entries(credentials)) {
    if (spec.option === false || config[name] !== undefined || !(name in config)) continue;
    applied ??= { ...config };
    delete applied[name];
  }

  return (applied as Partial<ResolvedOptions> | undefined) ?? config;
}
