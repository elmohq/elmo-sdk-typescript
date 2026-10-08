import type { BackoffOptions, RetryAfterHeader } from './backoff';
import { APIError, ElmoError } from './errors';

/** A request body in a form `fetch` sends as it is. */
export type BodyInput = NonNullable<RequestInit['body']>;

/** An encoded request body, or `null` for a request that sends none. */
export type BodyPayload = BodyInput | null;

/**
 * One reply, as far as it has been read. Until its body is read, only `ok`,
 * `response` and `status` are set.
 */
export interface Result<TData = unknown, TError = unknown> {
  /** The decoded body of a 2xx reply. */
  data?: TData;
  /** The decoded body of a reply that failed. */
  error?: TError;
  /** `true` for a 2xx status. */
  ok?: boolean;
  /** The reply itself, where one arrived. */
  response?: Response;
  status?: number;
}

export interface CallLog {
  ended(error?: unknown): void;
  failed(error: unknown): void;
  replied(response: Response | undefined): void;
  retrying(wait: number, retry: number, retries: number, after?: Result): void;
  sending(): void;
}

/** One way the API takes a credential, as the API description declares it. */
export interface AuthScheme {
  /**
   * Where the credential is sent.
   *
   * @default 'header'
   */
  readonly in?: 'cookie' | 'header' | 'query';
  /** Which credential this is. Its option, where it has one, has the same name. */
  readonly key?: string;
  /** The header, query parameter or cookie the credential is sent in. */
  readonly name?: string;
  /** How an `http` credential is written in the `Authorization` header. */
  readonly scheme?: 'basic' | 'bearer';
  /**
   * `'apiKey'` sends the credential as it is, where `in` and `name` say.
   * `'http'` sends it in the `Authorization` header, written as `scheme` says.
   */
  readonly type: 'apiKey' | 'http';
}

export type AuthRequirement = AuthScheme | ReadonlyArray<AuthScheme>;

/** A time limit in milliseconds, or `false` for none. */
export type CallTimeout = number | false;

export interface InputRule {
  readonly above?: number;
  readonly below?: number;
  readonly max?: number;
  readonly min?: number;
  readonly name?: string;
  readonly of?: 'characters' | 'entries' | 'items';
}

export type Interaction = 'unary';

export type PaginationStyle = 'cursor' | 'link' | 'offset' | 'page';

export interface PaginationDescriptor {
  readonly cursor?: string;
  readonly in?: 'body' | 'query';
  readonly items?: string;
  readonly limitParam?: string;
  readonly link?: string;
  readonly more?: string;
  readonly pages?: string;
  readonly param?: string;
  readonly size?: string;
  readonly start?: number;
  readonly style: PaginationStyle;
  readonly total?: string;
}

/** How a failed call is sent again. Anything left out keeps the client's rule. */
export interface RetryRules extends BackoffOptions {
  /**
   * How long a call may keep trying, in milliseconds, counted from the first
   * attempt with the waits included. A retry that would start past it is not
   * sent, and the last reply or error stands. An attempt that is running is
   * not cut short: `timeout` limits each one.
   *
   * @default no limit
   */
  budget?: number;
  /**
   * How many times a failed call is sent again, after the first attempt.
   *
   * @default 2
   */
  maxRetries?: number;
  /**
   * The longest wait the API may ask for, in milliseconds. Past it, the call
   * gives up and returns the reply as it is.
   *
   * @default 60_000
   */
  maxRetryAfter?: number;
  /**
   * Methods that may be sent again. A failure that never reached the server,
   * a call carrying its API's idempotency key, and 408, 425 and 429 are sent
   * again whatever this says.
   *
   * @default idempotent methods
   */
  methods?: ReadonlyArray<string>;
  /**
   * Headers the API may name its own wait in, read before the backoff
   * applies. `false` reads none.
   *
   * @default `retry-after-ms`, `retry-after`, `x-ratelimit-reset-after`,
   * `x-ratelimit-reset` and `x-rate-limit-reset`, in that order
   */
  retryAfter?: ReadonlyArray<RetryAfterHeader> | boolean;
  /**
   * Send the request again when an attempt runs past its deadline.
   *
   * @default false
   */
  retryOnTimeout?: boolean;
  /**
   * Statuses worth another attempt. A reply with `x-should-retry: false` is
   * never retried.
   */
  statuses?: ReadonlyArray<number>;
}

export interface ParameterSerialization {
  readonly allowReserved?: boolean;
  readonly array?: { readonly explode?: boolean; readonly style?: string };
  readonly mediaType?: string;
  readonly object?: { readonly explode?: boolean; readonly style?: string };
}

export interface SerializationDescriptor {
  readonly query?: Readonly<Record<string, ParameterSerialization>>;
}

export interface CallableDescriptor {
  readonly accept?: string;
  readonly address: string;
  readonly auth?: ReadonlyArray<AuthRequirement>;
  readonly authOptional?: boolean;
  readonly baseURL?: string;
  readonly deprecated?: boolean;
  readonly idempotency?: string;
  readonly interaction?: Interaction;
  readonly mediaType?: string;
  readonly method?: string;
  readonly pagination?: PaginationDescriptor;
  readonly retry?: RetryRules | false;
  /** `'json'` where every success is declared as a JSON object or list. */
  readonly returns?: 'json';
  readonly rules?: ReadonlyArray<InputRule>;
  readonly serialization?: SerializationDescriptor;
  readonly timeout?: CallTimeout;
  readonly validators?: unknown;
}

export type MetadataValue = string | Array<string> | undefined;

export type Metadata = Record<string, MetadataValue>;

export interface Credential {
  in: 'cookie' | 'header' | 'query';
  name: string;
  value: string;
}

export interface PlacedCredential {
  readonly credential: Credential;
  readonly scheme: AuthScheme;
}

export type BodyOptions = {
  /** The request body, before it is encoded. */
  body?: unknown;
};

export type SignalOptions = {
  /** Cancels this call when it fires, retries included. */
  signal?: AbortSignal;
};

export type ExchangeOptions = BodyOptions & SignalOptions;

/** A credential as a string, before it is written into the request. `undefined` sends none. */
export type AuthToken = string | undefined;

/**
 * Returns the credential to send for `scheme`, given the value its option
 * holds. `undefined` sends none for that scheme.
 */
export type AuthResolver = (scheme: AuthScheme, value: AuthToken) => Promise<AuthToken> | AuthToken;

/** What the `auth` option takes: an {@link AuthResolver}, or `null` to send none. */
export type AuthValue = AuthResolver | null;

export type BodySerializerOptions = {
  /**
   * Encodes the request body, in place of the default for its content type.
   * `null` sends the body as given.
   */
  bodySerializer?: ((body: unknown) => BodyPayload) | null;
};

export type BaseURLOptions<TBaseURL = string> = {
  /** The base URL for this call, in place of the client's. */
  baseURL?: TBaseURL;
};

export type CredentialOptions<TAuth = AuthValue> = {
  /**
   * Decides each credential a call sends, given the scheme and the value its
   * option holds. What it returns is sent, so return the value to keep it.
   * `null` sends no credential.
   */
  auth?: TAuth;
};

export type EnvironmentOptions<TEnvironment = string> = {
  /** Which environment to send to. `baseURL` wins over this. */
  environment?: TEnvironment;
};

export type ConnectionOptions<
  TBaseURL = string,
  TAuth = AuthValue,
  TEnvironment = string,
> = BaseURLOptions<TBaseURL> &
  CredentialOptions<TAuth> &
  ([TEnvironment] extends [never] ? unknown : EnvironmentOptions<TEnvironment>);

/**
 * How a failure reaches the caller.
 *
 * - `'throw'` resolves to the payload and throws the failure.
 * - `'return'` resolves to the result envelope and throws no failure of the
 *   call. What one of your own functions throws is still thrown.
 */
export type ErrorMode = 'return' | 'throw';

export type ErrorOptions = {
  /**
   * Whether a failure is thrown or handed back beside the data. Set on a
   * client's defaults, not per call.
   *
   * @default 'throw'
   */
  errors?: ErrorMode;
};

/** Headers as a `Headers`, as pairs of name and value, or as an object. */
export type MetadataInput = Headers | Iterable<readonly [string, string]> | Record<string, unknown>;

/** What a call sends beside its body. Each member is merged per name. */
export type MetadataOptions = {
  /** Headers to send. Merged per name, and `null` drops one. */
  headers?: MetadataInput;
  /** Path parameters. Merged per name. */
  path?: Record<string, unknown>;
  /** Query parameters to add. Merged per name, and `null` drops one. */
  query?: Record<string, unknown>;
};

export type SharedOptions<
  TAddress = string,
  TAuth = AuthValue,
  TEnvironment = string,
> = BodySerializerOptions &
  ConnectionOptions<TAddress, TAuth, TEnvironment> &
  ErrorOptions &
  MetadataOptions;

export type CallOptions = ExchangeOptions & SharedOptions;

export interface ResolvedOptions extends CallOptions {
  [key: string]: unknown;
  envelope?: boolean;
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  raw?: boolean;
  unread?: boolean;
}

/** A request about to be sent, which a `request` hook reads and may change. */
export interface PreparedRequest<TAddress = unknown> {
  /** Where the request goes. Over HTTP, the whole URL, query string included. */
  address: TAddress;
  /** How many times this request was sent before. Unset on the first attempt. */
  attempt?: number;
  /** The request body, already encoded. */
  body: BodyPayload | undefined;
  /** The operation this request calls, as declared, `method` included. */
  callable: CallableDescriptor;
  /** How the call exchanges messages, such as one request for one reply. */
  interaction: Interaction;
  /** Where this call writes its log lines. Unset where the client does not log. */
  log?: CallLog;
  /** The headers to send, by lowercase name. */
  meta: Metadata;
  /** The options this call resolved to: the client's, with the call's own on top. */
  options: ResolvedOptions;
  /** Each credential put on the request, with the scheme it answers. */
  placed?: ReadonlyArray<PlacedCredential>;
  /**
   * Set to `manual` by a feature that follows redirects itself. A transport
   * that honors it hands back the redirect rather than following it.
   */
  redirect?: 'manual';
  /** Calls the request off when it aborts. */
  signal?: AbortSignal | undefined;
  /** What to tell the caller where the API refuses a call sent with no credential. */
  unauthenticated?: () => string;
}

/** The kinds of exchange a transport carries. `unary` is one request and one reply. */
export type TransportInteraction = 'unary';

interface UnaryTransport<TAddress> {
  /**
   * Sends one request and resolves to the reply, whatever its status, with the
   * body unread. Rejects only when no reply arrived.
   */
  unary(request: PreparedRequest<TAddress>): Promise<Response>;
}

type TransportMethods<TAddress> = UnaryTransport<TAddress>;

/** What carries a request to the API and hands back what the API sends. */
export type Transport<TAddress, TInteraction extends TransportInteraction> = {
  /** The transport's name, as an error message shows it. */
  readonly name: string;
} & Pick<TransportMethods<TAddress>, TInteraction>;

/** A credential, or a function that returns one when a call needs it. */
export type CredentialValue = AuthToken | (() => Promise<AuthToken> | AuthToken);

export interface Codec {
  readonly contentType: string | undefined;
  decode?(raw: Response): Promise<unknown>;
  encode(value: unknown): BodyPayload;
  readonly mediaTypes: ReadonlyArray<string>;
  readonly name: string;
}

export type AnyTransport<TAddress = unknown> = {
  readonly name: string;
} & Partial<TransportMethods<TAddress>>;

export interface Binding<TAddress = unknown> {
  /** What a request asks for where neither its call nor its client says. */
  readonly accept?: string;
  applyAuth(credential: Credential, request: PreparedRequest<TAddress>): void;
  readonly name: string;
  readError?(result: Result, request: PreparedRequest<TAddress>): unknown;
  readResult?(
    raw: Response,
    request: PreparedRequest<TAddress>,
    codecs: ReadonlyArray<Codec>,
  ): Promise<Result>;
  resolveAddress(callable: CallableDescriptor, options: ResolvedOptions): TAddress;
}

export interface FeatureContext {
  binding: Binding;
  transport: AnyTransport;
}

export type Send = (request: PreparedRequest) => Promise<Result>;

export interface Feature {
  readonly name: string;
  onError?(error: unknown, request: PreparedRequest, ctx: FeatureContext): unknown;
  onOpen?(request: PreparedRequest, next: Send, ctx: FeatureContext): Promise<Result>;
  onOptions?(
    options: ResolvedOptions,
    callable: CallableDescriptor,
    ctx: FeatureContext,
  ): Promise<void> | void;
  onPrepare?(request: PreparedRequest, ctx: FeatureContext): Promise<void> | void;
  onRequest?(request: PreparedRequest, ctx: FeatureContext): Promise<void> | void;
  onResult?(
    result: Result,
    request: PreparedRequest,
    ctx: FeatureContext,
  ): Promise<Result> | Result;
  onSend?(request: PreparedRequest, next: Send, ctx: FeatureContext): Promise<Result>;
}

export type CredentialSpec = {
  readonly option?: false;
  readonly prefix?: string;
  readonly variable?: string;
};

type Hundred = 3 | 4 | 5;

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type NumberOf<T> = T extends `${infer N extends number}` ? N : never;

type Tens = {
  [H in Hundred]: {
    [T in Digit]: NumberOf<`${H}${T}${Digit}`>;
  };
};

type Block = {
  [H in Hundred]: Tens[H][Digit];
};

type SplitDigits<TText> = TText extends `${infer H}${infer T}${string}`
  ? [NumberOf<H>, NumberOf<T>]
  : never;

type DigitsOf<TStatus> = TStatus extends number ? SplitDigits<`${TStatus}`> : never;

type LeftIn<H extends Hundred, TExact> = H extends DigitsOf<TExact>[0]
  ? {
      [T in Digit]: [H, T] extends DigitsOf<TExact> ? Exclude<Tens[H][T], TExact> : Tens[H][T];
    }[Digit]
  : Block[H];

type Left<THundreds, TExact> = THundreds extends Hundred ? LeftIn<THundreds, TExact> : never;

type RangeDigit<TKey> = TKey extends `${infer D extends number}${'X' | 'x'}${'X' | 'x'}`
  ? D & Hundred
  : never;

type Open<TErrors> = Exclude<Hundred, RangeDigit<keyof TErrors>>;

type StatusKey<TKey> = TKey extends number ? TKey : NumberOf<TKey>;

export type DefaultStatus<TErrors> = Left<Open<TErrors>, StatusKey<keyof TErrors>> & number;

export type RangeStatus<TErrors, TKey> = Left<RangeDigit<TKey>, StatusKey<keyof TErrors>> & number;

export type FailureStatusOf<TErrors, TKey> = TKey extends number
  ? TKey
  : TKey extends `${infer N extends number}`
    ? N
    : Lowercase<TKey & string> extends 'default'
      ? DefaultStatus<TErrors>
      : RangeStatus<TErrors, TKey>;

export type UndeclaredStatus<TErrors> = ('default' extends Lowercase<Extract<keyof TErrors, string>>
  ? 0
  : 0 | Left<Open<TErrors>, StatusKey<keyof TErrors>>) &
  number;

export type ErrorOf<TErrors> =
  | (TErrors extends object
      ? {
          [K in keyof TErrors]: {
            data?: never;
            error: APIError<TErrors[K]>;
            ok: false;
            status: FailureStatusOf<TErrors, K>;
          };
        }[keyof TErrors]
      : never)
  | {
      data?: never;
      error: APIError;
      ok: false;
      status: UndeclaredStatus<TErrors>;
    };

type StatusOf<TKey> = TKey extends number ? TKey : number;

type OutputOf<TResponses> = TResponses extends object
  ? {
      [K in keyof TResponses]: {
        data: TResponses[K];
        error?: never;
        ok: true;
        status: StatusOf<K>;
      };
    }[keyof TResponses]
  : Result;

export type UnansweredOf = {
  data?: never;
  error: ElmoError;
  ok: false;
  status?: undefined;
};

/**
 * What awaiting a call gives back: the payload, or the whole result where the
 * client returns a failure in place of throwing it.
 */
export type CallResult<
  TResponses = unknown,
  TErrors = unknown,
  TMode extends ErrorMode = 'throw',
> = TMode extends 'return'
  ? ErrorOf<TErrors> | OutputOf<TResponses> | UnansweredOf
  : TResponses extends object
    ? TResponses[keyof TResponses]
    : unknown;

export interface EncodedBody {
  contentType: string | undefined;
  payload: BodyPayload;
}

export type PageOptions = {
  /**
   * Where to start reading, from an earlier page's `nextPageParam`. Unset, the
   * walk starts at the page the call's own arguments name.
   */
  pageParam?: unknown;
};

/** What `result()` gives back: the payload, or the failure as a value. */
export type ResultEnvelope<TResponses = unknown, TErrors = unknown> = CallResult<
  TResponses,
  TErrors,
  'return'
>;

/** What a paged call hands back when its failure is read rather than thrown. */
export type PageEnvelope<TAwaited = unknown, TErrors = unknown> =
  | ErrorOf<TErrors>
  | UnansweredOf
  | {
      data: TAwaited;
      error?: never;
      ok: true;
      status: number;
    };

/**
 * What awaiting a paged call gives back: the page, or the whole result where
 * the client returns a failure in place of throwing it.
 */
export type PageResult<
  TAwaited = unknown,
  TErrors = unknown,
  TMode extends ErrorMode = 'throw',
> = TMode extends 'return' ? PageEnvelope<TAwaited, TErrors> : TAwaited;
