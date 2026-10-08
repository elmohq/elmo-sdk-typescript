import type { Feature, PreparedRequest, Result } from '../core/types';

/** Hooks of your own, run in order at three points in every call. */
export interface Interceptors {
  /** Runs when a call fails. Return the error to raise, which may be another. */
  error?: ReadonlyArray<(error: unknown, request: PreparedRequest) => unknown>;
  /** Runs on the built request, last before it is sent. */
  request?: ReadonlyArray<(request: PreparedRequest) => Promise<void> | void>;
  /** Runs on the reply. Return the result to read, which may be another. */
  response?: ReadonlyArray<(result: Result, request: PreparedRequest) => Promise<Result> | Result>;
}

function interceptorsOf(request: PreparedRequest): Interceptors | undefined {
  return request.options['interceptors'] as Interceptors | undefined;
}

export function interceptorsFeature(): Feature {
  return {
    name: 'interceptors',
    async onError(error, request) {
      let current = error;
      for (const fn of interceptorsOf(request)?.error ?? []) current = await fn(current, request);
      return current;
    },
    async onRequest(request) {
      for (const fn of interceptorsOf(request)?.request ?? []) await fn(request);
    },
    async onResult(result, request) {
      let current = result;
      for (const fn of interceptorsOf(request)?.response ?? []) {
        current = await fn(current, request);
      }
      return current;
    },
  };
}
