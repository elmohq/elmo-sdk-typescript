import { refusedInput } from '../core/errors';
import type { Feature, InputRule, ResolvedOptions } from '../core/types';

const COUNTED = { characters: 'character', entries: 'entry', items: 'item' } as const;

function brokenBound(rule: InputRule, size: bigint | number): [string, number] | undefined {
  if (rule.min !== undefined && size < rule.min) return ['at least', rule.min];
  if (rule.max !== undefined && size > rule.max) return ['at most', rule.max];
  if (rule.above !== undefined && size <= rule.above) return ['more than', rule.above];
  if (rule.below !== undefined && size >= rule.below) return ['less than', rule.below];
  return undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function inputOf(options: ResolvedOptions, name: string | undefined): unknown {
  if (name === undefined) return options.body;
  return isPlainObject(options.body) ? options.body[name] : undefined;
}

function sizeOf(value: unknown, of: InputRule['of']): bigint | number | undefined {
  if (of === undefined) {
    return typeof value === 'number' || typeof value === 'bigint' ? value : undefined;
  }
  if (of === 'characters') return typeof value === 'string' ? Array.from(value).length : undefined;
  if (of === 'items') return Array.isArray(value) ? value.length : undefined;
  if (!isPlainObject(value)) return undefined;
  return Object.values(value).filter((entry) => entry !== undefined).length;
}

export function rulesFeature(): Feature {
  return {
    name: 'rules',
    onOptions(options, callable) {
      for (const rule of callable.rules ?? []) {
        const size = sizeOf(inputOf(options, rule.name), rule.of);
        if (size === undefined) continue;
        const broken = brokenBound(rule, size);
        if (!broken) continue;
        const [bound, limit] = broken;
        const held = rule.name === undefined ? 'The request body' : `\`${rule.name}\``;
        const stated =
          rule.of === undefined
            ? `is ${bound} ${limit}`
            : `takes ${bound} ${limit} ${limit === 1 ? COUNTED[rule.of] : rule.of}`;
        throw refusedInput(held, stated, size);
      }
    },
  };
}
