import { retryAfterDelay } from './backoff';
import type { Interaction } from './types';
import type { Error as ErrorSchema } from '../../types/shared/error';

/** The base of every error this SDK throws, including one from a call that never arrived. */
export class ElmoError extends Error {
  /** The class's name. Compare it where `instanceof` fails, such as across two copies of this SDK. */
  override name: string = 'ElmoError';
}

export function refusedInput(held: string, rule: string, got: bigint | number) {
  return new ElmoError(`${held} ${rule}, and got ${got}, so the request was not sent.`);
}

/** Thrown before the request goes out, when no credential satisfied the call. */
export class MissingCredentialError extends ElmoError {
  override readonly name = 'MissingCredentialError';
  /** Credential options that would have satisfied the call. */
  readonly schemes: ReadonlyArray<string>;

  constructor(message: string, schemes: ReadonlyArray<string> = []) {
    super(message);
    this.schemes = schemes;
  }
}

export function unsendable(held: string): string {
  return `${held} holds a line break or another character a header cannot carry, so the request was not sent.`;
}

/**
 * Thrown when the caller called the request off before the API answered.
 *
 * Not a {@link TransportError}, so code that retries or reports a failed
 * connection leaves a call the caller cancelled alone.
 */
export class AbortError extends ElmoError {
  constructor(cause?: unknown) {
    super('The request was called off before the API answered.', { cause });
    this.name = 'AbortError';
  }
}

/** Which way a {@link TransportError} failed. `connect` and `other` have no class of their own. */
export type TransportErrorKind = 'connect' | 'other' | 'timeout';

const TRANSPORT_MESSAGES: Readonly<Record<TransportErrorKind, string>> = {
  connect: 'The request never reached the API.',
  other: 'The connection failed before the whole reply arrived.',
  timeout: 'The API did not answer in time.',
};

/**
 * A request that got no whole reply, as its transport states it.
 *
 * A transport rejects with one, or with a {@link TransportError} built from
 * one. Any other rejection is read by its name and code.
 */
export interface TransportFailure {
  /** `true` where the request was called off, not lost. */
  aborted: boolean;
  /** What the library underneath threw. */
  cause?: unknown;
  /**
   * Whether the API can have acted on the request. After `'no'`, the call is
   * safe to send again, whatever its method.
   */
  reachedServer: 'maybe' | 'no' | 'yes';
  /** How far the request got. */
  stage: 'connect' | 'receive' | 'resolve' | 'send' | 'tls';
}

/** Thrown when no whole answer arrived, so there is no reply to go on. */
export class TransportError extends ElmoError {
  readonly kind: TransportErrorKind;
  /**
   * Whether the API can have acted on the request. After `'no'`, the call is
   * safe to send again, whatever its method.
   */
  readonly reachedServer: TransportFailure['reachedServer'];
  /** How far the request got. */
  readonly stage: TransportFailure['stage'];

  constructor(failure: TransportErrorKind | TransportFailure, cause?: unknown, message?: string) {
    const unreached = failure === 'connect';
    const stated: Omit<TransportFailure, 'aborted'> =
      typeof failure === 'string'
        ? {
            cause,
            reachedServer: unreached ? 'no' : 'maybe',
            stage: unreached ? 'connect' : 'receive',
          }
        : failure;
    const kind =
      typeof failure === 'string' ? failure : failure.reachedServer === 'no' ? 'connect' : 'other';
    super(message ?? TRANSPORT_MESSAGES[kind], stated);
    this.kind = kind;
    this.name = 'TransportError';
    this.reachedServer = stated.reachedServer;
    this.stage = stated.stage;
  }
}

export function calledOffWith(reason: unknown): AbortError | TransportError {
  return reason instanceof AbortError || reason instanceof TransportError
    ? reason
    : new AbortError(reason);
}

const TIMEOUT_CODES: ReadonlyArray<string> = ['ECONNABORTED', 'ETIMEDOUT'];

function codeOf(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current instanceof Error && depth < 5; depth++) {
    const { code } = current as { code?: unknown };
    if (typeof code === 'string') return code;
    current = current.cause;
  }
  return undefined;
}

const UNREACHED: Readonly<Record<string, TransportFailure['stage']>> = {
  EAI_AGAIN: 'resolve',
  ECONNREFUSED: 'connect',
  ENOTFOUND: 'resolve',
  UND_ERR_CONNECT_TIMEOUT: 'connect',
};

export function failureOf(error: unknown): TransportFailure {
  const stated = (error ?? {}) as TransportFailure;
  if (stated.reachedServer && stated.stage) return stated;
  const stage = UNREACHED[codeOf(error) ?? ''];
  return {
    aborted: error instanceof Error && error.name === 'AbortError',
    cause: error,
    reachedServer: stage ? 'no' : 'maybe',
    stage: stage ?? 'receive',
  };
}

export function classifyError(error: unknown): TransportErrorKind | 'abort' {
  if (error instanceof TransportError) return error.kind;
  const failure = failureOf(error);
  if (failure.aborted) return 'abort';
  if (error instanceof Error && error.name === 'TimeoutError') return 'timeout';
  if (failure.reachedServer === 'no') return 'connect';
  return TIMEOUT_CODES.includes(codeOf(error) ?? '') ? 'timeout' : 'other';
}

const USERINFO_RE = /^([a-z][a-z\d+.-]*:\/\/)[^/?#@]*@/i;

export function safeAddress(url: string): string {
  return (url.split('?')[0] ?? '').replace(USERINFO_RE, '$1');
}

/**
 * Thrown when a call waited on the API for as long as it allowed, from sending
 * the request to the last byte of the reply.
 *
 * A reply with status 408 is an {@link APIError}, not one of these.
 */
export class TimeoutError extends TransportError {
  /** Milliseconds the call was allowed to wait on the API. */
  readonly timeoutMs: number | undefined;

  constructor(timeout?: number, cause?: unknown, target?: string) {
    super(
      'timeout',
      cause,
      timeout === undefined
        ? TRANSPORT_MESSAGES.timeout
        : `${target ?? 'The request'} timed out after ${timeout} ms waiting on the API. Pass a larger \`timeout\` with the call, or \`timeout: false\` to wait as long as it takes.`,
    );
    this.name = 'TimeoutError';
    this.timeoutMs = timeout;
  }
}

/** The body of a failure, as the API description declares it. */
export type FailureBody = ErrorSchema;

const CODE_KEYS: ReadonlyArray<string> = [
  'code',
  'error_code',
  'errorCode',
  'error_type',
  'errorType',
];

function statedCode(bag: Record<string, unknown>): string | number | undefined {
  for (const key of CODE_KEYS) {
    const value = bag[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return value;
  }
  return undefined;
}

function describeCode(error: unknown): string | number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const body = error as Record<string, unknown>;
  const direct = statedCode(body);
  if (direct !== undefined) return direct;

  for (const value of Object.values(body)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = statedCode(value as Record<string, unknown>);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

const MAX_MESSAGE_BODY = 200;

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function shorten(text: string): string {
  const line = oneLine(text);
  if (line.length <= MAX_MESSAGE_BODY) return line;
  const cut = line.slice(0, MAX_MESSAGE_BODY);
  const space = cut.lastIndexOf(' ');
  const kept = space > MAX_MESSAGE_BODY / 2 ? cut.slice(0, space) : cut;
  return `${kept.trimEnd()}…`;
}

const MESSAGE_KEYS: ReadonlyArray<string> = [
  'message',
  'error_message',
  'errorMessage',
  'error',
  'detail',
  'title',
  'description',
];

function statedMessage(bag: Record<string, unknown>): string | undefined {
  for (const key of MESSAGE_KEYS) {
    const value = bag[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function describeStatedFailure(error: unknown): string | undefined {
  if (typeof error === 'string') return shorten(error.trim()) || undefined;
  if (!error || typeof error !== 'object') return undefined;

  const body = error as Record<string, unknown>;
  const direct = statedMessage(body);
  if (direct) return shorten(direct);

  for (const value of Object.values(body)) {
    if (value && typeof value === 'object') {
      const nested = statedMessage(value as Record<string, unknown>);
      if (nested) return shorten(nested);
    }
  }

  const json = JSON.stringify(error);
  return json && json !== '{}' && json !== '[]' ? shorten(json) : undefined;
}

export function isStructured(body: unknown): boolean {
  return typeof body === 'object' && body !== null && !(body instanceof Blob);
}

const REQUEST_ID_FALLBACKS: ReadonlyArray<string> = ['x-correlation-id', 'cf-ray'];

const REQUEST_ID_NAME = /(?:^|-)request-?id$/;

export function requestIdOf(response: Response): string | undefined {
  let named: string | undefined;
  response.headers.forEach((value, name) => {
    if (!named && value && REQUEST_ID_NAME.test(name)) named = value;
  });
  if (named) return named;
  for (const header of REQUEST_ID_FALLBACKS) {
    const value = response.headers.get(header);
    if (value) return value;
  }
  return undefined;
}

/** A failure the API answered with, so there is a status and a reply to read. */
export class APIError<TBody = FailureBody> extends ElmoError {
  /**
   * The decoded failure body. `undefined` where the reply carried none, or
   * carried text such as a proxy's page, which is in {@link APIError.text}.
   */
  readonly body: TBody | undefined;
  /** The API's own error code, read from the failure body. `undefined` where it carried none. */
  readonly code: string | number | undefined;
  readonly headers: Headers;
  /** The request id to quote when reporting this failure. */
  readonly requestId: string | undefined;
  /**
   * The reply that carried this failure. Its body is already read, so take it
   * from {@link APIError.body} or {@link APIError.text}.
   */
  readonly response: Response;
  /** Milliseconds the API asked to wait before trying again. */
  readonly retryAfterMs: number | undefined;
  readonly status: number;
  /**
   * The failure body where the API sent text rather than JSON, such as a
   * proxy's page. The message holds only its start.
   */
  readonly text: string | undefined;

  constructor(status: number, body: unknown, response: Response, note?: string) {
    const reason = response.statusText ? `${status} ${response.statusText}` : `${status}`;
    const requestId = requestIdOf(response);
    const url = response.url ? ` for "${safeAddress(response.url)}"` : '';
    const where = requestId ? `${url} (request id "${requestId}")` : url;
    const said = describeStatedFailure(body);
    const tail = note
      ? `. ${note}${said ? ` The API said: ${said}` : ''}`
      : said
        ? `: ${said}`
        : '.';
    super(`The API answered ${reason}${where}${tail}`);
    this.body = isStructured(body) ? (body as TBody) : undefined;
    this.code = describeCode(body);
    this.headers = response.headers;
    this.name = 'APIError';
    this.requestId = requestId;
    this.response = response;
    this.retryAfterMs = retryAfterDelay(response);
    this.status = status;
    this.text = typeof body === 'string' ? body : undefined;
  }
}

export class UnsupportedInteractionError extends ElmoError {
  readonly interaction: Interaction;
  readonly transport: string;

  constructor(transport: string, interaction: Interaction) {
    super(`Transport "${transport}" cannot send this call. It has no "${interaction}" method.`);
    this.interaction = interaction;
    this.name = 'UnsupportedInteractionError';
    this.transport = transport;
  }
}

export function unansweredError(error: unknown): ElmoError {
  if (error instanceof ElmoError) return error;
  const kind = classifyError(error);
  if (kind === 'abort') return new AbortError(error);
  if (kind === 'timeout') return new TimeoutError(undefined, error);
  return new TransportError(failureOf(error));
}

export function unsendableHeader(name: string) {
  return new ElmoError(unsendable(`Header \`${name}\``));
}

export function unsendableAddress(address: string, problem: string, fix: string) {
  return new ElmoError(`"${address}" ${problem}, so the request was not sent. ${fix}`);
}

/** A reply from the API that this SDK could not read, whatever its status. */
export class DecodeError extends ElmoError {
  /** Where the value sat, or absent where the whole reply failed. */
  readonly at: string | undefined;
  /** The request id to quote when reporting this failure. */
  readonly requestId: string | undefined;
  /** The reply. Its body is already read. */
  readonly response: Response | undefined;
  /** The reply's status. `undefined` where there is no {@link DecodeError.response}. */
  readonly status: number | undefined;
  /** What the API sent. The message holds only a short form of it. */
  readonly value: unknown;

  constructor(
    message: string,
    options: {
      at?: string | undefined;
      cause?: unknown;
      response?: Response | undefined;
      value?: unknown;
    } = {},
  ) {
    const requestId = options.response && requestIdOf(options.response);
    super(requestId ? `${message} The request id is "${requestId}".` : message, {
      cause: options.cause,
    });
    this.at = options.at;
    this.name = 'DecodeError';
    this.requestId = requestId;
    this.response = options.response;
    this.status = options.response?.status;
    this.value = options.value;
  }
}

export function emptyPathParameter(name: string, url: string) {
  return new ElmoError(
    `Path parameter \`${name}\` is empty. \`${url}\` cannot be sent without it.`,
  );
}

function sent(value: unknown): string {
  if (value === undefined) return 'nothing';
  if (typeof value === 'string') return `"${shorten(value)}"`;
  if (value === null || typeof value !== 'object') return shorten(String(value));
  try {
    return shorten(JSON.stringify(value) ?? String(value));
  } catch {
    return shorten(String(value));
  }
}

export function unreadableValue(
  at: string | undefined,
  value: unknown,
  cause?: unknown,
  response?: Response,
): DecodeError {
  const where = at === undefined ? 'the reply' : `\`${at}\` from the reply`;
  return new DecodeError(`Could not read ${where}: the API sent ${sent(value)}.`, {
    at,
    cause,
    response,
    value,
  });
}
