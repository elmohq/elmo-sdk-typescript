import { mergeMetadata } from './metadata';
import type { ResolvedOptions } from './types';

type Layers = ReadonlyArray<Partial<ResolvedOptions> | undefined>;

export function foldRetry(sources: Layers, merged: ResolvedOptions): ResolvedOptions {
  if (!sources.some((source) => source?.['retry'] !== undefined)) return merged;
  let retry: unknown;
  for (const source of sources) {
    const own = source?.['retry'];
    const count = source?.['maxRetries'];
    const counted = typeof count === 'number' && Number.isFinite(count);
    if (own === false) {
      retry = false;
    } else if (own !== undefined || counted) {
      const rules: Record<string, unknown> = {
        ...(typeof retry === 'object' && retry),
        ...(typeof own === 'object' && own),
      };
      if (counted && (typeof own !== 'object' || !own || !('maxRetries' in own))) {
        rules['maxRetries'] = count;
      }
      retry = rules;
    }
  }
  merged['retry'] = retry;
  delete merged['maxRetries'];
  return merged;
}

const MERGED_LAYERS = ['path', 'query'] as const;

export function mergeLayers(sources: Layers, merged: ResolvedOptions): ResolvedOptions {
  for (const key of MERGED_LAYERS) {
    const layers = sources.filter((source) => source?.[key]);
    if (!layers.length) continue;
    const layer: Record<string, unknown> = {};
    for (const source of layers) {
      for (const [name, value] of Object.entries(source![key] as Record<string, unknown>)) {
        if (value !== undefined) layer[name] = value;
      }
    }
    merged[key] = layer;
  }
  return merged;
}

function merge(
  sources: ReadonlyArray<Partial<ResolvedOptions> | undefined>,
  keepAccessors: boolean,
): ResolvedOptions {
  const merged: ResolvedOptions = {};
  for (const source of sources) {
    if (!source) continue;
    if (keepAccessors) {
      for (const [key, held] of Object.entries(Object.getOwnPropertyDescriptors(source))) {
        if (held.get || held.value !== undefined) Object.defineProperty(merged, key, held);
      }
    } else {
      for (const key of Object.keys(source)) {
        const value = source[key];
        if (value !== undefined) merged[key] = value;
      }
    }
  }
  merged.headers = mergeMetadata(...sources.map((source) => source?.headers));
  return foldRetry(sources, mergeLayers(sources, merged));
}

export function mergeConfigs(...sources: ReadonlyArray<Partial<ResolvedOptions> | undefined>) {
  return merge(sources, false);
}

export function createConfig(overrides: Partial<ResolvedOptions> = {}): ResolvedOptions {
  return mergeConfigs({ errors: 'throw', headers: {} }, overrides);
}

export function baseURLOf(options: ResolvedOptions, fallback?: string): string | undefined {
  return options.baseURL ?? fallback;
}

export function mergeDefaults(...sources: ReadonlyArray<Partial<ResolvedOptions> | undefined>) {
  return merge(sources, true);
}
