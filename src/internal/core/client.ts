import { mergeConfigs, mergeDefaults } from './config';
import { applyAliases, applyCredentials } from './credentials';
import type { DispatchSetup, Exchange } from './dispatch';
import { dispatch, exchange, prepare } from './dispatch';
import { envDefaults } from './env';
import { ElmoError } from './errors';
import { onlyProtocol } from './protocol';
import type {
  CallableDescriptor,
  CallResult,
  ErrorMode,
  PreparedRequest,
  ResolvedOptions,
} from './types';

/** What every call is sent through. It holds the options all calls share. */
export interface Client {
  /** @internal */
  call<TData = unknown, TError = unknown, TMode extends ErrorMode = 'throw'>(
    callable: CallableDescriptor,
    options?: ResolvedOptions,
  ): Promise<CallResult<TData, TError, TMode>>;
  /** @internal */
  exchange(callable: CallableDescriptor, options?: ResolvedOptions): Promise<Exchange>;
  /** @internal */
  prepare<TAddress = unknown>(
    callable: CallableDescriptor,
    options?: ResolvedOptions,
  ): Promise<PreparedRequest<TAddress>>;
  /** @internal */
  resolveAddress<TAddress = unknown>(
    callable: CallableDescriptor,
    options?: ResolvedOptions,
  ): TAddress;
  /** @internal */
  readonly setup: DispatchSetup;
}

function clientOf(setup: DispatchSetup): Client {
  const client = {
    call<TData = unknown, TError = unknown, TMode extends ErrorMode = 'throw'>(
      callable: CallableDescriptor,
      options?: ResolvedOptions,
    ): Promise<CallResult<TData, TError, TMode>> {
      return dispatch(setup, callable, options) as Promise<CallResult<TData, TError, TMode>>;
    },
    exchange(callable: CallableDescriptor, options?: ResolvedOptions): Promise<Exchange> {
      return exchange(setup, callable, options);
    },
    prepare<TAddress = unknown>(callable: CallableDescriptor, options: ResolvedOptions = {}) {
      return prepare(setup, callable, options) as Promise<PreparedRequest<TAddress>>;
    },
    resolveAddress<TAddress = unknown>(
      callable: CallableDescriptor,
      options: ResolvedOptions = {},
    ) {
      const { binding } = onlyProtocol(setup.protocols, callable.interaction);
      return binding.resolveAddress(callable, mergeConfigs(setup.defaults, options)) as TAddress;
    },
  };
  return Object.defineProperty(client, 'setup', { value: setup }) as Client;
}

export function createClient(setup: DispatchSetup): Client {
  return clientOf({
    ...setup,
    defaults: envDefaults(setup.defaults, setup.env, setup.credentials),
  });
}

export function clientFor(
  args: (Partial<ResolvedOptions> & { client?: Client; key?: string }) | undefined,
  fallback?: Client,
): Client {
  const { client, key: _key, ...args_ } = args ?? {};
  const base = client ?? fallback;
  if (!base) throw new ElmoError('This SDK has no client of its own. Pass one as `client`.');
  const config = applyCredentials(applyAliases(args_, base.setup.aliases), base.setup.credentials);
  if (client && !Object.keys(config).length) return client;
  const defaults = mergeDefaults(base.setup.defaults, config);
  base.setup.guard?.(defaults);
  return clientOf({ ...base.setup, defaults });
}

export function withClient<T extends object>(source: T, client: Client, key = 'client'): T {
  const derived = Object.create(Object.getPrototypeOf(source)) as Record<string, Client>;
  derived[key] = client;
  return derived as T;
}
