import { encodeName, encodeValue } from './path';
import { emptyPathParameter } from '../../core/errors';
import { scalarText } from '../../core/text';
import type { SerializationDescriptor } from '../../core/types';

export type BuildURL = (args: {
  address: string;
  baseURL?: string | undefined;
  path?: Record<string, unknown> | undefined;
  query?: Record<string, unknown> | undefined;
  serialization?: SerializationDescriptor | undefined;
}) => string;

const NAMED_PATH_PARAM_RE = /\{([^{}]+)\}/g;

const ABSOLUTE_URL_RE = /^[a-z][a-z\d+.-]*:\/\//i;

function joinPath(base: string, path: string): string {
  return base.endsWith('/') && path.startsWith('/') ? base + path.slice(1) : base + path;
}

export function joinURL(baseURL: string | undefined, path: string): string {
  const base = baseURL ?? '';
  const hash = base.indexOf('#');
  const kept = hash === -1 ? base : base.slice(0, hash);
  const mark = kept.indexOf('?');
  if (mark === -1) return joinPath(kept, path);

  const joined = joinPath(kept.slice(0, mark), path);
  const query = kept.slice(mark + 1);
  if (!query) return joined;
  return `${joined}${joined.includes('?') ? '&' : '?'}${query}`;
}

function addressURL(address: string, baseURL: string | undefined): string {
  const absolute = ABSOLUTE_URL_RE.test(address);
  const pathURL = absolute || address.startsWith('/') ? address : `/${address}`;
  return absolute ? pathURL : joinURL(baseURL, pathURL);
}

function pathValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(encodeValue).join(',');
  if (typeof value === 'object' && value !== null && scalarText(value) === undefined) {
    return Object.entries(value)
      .flatMap(([key, item]) => [encodeURIComponent(key), encodeValue(item)])
      .join(',');
  }
  return encodeValue(value);
}

function filledURL(
  address: string,
  baseURL: string | undefined,
  path: Record<string, unknown> | undefined,
): string {
  const url = addressURL(address, baseURL);
  if (!path) return url;
  return url.replace(NAMED_PATH_PARAM_RE, (_match, name: string) => {
    const value = path[name];
    if (value === undefined || value === null || value === '') {
      throw emptyPathParameter(name, address);
    }
    return pathValue(value);
  });
}

function withQuery(url: string, query: Record<string, unknown> | undefined): string {
  if (!query) return url;

  const search: Array<string> = [];
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          search.push(`${encodeName(name)}=${encodeValue(item)}`);
        }
      }
      continue;
    }
    if (typeof value === 'object' && scalarText(value) === undefined) {
      for (const [key, item] of Object.entries(value)) {
        if (item !== undefined && item !== null) {
          search.push(`${encodeName(key)}=${encodeValue(item)}`);
        }
      }
      continue;
    }
    search.push(`${encodeName(name)}=${encodeValue(value)}`);
  }

  if (!search.length) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${search.join('&')}`;
}

export const simpleURL: BuildURL = ({ address, baseURL, path, query }) =>
  withQuery(filledURL(address, baseURL, path), query);
