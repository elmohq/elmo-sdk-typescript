import { isStreamed } from '../core/body';
import { safeAddress, unsendableAddress } from '../core/errors';
import { metadataHeaders } from '../core/metadata';
import type { PreparedRequest, Transport } from '../core/types';

/** A `fetch` function, called with the full address and a built `RequestInit`. */
export type Fetch = (input: string, init: RequestInit) => Promise<Response>;

/** What `fetch` takes, less what the client sets itself. */
export interface FetchOptions extends RequestInit {
  /** Set by the client. */
  body?: never;
  /** Set by the client. Pass `headers` to the call. */
  headers?: never;
  /** Set by the client. */
  method?: never;
  /** Set by the client. Pass `signal` to the call. */
  signal?: never;
}

function checkAddress(address: string): void {
  let url: URL;
  try {
    url = new URL(address, (globalThis as { location?: { href: string } }).location?.href);
  } catch {
    throw unsendableAddress(
      safeAddress(address),
      'is not a full address',
      'Start the base URL with `https://`.',
    );
  }
  const shown = `${url.protocol}//${url.host}${url.pathname}`;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw unsendableAddress(
      shown,
      `uses \`${url.protocol}\`, which fetch does not send`,
      'Start the base URL with `https://`.',
    );
  }
  if (url.username || url.password) {
    throw unsendableAddress(
      shown,
      'holds a user name or password, which fetch refuses',
      'Pass the credential as an option instead.',
    );
  }
}

const OWNED = ['body', 'headers', 'method', 'signal'] as const;

function extraInit(request: PreparedRequest<string>): RequestInit | undefined {
  const extra = request.options['fetchOptions'] as RequestInit | undefined;
  if (!extra) return undefined;
  const rest: RequestInit = { ...extra };
  for (const key of OWNED) delete rest[key];
  return rest;
}

function toRequestInit(request: PreparedRequest<string>): RequestInit {
  return {
    ...extraInit(request),
    ...(request.body !== undefined && { body: request.body }),
    ...(isStreamed(request.body) && { duplex: 'half' }),
    headers: metadataHeaders(request.meta),
    method: (request.callable.method ?? 'get').toUpperCase(),
    ...(request.signal !== undefined && { signal: request.signal }),
  };
}

export function createFetchTransport(fetchFn?: Fetch): Transport<string, 'unary'> {
  function send(request: PreparedRequest<string>): Promise<Response> {
    const configured = request.options['fetch'] as Fetch | undefined;
    const call = configured ?? fetchFn ?? globalThis.fetch;
    if (call === globalThis.fetch) checkAddress(request.address);
    return call(request.address, toRequestInit(request));
  }

  return {
    name: 'fetch',
    unary: send,
  };
}
