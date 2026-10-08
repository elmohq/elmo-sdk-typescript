/**
 * How much of each wait is random, so callers that failed together do not all
 * come back at once.
 *
 * A number from 0 to 1 is the random share: `0.25` waits between three
 * quarters of the computed wait and all of it. `'full'` is 1, `'equal'` is 0.5
 * and `'none'` is 0. `true` is `'full'` and `false` is `'none'`.
 */
export type Jitter = boolean | number | 'equal' | 'full' | 'none';

/** How long the wait before each retry is. */
export interface BackoffOptions {
  /**
   * Base delay in milliseconds.
   *
   * @default 500
   */
  delay?: number;
  /**
   * The share of each delay that is random.
   *
   * @default 'full'
   */
  jitter?: Jitter;
  /**
   * Upper bound on any single delay, in milliseconds.
   *
   * @default 30_000
   */
  maxDelay?: number;
  /**
   * How the wait grows. `'exponential'` doubles the base delay each time, up
   * to `maxDelay`. `'constant'` waits the base delay every time.
   *
   * @default 'exponential'
   */
  strategy?: 'constant' | 'exponential';
}

/** A header the API may name its own wait in, and how to read its value. */
export interface RetryAfterHeader {
  /**
   * Whether a number counts forward from now, or names a moment.
   *
   * @default 'duration'
   */
  readonly kind?: 'duration' | 'moment';
  /** Header name, matched case-insensitively. */
  readonly name: string;
  /**
   * What a number in this header counts in.
   *
   * @default 'second'
   */
  readonly unit?: 'millisecond' | 'second';
}

function jitterShare(jitter: Jitter): number {
  if (typeof jitter === 'number') return Math.min(1, Math.max(0, jitter));
  if (jitter === 'equal') return 0.5;
  return jitter === true || jitter === 'full' ? 1 : 0;
}

export function backoffDelay(retry: number, options: BackoffOptions = {}): number {
  const { delay = 500, jitter = true, maxDelay = 30_000, strategy = 'exponential' } = options;
  const growth = strategy === 'constant' ? delay : delay && delay * 2 ** retry;
  const capped = Math.min(growth, maxDelay);
  const share = jitterShare(jitter);
  return share ? capped * (1 - share) + Math.random() * capped * share : capped;
}

export const MAX_RETRY_AFTER = 60_000;

export function exceedsMaxRetryAfter(delay: number | undefined, max?: number): boolean {
  return delay !== undefined && delay > (max ?? MAX_RETRY_AFTER);
}

export const TIMER_LIMIT = 2_147_483_647;

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      },
      Math.min(ms, TIMER_LIMIT),
    );

    function onAbort(): void {
      clearTimeout(timer);
      reject(signal!.reason);
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export const RETRY_AFTER_HEADERS: ReadonlyArray<RetryAfterHeader> = [
  { name: 'retry-after-ms', unit: 'millisecond' },
  { name: 'retry-after' },
  { name: 'x-ratelimit-reset-after' },
  { kind: 'moment', name: 'x-ratelimit-reset' },
  { kind: 'moment', name: 'x-rate-limit-reset' },
];

const ASCTIME = /^[a-z]{3} ([a-z]{3}) +(\d\d?) (\d\d:\d\d:\d\d) (\d{4})$/i;

const MOMENT =
  /^(?:(\d{4})-(\d\d)-(\d\d)[t ]|(?:[a-z]+, ?)?(\d\d?)[ -]([a-z]{3})[ -](\d\d|\d{4}) )([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d|60)(?:\.(\d{1,3})\d*)?)? ?(?:z|gmt|utc?|([+-])([01]\d|2[0-3]):?([0-5]\d))$/i;

const MONTHS = 'janfebmaraprmayjunjulaugsepoctnovdec';

function moment(value: string, now: number): number | undefined {
  const match = MOMENT.exec(value.replace(ASCTIME, '$2 $1 $4 $3 GMT'));
  if (!match) return undefined;
  const year = match[6] ?? match[1]!;
  const day = +(match[4] ?? match[3]!);
  const month = match[2] ? +match[2] - 1 : MONTHS.indexOf(match[5]!.toLowerCase()) / 3;
  let full = +year;
  if (year.length < 3) {
    const present = new Date(now).getUTCFullYear();
    full += present - (present % 100);
    if (full > present + 50) full -= 100;
  }
  const date = new Date(0);
  date.setUTCFullYear(full, month, day);
  if (!full || date.getUTCMonth() !== month || date.getUTCDate() !== day) return undefined;
  const zone = (match[11] === '-' ? -1 : 1) * (+(match[12] ?? 0) * 60 + +(match[13] ?? 0));
  const seconds = (+match[7]! * 60 + +match[8]! - zone) * 60 + +(match[9] ?? 0);
  return date.getTime() + seconds * 1000 + +(match[10] ?? '').padEnd(3, '0');
}

const NUMBER = /^[0-9]+(?:\.[0-9]+)?$/;

export function parseRetryAfter(
  value: string | null | undefined,
  header: RetryAfterHeader = { name: 'retry-after' },
  now = Date.now(),
): number | undefined {
  if (!value) return undefined;

  if (NUMBER.test(value)) {
    const number = Number(value);
    const ms = header.unit === 'millisecond' ? number : number * 1000;
    return Math.max(0, header.kind === 'moment' ? ms - now : ms);
  }

  const date = moment(value, now);
  if (date === undefined) return undefined;
  return Math.max(0, date - now);
}

export function retryAfterDelay(
  response: Response,
  headers: ReadonlyArray<RetryAfterHeader> = RETRY_AFTER_HEADERS,
  now = Date.now(),
): number | undefined {
  const clock = moment(response.headers.get('date') ?? '', now) ?? now;

  for (const header of headers) {
    const delay = parseRetryAfter(response.headers.get(header.name), header, clock);
    if (delay !== undefined) return delay;
  }

  return undefined;
}
