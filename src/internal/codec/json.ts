import { NO_BODY, readText } from './registry';
import { ElmoError } from '../core/errors';
import type { Codec } from '../core/types';

function finite(value: number): number {
  if (!Number.isFinite(value)) {
    throw new ElmoError('NaN and Infinity cannot be written as JSON.');
  }
  return value;
}

function refused(value: unknown): ElmoError {
  const name =
    typeof value === 'object' && value !== null
      ? (value.constructor?.name ?? 'Object')
      : typeof value;
  return new ElmoError(`A value of type ${name} cannot be written as JSON.`);
}

function mapKey(key: unknown): string {
  if (typeof key === 'number') return String(finite(key));
  if (typeof key === 'string' || typeof key === 'boolean' || typeof key === 'bigint') {
    return String(key);
  }
  throw refused(key);
}

function jsonValue(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return finite(value);
  if (typeof value !== 'object' || value === null) return value;
  if (value instanceof Set) return [...value];
  if (value instanceof Map) {
    return Object.fromEntries([...value].map(([key, item]) => [mapKey(key), item]));
  }
  if (
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  ) {
    throw refused(value);
  }
  return value;
}

export function jsonText(value: unknown): string {
  try {
    return JSON.stringify(value, jsonValue);
  } catch (error) {
    if (error instanceof ElmoError) throw error;
    throw new ElmoError(`A value cannot be written as JSON: ${(error as Error).message}`, {
      cause: error,
    });
  }
}

export const jsonCodec: Codec = {
  contentType: 'application/json',
  decode: async (raw) => {
    const text = await readText(raw, true);
    return text === '' ? NO_BODY : JSON.parse(text);
  },
  encode: jsonText,
  mediaTypes: ['application/json'],
  name: 'json',
};
