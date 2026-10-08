import { toText } from '../../core/text';

export function encodeValue(value: unknown): string {
  return encodeURIComponent(toText(value));
}

export function encodeName(name: string): string {
  return encodeURIComponent(name).replace(/%5B/g, '[').replace(/%5D/g, ']');
}
