import { backoffDelay, exceedsMaxRetryAfter, retryAfterDelay, sleep } from '../core/backoff';
import { discardBody, isStreamed } from '../core/body';
import { calledOffWith, classifyError, ElmoError, failureOf, TransportError } from '../core/errors';
import type { Feature, PreparedRequest, Result, RetryRules, Send } from '../core/types';

/** Which failed calls are sent again, how many times, and how long each waits first. */
export interface RetryOptions extends RetryRules {
  /**
   * How long to wait before the next attempt, in milliseconds, in place of the
   * API's retry headers and the backoff. `undefined` keeps the usual wait.
   * After a failure that got no reply, `result` holds only the `error`.
   * **{@link maxRetryAfter} does not limit what this returns.**
   */
  retryDelay?(result: Result, request: PreparedRequest, attempt: number): number | undefined;
  /**
   * Whether to retry, in place of `statuses`, `x-should-retry` and
   * `retryOnTimeout`. After a reply, the body is unread: read it from
   * `response.clone()`. After a failure that got no reply, `result` holds only
   * the `error`. A call the API may have acted on is never asked about: a
   * method outside `methods` is sent again only after 408, 425 or 429, or when
   * the request never reached the API.
   */
  retryOn?(result: Result, request: PreparedRequest): boolean;
}

export const DEFAULT_MAX_RETRIES = 2;

function askedFor(config: RetryOptions, result: Result): number | undefined {
  const headers = config.retryAfter;
  if (headers === false || !result.response) return undefined;
  return retryAfterDelay(result.response, headers === true ? undefined : headers);
}

const IDEMPOTENT_METHODS: ReadonlyArray<string> = [
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PUT',
  'TRACE',
];

function isRepeatable(config: RetryOptions, request: PreparedRequest): boolean {
  const method = request.callable.method?.toUpperCase();
  if (!method) return false;
  if ((config.methods ?? IDEMPOTENT_METHODS).includes(method)) return true;
  const { idempotency } = request.callable;
  return idempotency !== undefined && request.meta[idempotency] !== undefined;
}

function retriesFor(
  base: RetryOptions,
  override: RetryOptions | true | undefined,
  request: PreparedRequest,
): number {
  if (override && override !== true && override.maxRetries !== undefined) {
    return Math.max(0, override.maxRetries);
  }
  const retries = request.options['maxRetries'];
  if (typeof retries === 'number' && Number.isFinite(retries)) return Math.max(0, retries);
  return base.maxRetries ?? DEFAULT_MAX_RETRIES;
}

function resolveRetry(base: RetryOptions, request: PreparedRequest): RetryOptions | undefined {
  const override = request.options['retry'] as RetryOptions | boolean | undefined;
  if (override === false) return undefined;

  const declared = request.callable.retry;
  if (declared === false && override === undefined) return undefined;

  const stated = declared ? { ...base, ...declared } : base;
  const config = override && override !== true ? { ...stated, ...override } : stated;
  const maxRetries = retriesFor(stated, override, request);
  return maxRetries < 1 ? undefined : { ...config, maxRetries };
}

const REFUSED_STATUSES: ReadonlyArray<number> = [408, 425, 429];

const RETRY_HEADER = 'x-should-retry';

const PERMANENT_STATUSES: ReadonlyArray<number> = [501, 505, 506, 508, 510, 511];

function worthAnotherAttempt(status: number): boolean {
  if (status >= 500) return !PERMANENT_STATUSES.includes(status);
  return REFUSED_STATUSES.includes(status);
}

function shouldRetry(
  config: RetryOptions,
  result: Result,
  request: PreparedRequest,
  repeatable: boolean,
): boolean {
  const { response } = result;
  if (!response) return false;
  if (!repeatable && !REFUSED_STATUSES.includes(response.status)) return false;
  if (config.retryOn) return config.retryOn(result, request);
  if (response.headers.get(RETRY_HEADER) === 'false') return false;
  const { statuses } = config;
  return statuses ? statuses.includes(response.status) : worthAnotherAttempt(response.status);
}

function shouldRetryError(
  config: RetryOptions,
  error: unknown,
  request: PreparedRequest,
  repeatable: boolean,
): boolean {
  if (error instanceof ElmoError && !(error instanceof TransportError)) return false;
  const kind = classifyError(error);
  if (kind === 'abort') return false;
  if (failureOf(error).reachedServer !== 'no' && !repeatable) return false;
  if (config.retryOn) return config.retryOn({ error }, request);
  return kind !== 'timeout' || config.retryOnTimeout === true;
}

export function retryFeature(options: RetryOptions = {}): Feature {
  async function repeated(request: PreparedRequest, next: Send): Promise<Result> {
    const config = isStreamed(request.body) ? undefined : resolveRetry(options, request);
    if (!config) return next(request);

    const attempts = (config.maxRetries ?? DEFAULT_MAX_RETRIES) + 1;
    const repeatable = isRepeatable(config, request);
    const started = Date.now();

    for (let attempt = 0; ; attempt++) {
      const last = attempt >= attempts - 1;
      let result: Result | undefined;
      let threw = false;
      let wait: number | undefined;

      if (attempt) request.attempt = attempt;
      try {
        result = await next(request);
        if (last || !shouldRetry(config, result, request, repeatable)) return result;

        wait = config.retryDelay?.(result, request, attempt);
        if (wait === undefined) {
          wait = askedFor(config, result);
          if (exceedsMaxRetryAfter(wait, config.maxRetryAfter)) return result;
        }
      } catch (error) {
        if (last || !shouldRetryError(config, error, request, repeatable)) throw error;
        threw = true;
        result = { error };
        wait = config.retryDelay?.(result, request, attempt);
      }

      wait ??= backoffDelay(attempt, config);
      if (config.budget !== undefined && Date.now() - started + wait >= config.budget) {
        if (threw) throw result.error;
        return result;
      }

      discardBody(result);
      request.log?.retrying(wait, attempt + 1, attempts - 1, result);
      await sleep(wait, request.signal).catch((reason: unknown) => {
        throw calledOffWith(reason);
      });
    }
  }

  return { name: 'retry', onOpen: repeated, onSend: repeated };
}
