import type { CredentialSpec, ResolvedOptions } from './types';

export function impliedEnvironment(..._tokens: ReadonlyArray<unknown>): undefined {
  return undefined;
}

export function readEnv(name: string): string | undefined {
  const global = globalThis as {
    Deno?: { env?: { get?: (name: string) => string | undefined } };
    process?: { env?: Record<string, string | undefined> };
  };
  const value = global.process?.env?.[name] ?? global.Deno?.env?.get?.(name);
  return value?.trim() || undefined;
}

function readable(credentials: Readonly<Record<string, CredentialSpec>>): ReadonlyArray<string> {
  return Object.keys(credentials).filter(
    (name) => credentials[name]!.variable && credentials[name]!.option !== false,
  );
}

export function envDefaults(
  base: ResolvedOptions,
  env: Readonly<Record<string, string>> = {},
  credentials: Readonly<Record<string, CredentialSpec>> = {},
): ResolvedOptions {
  const reads = new WeakMap<object, ResolvedOptions>();
  const held = readable(credentials);

  function resolve(): ResolvedOptions {
    const read: ResolvedOptions = {};
    for (const [option, variable] of Object.entries(env)) {
      const value = readEnv(variable) ?? base[option];
      if (value !== undefined) read[option] = value;
    }
    if (held.length) {
      const tokens: Record<string, string | undefined> = {};
      for (const name of held) tokens[name] = readEnv(credentials[name]!.variable!);
      Object.assign(read, tokens);
      const environment = impliedEnvironment(tokens, credentials) ?? base.environment;
      if (environment !== undefined) read.environment = environment;
    }
    return read;
  }

  function resolvedFor(holder: object): ResolvedOptions {
    let read = reads.get(holder);
    if (!read) {
      read = resolve();
      reads.set(holder, read);
    }
    return read;
  }

  const decided = [...Object.keys(env), ...held, ...(held.length ? ['environment'] : [])];

  const defaults = { ...base };
  for (const key of decided) {
    Object.defineProperty(defaults, key, {
      configurable: true,
      enumerable: true,
      get() {
        return resolvedFor(this as object)[key];
      },
    });
  }
  return defaults;
}
