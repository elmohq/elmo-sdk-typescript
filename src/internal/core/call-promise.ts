import type { Client } from './client';
import type { Exchange } from './dispatch';
import { ElmoError } from './errors';
import { LazyPromise, unattended } from './lazy-promise';
import type {
  CallableDescriptor,
  CallResult,
  ErrorMode,
  ResolvedOptions,
  ResultEnvelope,
} from './types';

export function awaitedResult<T>(
  client: Client,
  options: ResolvedOptions,
  result: { data?: unknown; error?: unknown; ok?: boolean },
): T {
  if ((options.errors ?? client.setup.defaults.errors) === 'return') return result as T;
  if (result.ok === false) throw result.error;
  return result.data as T;
}

/** A call already sent, whose reply is not yet read. */
export class CallPromise<
  TResponses = unknown,
  TErrors = unknown,
  TMode extends ErrorMode = 'throw',
> extends LazyPromise<CallResult<TResponses, TErrors, TMode>> {
  protected readonly client: Client;
  protected readonly exchange: Promise<Exchange>;
  protected readonly options: ResolvedOptions;

  private envelope: Promise<ResultEnvelope<TResponses, TErrors>> | undefined;

  constructor(client: Client, callable: CallableDescriptor, options: ResolvedOptions = {}) {
    super();
    this.client = client;
    this.options = options;
    this.exchange = unattended(client.exchange(callable, { ...options, envelope: true }));
  }

  /**
   * The whole result envelope. A failure of the call is returned on it, not
   * thrown. What one of your own functions throws, such as a hook, is thrown
   * as it is.
   */
  result(): Promise<ResultEnvelope<TResponses, TErrors>> {
    return (this.envelope ??= this.read());
  }

  /** The payload alone, with a failure thrown rather than handed back. */
  async unwrap(): Promise<CallResult<TResponses, TErrors, 'throw'>> {
    const result = await this.result();
    if (result.ok === false) throw result.error;
    return result.data as CallResult<TResponses, TErrors, 'throw'>;
  }

  private async read(): Promise<ResultEnvelope<TResponses, TErrors>> {
    try {
      return await this.decode();
    } catch (error) {
      if (!(error instanceof ElmoError)) throw error;
      return { error, ok: false } as ResultEnvelope<TResponses, TErrors>;
    }
  }

  protected override settle(): Promise<CallResult<TResponses, TErrors, TMode>> {
    return this.result().then((result) => awaitedResult(this.client, this.options, result));
  }

  protected async decode(): Promise<ResultEnvelope<TResponses, TErrors>> {
    return (await this.exchange).read() as Promise<ResultEnvelope<TResponses, TErrors>>;
  }
}

/** What a call resolves with where its `Response` is asked for as well. */
export interface WithResponse<TData> {
  /** What the call resolves with on its own. */
  data: TData;
  /** The request id to quote when reporting a problem with the call. */
  requestId: string | undefined;
  /** The `Response` that carried `data`. Its body is already read. */
  response: Response;
}

/** A call already sent, whose `Response` can be read as well as its payload. */
export class RestCallPromise<
  TResponses = unknown,
  TErrors = unknown,
  TMode extends ErrorMode = 'throw',
> extends CallPromise<TResponses, TErrors, TMode> {
  private claimed = false;

  private unread: Promise<Response> | undefined;

  /**
   * The `Response` itself, with its body unread and yours to read once. An
   * error status does not throw here. A call that got no response does.
   */
  asResponse(): Promise<Response> {
    return (this.unread ??= this.claim());
  }

  /** The decoded body, the `Response` that carried it, and the request id. */
  async withResponse(): Promise<WithResponse<CallResult<TResponses, TErrors, TMode>>> {
    const data = await (this as CallPromise<TResponses, TErrors, TMode>);
    const exchange = await this.exchange;
    return { data, requestId: exchange.requestId(), response: exchange.response as Response };
  }

  protected override async decode(): Promise<ResultEnvelope<TResponses, TErrors>> {
    const exchange = await this.exchange;
    const { response } = exchange;
    if (!this.claimed || !response) return super.decode();
    if (!response.bodyUsed) {
      return exchange.read(response.clone()) as Promise<ResultEnvelope<TResponses, TErrors>>;
    }
    throw new ElmoError(
      'The body of this call was already read through asResponse(). Use withResponse() instead, which gives the body and the reply from one call.',
    );
  }

  private async claim(): Promise<Response> {
    const { response } = await this.exchange;
    if (!response) {
      throw new ElmoError(
        'This call was answered without a `Response`, so there is none to hand back.',
      );
    }
    if (!response.bodyUsed) this.claimed = true;
    return response;
  }
}

export function callPromise<
  TResponses = unknown,
  TErrors = unknown,
  TMode extends ErrorMode = 'throw',
>(
  client: Client,
  callable: CallableDescriptor,
  options: ResolvedOptions = {},
): RestCallPromise<TResponses, TErrors, TMode> {
  return new RestCallPromise<TResponses, TErrors, TMode>(client, callable, options);
}
