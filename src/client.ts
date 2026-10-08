import { createRestBinding } from './internal/binding/rest/binding';
import {
  AuthenticationError,
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  PaymentRequiredError,
  PermissionDeniedError,
  RateLimitError,
  UnprocessableEntityError,
} from './internal/binding/rest/errors';
import { simpleURL } from './internal/binding/rest/url';
import { jsonCodec } from './internal/codec/json';
import type { BackoffOptions, Jitter, RetryAfterHeader } from './internal/core/backoff';
import { refuseBrowser } from './internal/core/browser';
import type { WithResponse } from './internal/core/call-promise';
import { RestCallPromise } from './internal/core/call-promise';
import type { Client } from './internal/core/client';
import { clientFor, createClient } from './internal/core/client';
import { createConfig } from './internal/core/config';
import type { FailureBody, TransportErrorKind, TransportFailure } from './internal/core/errors';
import {
  AbortError,
  APIError,
  DecodeError,
  ElmoError,
  MissingCredentialError,
  TimeoutError,
  TransportError,
} from './internal/core/errors';
import type {
  AuthResolver,
  AuthScheme,
  AuthToken,
  AuthValue,
  BodyInput,
  BodyPayload,
  BodySerializerOptions,
  CallResult,
  CallTimeout,
  CredentialOptions,
  CredentialValue,
  MetadataInput,
  MetadataOptions,
  PageEnvelope,
  PageResult,
  PreparedRequest,
  Result,
  ResultEnvelope,
  RetryRules,
  Transport,
  TransportInteraction,
} from './internal/core/types';
import { authFeature } from './internal/feature/auth';
import type { Interceptors } from './internal/feature/interceptors';
import { interceptorsFeature } from './internal/feature/interceptors';
import type { LogFn, Logger, LogLevel } from './internal/feature/logger';
import { loggerFeature } from './internal/feature/logger';
import type { RetryOptions } from './internal/feature/retry';
import { retryFeature } from './internal/feature/retry';
import { rulesFeature } from './internal/feature/rules';
import type { TimeoutPolicy, TimeoutValue } from './internal/feature/timeout';
import { timeoutFeature } from './internal/feature/timeout';
import { validateFeature } from './internal/feature/validate';
import type { Page } from './internal/page/page';
import { PagePromise } from './internal/page/page';
import type { Fetch, FetchOptions } from './internal/transport/fetch';
import { createFetchTransport } from './internal/transport/fetch';
import { Brands } from './resources/brands';
import { Competitors } from './resources/competitors';
import { Me } from './resources/identity';
import { Models } from './resources/models';
import { Organizations } from './resources/organizations';
import { Prompts } from './resources/prompts';
import { Reports } from './resources/reports';
import type { RequestOptions } from './resources/shared/request-options';
import { ElmoResource } from './resources/shared/resource';
import { Tools } from './resources/tools';
import type { DateRange, TagsFilter } from './types/analytics';
import type {
  Brand,
  BrandsList,
  CreateBrandErrors,
  CreateBrandParams,
  CreateBrandResponses,
  GetBrandErrors,
  GetBrandResponses,
  ListBrandsErrors,
  ListBrandsParams,
  ListBrandsResponses,
  UpdateBrandErrors,
  UpdateBrandParams,
  UpdateBrandResponses,
} from './types/brands';
import type {
  Competitor,
  CompetitorsList,
  CreateCompetitorErrors,
  CreateCompetitorParams,
  CreateCompetitorResponses,
  DeleteCompetitorErrors,
  DeleteCompetitorResponses,
  GetCompetitorErrors,
  GetCompetitorResponses,
  ListCompetitorsErrors,
  ListCompetitorsParams,
  ListCompetitorsResponses,
  UpdateCompetitorErrors,
  UpdateCompetitorParams,
  UpdateCompetitorResponses,
} from './types/competitors';
import type { APIKeyIdentity, GetMeErrors, GetMeResponses } from './types/identity';
import type { ListModelsErrors, ListModelsResponses, Model, ModelList } from './types/models';
import type {
  GetOrganizationErrors,
  GetOrganizationResponses,
  ListOrganizationsErrors,
  ListOrganizationsParams,
  ListOrganizationsResponses,
  Organization,
  OrganizationList,
} from './types/organizations';
import type {
  CreatePromptErrors,
  CreatePromptParams,
  CreatePromptResponses,
  DeletePromptErrors,
  DeletePromptResponse,
  DeletePromptResponses,
  GetPromptErrors,
  GetPromptResponses,
  ListPromptsErrors,
  ListPromptsParams,
  ListPromptsResponse,
  ListPromptsResponses,
  Prompt,
  UpdatePromptErrors,
  UpdatePromptParams,
  UpdatePromptResponses,
} from './types/prompts';
import type {
  CreateReportErrors,
  CreateReportParams,
  CreateReportResponse,
  CreateReportResponses,
  GetReportErrors,
  GetReportParams,
  GetReportResponse,
  GetReportResponses,
  ListReportsErrors,
  ListReportsParams,
  ListReportsResponse,
  ListReportsResponses,
  ReportPromptSnapshot,
  ReportSummary,
} from './types/reports';
import type { BrandIdPath } from './types/shared/brand-id-path';
import type {
  ConflictError as ConflictErrorResponse,
  PaymentRequiredError as PaymentRequiredErrorResponse,
} from './types/shared/conflict-error';
import type {
  Error,
  ForbiddenError,
  InternalServerError as InternalServerErrorResponse,
  RateLimitError as RateLimitErrorResponse,
  UnauthorizedError,
} from './types/shared/error';
import type { Limit } from './types/shared/limit';
import type { MentionEntry, MentionsSummary } from './types/shared/mention-entry';
import type { ModelFilter, WindowEnd, WindowStart } from './types/shared/model-filter';
import type { NotFoundError as NotFoundErrorResponse } from './types/shared/not-found-error';
import type { Page as PageParameter } from './types/shared/page';
import type { Pagination } from './types/shared/pagination';
import type { ValidationError } from './types/shared/validation-error';
import type {
  AnalyzeBrandErrors,
  AnalyzeBrandParams,
  AnalyzeBrandResponses,
  OnboardingSuggestion,
} from './types/tools';

/** The version of this package. */
export const VERSION = '0.1.1';

/** The address calls are sent to: a URL with its scheme. */
export type BaseURL = `${string}://${string}/api/v1` | (string & {});

/**
 * How this client sends calls. Set on the client, or on one call to
 * override it there.
 */
export type BehaviorOptions = {
  /**
   * Specify a custom `fetch` implementation.
   *
   * Defaults to the global `fetch`, read for each request.
   */
  fetch?: Fetch;
  /**
   * Additional `RequestInit` options passed to `fetch` calls.
   *
   * A call that sets this replaces the whole block the client set.
   */
  fetchOptions?: FetchOptions;
  /**
   * Run your own hooks around every call. Each is an array of functions, which
   * may be async.
   *
   * `request` reads the request after the credentials are on it and before it is
   * sent. `response` and `error` each return what the caller reads, so a hook
   * that only observes returns what it was given.
   */
  interceptors?: Interceptors;
  /**
   * Set the log level. Raise it to see what each call sent and what came back.
   * `'debug'` adds headers, with credentials hidden.
   *
   * Read from the `ELMO_LOG` environment variable when unset.
   *
   * @default 'off'
   */
  logLevel?: LogLevel;
  /**
   * Set the logger. Anything with `debug`, `error`, `info` and `warn` methods.
   * Defaults to `globalThis.console`.
   */
  logger?: Logger;
  /**
   * The most pages one walk fetches before it stops. Stepping through
   * `getNextPage()` by hand is not capped.
   *
   * @default 1000
   */
  maxPages?: number;
  /**
   * The maximum number of times a failed call is sent again.
   *
   * The same count as `retry.maxRetries`, which wins where both are set. It
   * counts retries and nothing else: `retry` decides which failures are retried.
   *
   * @default 2
   */
  maxRetries?: number;
  /**
   * How a failed call is retried, or `false` to send it once.
   *
   * @default { maxRetries: 2 }
   */
  retry?: RetryOptions | boolean;
  /**
   * The maximum time one attempt may run.
   *
   * Set `false` or `0` for no limit, or a function that returns the limit of one
   * call. It is given the operation as `METHOD /path` and the limit the call
   * would otherwise get.
   *
   * @default 60_000
   *
   * @unit milliseconds
   */
  timeout?: TimeoutValue;
  /**
   * Send calls through a transport of your own, for an HTTP library
   * this client does not use.
   *
   * To swap the `fetch` it calls, use `fetch` or `fetchOptions`.
   */
  transport?: Transport<string, 'unary'>;
};

/**
 * The credentials this API takes, each under its own name.
 *
 * Given to the constructor, one is sent with every call. Given to a call,
 * it is sent with that call alone.
 */
export type ClientCredentials = {
  /**
   * An instance admin key from `ADMIN_API_KEYS`, or an organization key
   * (`elmo_…`) issued from the dashboard. Its value starts with `elmo_`.
   *
   * Read from the `ELMO_API_KEY` environment variable when unset.
   */
  apiKey?: CredentialValue;
};

/** The options particular to this API. */
export type ClientNarrowing = {
  /**
   * Override the base URL calls are sent to.
   *
   * Read from the `ELMO_BASE_URL` environment variable when unset.
   *
   * @default '/api/v1'
   */
  baseURL?: BaseURL;
  /**
   * Build the client in a browser, where every visitor to the page can read
   * the credential it sends. Pass `true` only where the credential is meant
   * to be public, or a proxy adds it.
   */
  dangerouslyAllowBrowser?: boolean;
  /**
   * Headers to send with every call.
   *
   * Merged per name with whatever a call sets, and `null` drops one.
   */
  defaultHeaders?: MetadataOptions['headers'];
  /**
   * Path parameters every call starts from.
   *
   * Merged per name with whatever a call sets.
   */
  defaultPath?: MetadataOptions['path'];
  /**
   * Query parameters to add to every call.
   *
   * Merged per name with whatever a call sets, and `null` drops one.
   */
  defaultQuery?: MetadataOptions['query'];
};

/** Everything a client can be built with, and the defaults every call starts from. */
export type ClientOptions = BehaviorOptions &
  BodySerializerOptions &
  ClientCredentials &
  ClientNarrowing &
  CredentialOptions;

const declaredCredentials = { apiKey: { variable: 'ELMO_API_KEY' } };

let fetchTransportInstance: ReturnType<typeof createFetchTransport> | undefined;

export function fetchTransport() {
  return (fetchTransportInstance ??= createFetchTransport());
}

let clientInstance: ReturnType<typeof createClient> | undefined;

export function client() {
  return (clientInstance ??= createClient({
    codecs: [jsonCodec],
    credentials: declaredCredentials,
    defaults: createConfig({
      baseURL: '/api/v1',
      headers: { 'user-agent': `elmo-sdk/${VERSION} (typescript)` },
    }),
    env: { baseURL: 'ELMO_BASE_URL', logLevel: 'ELMO_LOG' },
    features: [
      rulesFeature(),
      authFeature({ schemes: declaredCredentials }),
      retryFeature(),
      loggerFeature(),
      timeoutFeature({
        ms: {
          overrides: [
            {
              include: {
                openapi: {
                  operations: ['GET /brands/{brandId}/opportunities', 'POST /tools/analyze'],
                },
              },
              ms: 600000,
            },
          ],
        },
      }),
      interceptorsFeature(),
      validateFeature(),
    ],
    guard: refuseBrowser,
    protocols: {
      rest: { binding: createRestBinding(simpleURL), transport: fetchTransport() },
    },
  }));
}

/**
 * A client for this API. Options given here apply to every call made
 * through it. Pass it to a call, or to an SDK, in place of the default one.
 *
 * @example
 * const elmo = createElmoClient({ apiKey: '…' });
 */
export function createElmoClient(options?: ClientOptions): Client {
  return clientFor(options, client());
}

/**
 * The Elmo API, as one object to call through.
 *
 * Pass `apiKey`, or set `ELMO_API_KEY` and pass nothing.
 *
 * Options given here apply to every call it makes.
 *
 * @example
 * const elmo = new Elmo();
 * await elmo.brands.list();
 */
export class Elmo extends ElmoResource {
  constructor(
    args?:
      | (ClientOptions & {
          client?: never;
        })
      | {
          /**
           * A client to dispatch through, in place of one built from options.
           *
           * For sharing one configured client across several SDKs, or for
           * one built with `createElmoClient`.
           */
          client: Client;
        },
  ) {
    super(clientFor(args, client()));
  }

  private _brands?: Brands;
  /** Manage brand records */
  get brands(): Brands {
    return (this._brands ??= new Brands(this.client));
  }

  private _competitors?: Competitors;
  /** Manage brand competitors */
  get competitors(): Competitors {
    return (this._competitors ??= new Competitors(this.client));
  }

  private _me?: Me;
  /** What the calling key is and what it may reach */
  get me(): Me {
    return (this._me ??= new Me(this.client));
  }

  private _models?: Models;
  /** The answer engines this deployment can track */
  get models(): Models {
    return (this._models ??= new Models(this.client));
  }

  private _organizations?: Organizations;
  /** Organizations, their plan limits, and their usage */
  get organizations(): Organizations {
    return (this._organizations ??= new Organizations(this.client));
  }

  private _prompts?: Prompts;
  /** Manage brand prompts */
  get prompts(): Prompts {
    return (this._prompts ??= new Prompts(this.client));
  }

  private _reports?: Reports;
  /** Generate and retrieve AI Share of Voice reports */
  get reports(): Reports {
    return (this._reports ??= new Reports(this.client));
  }

  private _tools?: Tools;
  /** One-shot helpers (e.g. brand analysis) that don't persist anything */
  get tools(): Tools {
    return (this._tools ??= new Tools(this.client));
  }

  /** A failure the API answered with, so there is a status and a reply to read. */
  static APIError = APIError;
  /**
   * Thrown when the caller called the request off before the API answered.
   *
   * Not a {@link TransportError}, so code that retries or reports a failed
   * connection leaves a call the caller cancelled alone.
   */
  static AbortError = AbortError;
  /** No usable credential reached the API: it was missing, unreadable, or rejected. */
  static AuthenticationError = AuthenticationError;
  /** The API could not read the request, so it did not act on it. */
  static BadRequestError = BadRequestError;
  /** The call collided with the resource's current state: a duplicate, or a concurrent change. */
  static ConflictError = ConflictError;
  /** A reply from the API that this SDK could not read, whatever its status. */
  static DecodeError = DecodeError;
  /** The base of every error this SDK throws, including one from a call that never arrived. */
  static ElmoError = ElmoError;
  /** The API failed after accepting the call. Every status from 500 up arrives as this. */
  static InternalServerError = InternalServerError;
  /** Thrown before the request goes out, when no credential satisfied the call. */
  static MissingCredentialError = MissingCredentialError;
  /** Nothing is at this address, or the credential may not see what is. */
  static NotFoundError = NotFoundError;
  /** The plan or the quota on this account does not cover the call. */
  static PaymentRequiredError = PaymentRequiredError;
  /** The credential was accepted, but it does not grant this call. */
  static PermissionDeniedError = PermissionDeniedError;
  /** Too many calls. {@link APIError.retryAfterMs} carries how long the API asked to wait. */
  static RateLimitError = RateLimitError;
  /**
   * Thrown when a call waited on the API for as long as it allowed, from sending
   * the request to the last byte of the reply.
   *
   * A reply with status 408 is an {@link APIError}, not one of these.
   */
  static TimeoutError = TimeoutError;
  /** Thrown when no whole answer arrived, so there is no reply to go on. */
  static TransportError = TransportError;
  /** The request was read, and its contents were rejected. */
  static UnprocessableEntityError = UnprocessableEntityError;
}

export declare namespace Elmo {
  export type {
    AnalyzeBrandErrors,
    AnalyzeBrandParams,
    AnalyzeBrandResponses,
    APIKeyIdentity,
    AuthResolver,
    AuthScheme,
    AuthToken,
    AuthValue,
    BackoffOptions,
    BaseURL,
    BodyInput,
    BodyPayload,
    Brand,
    BrandIdPath,
    Brands,
    BrandsList,
    CallResult,
    CallTimeout,
    Client,
    ClientOptions,
    Competitor,
    Competitors,
    CompetitorsList,
    ConflictErrorResponse,
    CreateBrandErrors,
    CreateBrandParams,
    CreateBrandResponses,
    CreateCompetitorErrors,
    CreateCompetitorParams,
    CreateCompetitorResponses,
    CreatePromptErrors,
    CreatePromptParams,
    CreatePromptResponses,
    CreateReportErrors,
    CreateReportParams,
    CreateReportResponse,
    CreateReportResponses,
    CredentialValue,
    DateRange,
    DeleteCompetitorErrors,
    DeleteCompetitorResponses,
    DeletePromptErrors,
    DeletePromptResponse,
    DeletePromptResponses,
    Error,
    FailureBody,
    Fetch,
    FetchOptions,
    ForbiddenError,
    GetBrandErrors,
    GetBrandResponses,
    GetCompetitorErrors,
    GetCompetitorResponses,
    GetMeErrors,
    GetMeResponses,
    GetOrganizationErrors,
    GetOrganizationResponses,
    GetPromptErrors,
    GetPromptResponses,
    GetReportErrors,
    GetReportParams,
    GetReportResponse,
    GetReportResponses,
    Interceptors,
    InternalServerErrorResponse,
    Jitter,
    Limit,
    ListBrandsErrors,
    ListBrandsParams,
    ListBrandsResponses,
    ListCompetitorsErrors,
    ListCompetitorsParams,
    ListCompetitorsResponses,
    ListModelsErrors,
    ListModelsResponses,
    ListOrganizationsErrors,
    ListOrganizationsParams,
    ListOrganizationsResponses,
    ListPromptsErrors,
    ListPromptsParams,
    ListPromptsResponse,
    ListPromptsResponses,
    ListReportsErrors,
    ListReportsParams,
    ListReportsResponse,
    ListReportsResponses,
    LogFn,
    Logger,
    LogLevel,
    Me,
    MentionEntry,
    MentionsSummary,
    MetadataInput,
    MetadataOptions,
    Model,
    ModelFilter,
    ModelList,
    Models,
    NotFoundErrorResponse,
    OnboardingSuggestion,
    Organization,
    OrganizationList,
    Organizations,
    Page,
    PageEnvelope,
    PageParameter,
    PagePromise,
    PageResult,
    Pagination,
    PaymentRequiredErrorResponse,
    PreparedRequest,
    Prompt,
    Prompts,
    RateLimitErrorResponse,
    ReportPromptSnapshot,
    Reports,
    ReportSummary,
    RequestOptions,
    RestCallPromise,
    Result,
    ResultEnvelope,
    RetryAfterHeader,
    RetryOptions,
    RetryRules,
    TagsFilter,
    TimeoutPolicy,
    TimeoutValue,
    Tools,
    Transport,
    TransportErrorKind,
    TransportFailure,
    TransportInteraction,
    UnauthorizedError,
    UpdateBrandErrors,
    UpdateBrandParams,
    UpdateBrandResponses,
    UpdateCompetitorErrors,
    UpdateCompetitorParams,
    UpdateCompetitorResponses,
    UpdatePromptErrors,
    UpdatePromptParams,
    UpdatePromptResponses,
    ValidationError,
    WindowEnd,
    WindowStart,
    WithResponse,
  };
}
