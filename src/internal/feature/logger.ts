import { safeAddress } from '../core/errors';
import type {
  AuthScheme,
  CallableDescriptor,
  CallLog,
  Feature,
  PreparedRequest,
  Result,
  Send,
} from '../core/types';

/** One method of a {@link Logger}: a message, then the values logged with it. */
export type LogFn = (message: string, ...rest: ReadonlyArray<unknown>) => void;

/** Where log lines go, such as `console`. */
export interface Logger {
  debug: LogFn;
  error: LogFn;
  info: LogFn;
  warn: LogFn;
}

/**
 * How much a client logs. `'error'` writes failed calls. `'warn'` adds a retry
 * or a redirect. `'info'` adds a line per attempt, with its status and time.
 * `'debug'` adds headers, with credentials hidden.
 */
export type LogLevel = 'debug' | 'error' | 'info' | 'off' | 'warn';

const LEVELS: Readonly<Record<LogLevel, number>> = {
  debug: 40,
  error: 10,
  info: 30,
  off: 0,
  warn: 20,
};

export interface LoggerOptions {
  level?: LogLevel;
  logger?: Logger;
}

function describeCall(request: PreparedRequest): string {
  const method = request.callable.method?.toUpperCase();
  const address = typeof request.address === 'string' ? safeAddress(request.address) : '';
  return method ? `${method} ${address}` : address;
}

const ADDRESS_RE = /\b[a-z][a-z\d+.-]*:\/\/[^\s"'<>]+/gi;

export function failureText(error: unknown): string {
  const messages: Array<string> = [];
  const seen = new Set<unknown>();
  let current = error;
  while (current !== undefined && current !== null && !seen.has(current)) {
    seen.add(current);
    const failed = current instanceof Error;
    messages.push(failed ? (current as Error).message : String(current));
    current = failed ? (current as Error).cause : undefined;
  }
  return messages.join(' Caused by: ').replace(ADDRESS_RE, safeAddress);
}

function declaredHeaders(callable: CallableDescriptor): Set<string> {
  const names = new Set<string>();
  for (const requirement of callable.auth ?? []) {
    for (const scheme of Array.isArray(requirement) ? requirement : [requirement as AuthScheme]) {
      if (scheme.in === 'header' && scheme.name) names.add(scheme.name.toLowerCase());
    }
  }
  return names;
}

const SECRET_HEADERS: ReadonlyArray<string> = [
  'authorization',
  'cookie',
  'proxy-authorization',
  'set-cookie',
];

function isSecret(name: string, declared: ReadonlySet<string>): boolean {
  const lower = name.toLowerCase();
  return (
    SECRET_HEADERS.includes(lower) ||
    declared.has(lower) ||
    lower.endsWith('-key') ||
    lower.endsWith('-token') ||
    lower.endsWith('-secret')
  );
}

export function safeHeaders(
  meta: Readonly<Record<string, unknown>>,
  callable: CallableDescriptor,
): Record<string, unknown> {
  const declared = declaredHeaders(callable);
  const safe: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(meta)) {
    safe[name] = isSecret(name, declared) ? '***' : value;
  }
  return safe;
}

function callLog(id: string, request: PreparedRequest, at: number, sink: Logger): CallLog {
  const label = describeCall(request);
  let started = Date.now();
  function line(text: string): string {
    return `[${id}] ${label} ${text}`;
  }

  return {
    ended(error) {
      const ms = Date.now() - started;
      if (error !== undefined) {
        if (at >= LEVELS.error) {
          sink.error(line(`stream failed after ${ms} ms: ${failureText(error)}`));
        }
      } else if (at >= LEVELS.info) {
        sink.info(line(`stream ended after ${ms} ms`));
      }
    },
    failed(error) {
      if (at >= LEVELS.error) sink.error(line(`failed: ${failureText(error)}`));
    },
    replied(response) {
      const ms = Date.now() - started;
      if (response?.redirected && at >= LEVELS.warn) {
        sink.warn(line(`was redirected to ${safeAddress(response.url)}`));
      }
      if (at >= LEVELS.info) sink.info(line(`-> ${response?.status ?? '?'} in ${ms} ms`));
      if (at >= LEVELS.debug) {
        sink.debug(`[${id}] received`, {
          headers: safeHeaders(Object.fromEntries(response?.headers ?? []), request.callable),
          ms,
          status: response?.status,
        });
      }
    },
    retrying(wait, retry, retries, after) {
      if (at < LEVELS.warn) return;
      const again = `retrying in ${Math.round(wait)} ms (${retry} of ${retries})`;
      if (after?.status !== undefined) {
        sink.warn(line(`-> ${after.status}, ${again}`));
      } else if (after?.error !== undefined) {
        sink.warn(line(`failed: ${failureText(after.error)}, ${again}`));
      } else {
        sink.warn(line(again));
      }
    },
    sending() {
      started = Date.now();
      if (at >= LEVELS.info) sink.info(`[${id}] ${label}`);
      if (at >= LEVELS.debug)
        sink.debug(`[${id}] sending`, { headers: safeHeaders(request.meta, request.callable) });
    },
  };
}

export function readLevel(named: string): LogLevel | undefined {
  const spelled = named.toLowerCase();
  if (spelled === 'warning') return 'warn';
  return Object.prototype.hasOwnProperty.call(LEVELS, spelled) ? (spelled as LogLevel) : undefined;
}

function resolveLogging(
  base: LoggerOptions,
  request: PreparedRequest,
  unknown: Set<string>,
): { at: number; sink: Logger } | undefined {
  const named = String(request.options['logLevel'] || base.level || 'off');
  const level = readLevel(named);
  const sink =
    (request.options['logger'] as Logger | undefined) ??
    base.logger ??
    (globalThis as { console?: Logger }).console;
  if (level === undefined && sink && !unknown.has(named)) {
    unknown.add(named);
    sink.warn(
      `Unknown log level "${named}": nothing is logged. Use "debug", "info", "warn", "error" or "off".`,
    );
  }
  if (level === undefined || level === 'off' || !sink) return undefined;
  return { at: LEVELS[level], sink };
}

async function written(request: PreparedRequest, next: Send): Promise<Result> {
  const { log } = request;
  if (!log) return next(request);

  const result = await next(request);
  log.replied(result.response);
  return result;
}

export function loggerFeature(options: LoggerOptions = {}): Feature {
  let counter = 0;
  const unknown = new Set<string>();
  const warned = new Set<CallableDescriptor>();

  return {
    name: 'logger',
    async onError(error, request) {
      request.log?.failed(error);
      return error;
    },
    onOpen: written,
    onPrepare(request) {
      const on = resolveLogging(options, request, unknown);
      if (!on) return;
      const id = `req_${++counter}`;
      request.log = callLog(id, request, on.at, on.sink);
      const { callable } = request;
      if (callable.deprecated && on.at >= LEVELS.warn && !warned.has(callable)) {
        warned.add(callable);
        const method = callable.method?.toUpperCase();
        const operation = method ? `${method} ${callable.address}` : callable.address;
        on.sink.warn(`[${id}] ${operation} is deprecated`);
      }
    },
    onSend: written,
  };
}
