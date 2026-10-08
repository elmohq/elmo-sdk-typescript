import { TIMER_LIMIT } from '../core/backoff';
import { replyWith } from '../core/body';
import { calledOffWith, safeAddress, TimeoutError } from '../core/errors';
import type {
  CallableDescriptor,
  CallTimeout,
  Feature,
  PreparedRequest,
  Result,
  Send,
} from '../core/types';

/**
 * Chooses the limit of one call, given the operation as `METHOD /path` and the
 * limit it would otherwise get. `undefined` keeps that limit.
 */
export type TimeoutPolicy = (operation: string, timeout: CallTimeout) => CallTimeout | undefined;

/** A limit in milliseconds, `false` for none, or a policy choosing one per call. */
export type TimeoutValue = CallTimeout | TimeoutPolicy;

export interface TimeoutOptions {
  ms?: number;
}

function describeTarget(request: PreparedRequest): string | undefined {
  const { method } = request.callable;
  if (typeof request.address !== 'string') return undefined;
  const address = safeAddress(request.address);
  return method ? `${method.toUpperCase()} "${address}"` : `"${address}"`;
}

export const DEFAULT_TIMEOUT = 60_000;

function operationKey({ address, method }: CallableDescriptor): string {
  return method ? `${method.toUpperCase()} ${address}` : address;
}

export function resolveTimeout(base: TimeoutOptions, request: PreparedRequest): number | undefined {
  const own = request.callable.timeout ?? base.ms ?? DEFAULT_TIMEOUT;
  const option = request.options['timeout'] as TimeoutValue | undefined;
  const ms =
    typeof option === 'function'
      ? (option(operationKey(request.callable), own) ?? own)
      : (option ?? own);
  if (ms === false) return undefined;
  return ms > 0 && Number.isFinite(ms) ? ms : undefined;
}

function watchedReply(
  response: Response,
  wait: <T>(pending: Promise<T>) => Promise<T>,
  done: () => void,
): Response {
  const reader = response.body!.getReader();
  const body = new ReadableStream<Uint8Array>({
    cancel(reason) {
      done();
      return reader.cancel(reason);
    },
    async pull(controller) {
      const step = await wait(reader.read()).catch((error: unknown) => {
        done();
        reader.cancel(error).catch(done);
        throw error;
      });
      if (step.done) {
        done();
        controller.close();
      } else {
        controller.enqueue(step.value);
      }
    },
  });
  return replyWith(body, response);
}

export function timeoutFeature(options: TimeoutOptions = {}): Feature {
  async function bounded(request: PreparedRequest, next: Send, stream: boolean): Promise<Result> {
    const ms = resolveTimeout(options, request);
    if (ms === undefined) return next(request);
    const delay = Math.min(ms, TIMER_LIMIT);
    let left = delay;

    const caller = request.signal;
    const controller = new AbortController();
    const { signal } = controller;

    function abortWithCaller(): void {
      controller.abort(caller?.reason);
    }

    if (caller?.aborted) abortWithCaller();
    caller?.addEventListener('abort', abortWithCaller, { once: true });

    const abandoned = new Promise<never>((_, reject) => {
      function giveUp(): void {
        reject(calledOffWith(signal.reason));
      }
      if (signal.aborted) giveUp();
      else signal.addEventListener('abort', giveUp, { once: true });
    });
    abandoned.catch(() => {});

    function expire(): void {
      controller.abort(new TimeoutError(ms, undefined, describeTarget(request)));
    }

    async function wait<T>(pending: Promise<T>): Promise<T> {
      const started = Date.now();
      const timer = setTimeout(expire, left);
      try {
        return await Promise.race([pending, abandoned]);
      } finally {
        clearTimeout(timer);
        left = stream ? delay : left - (Date.now() - started);
      }
    }

    function done(): void {
      caller?.removeEventListener('abort', abortWithCaller);
    }

    request.signal = signal;
    const result = await wait(next(request))
      .catch((error: unknown) => {
        done();
        throw error;
      })
      .finally(() => {
        request.signal = caller;
      });
    const { response } = result;
    if (response?.body && (stream || request.options.unread)) {
      return { ...result, response: watchedReply(response, wait, done) };
    }
    done();
    return result;
  }

  return {
    name: 'timeout',
    onOpen: (request, next) => bounded(request, next, true),
    onSend: (request, next) => bounded(request, next, false),
  };
}
