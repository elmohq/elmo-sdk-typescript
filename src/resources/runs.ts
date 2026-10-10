import { apiKeyRequirements } from './shared/auth';
import type { RequestOptions } from './shared/request-options';
import { ElmoResource } from './shared/resource';
import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import { callable } from '../internal/core/callable';
import { mergeParams, placeParams } from '../internal/core/params';
import type { Mutable } from '../internal/feature/validate';
import { decoded, reviving } from '../internal/feature/validate';
import { PagePromise, pages } from '../internal/page/page';
import type {
  GetRunErrors,
  GetRunResponses,
  ListPromptRunsErrors,
  ListPromptRunsParams,
  ListPromptRunsResponses,
  Run,
  RunCitation,
  RunList,
  RunSummary,
} from '../types/runs';

export const listPromptRunsFields = { path: ['promptId'] };

function reviveRunSummary(value: Mutable<RunSummary>): void {
  if (value.createdAt != null) {
    value.createdAt = decoded('RunSummary.createdAt', value.createdAt, (raw) => new Date(raw));
  }
}

function reviveRunList(value: Mutable<RunList>): void {
  if (value.data != null) {
    value.data.forEach((item) => {
      reviveRunSummary(item);
    });
  }
}

export const listPromptRunsDescriptor = /* @__PURE__ */ callable({
  address: '/prompts/{promptId}/runs',
  auth: apiKeyRequirements,
  method: 'get',
  pagination: {
    items: 'data',
    limitParam: 'limit',
    pages: 'pagination.totalPages',
    param: 'page',
    size: 'pagination.limit',
    style: 'page',
    total: 'pagination.total',
  },
  returns: 'json',
  validators: { response: /* @__PURE__ */ reviving(reviveRunList) },
} as const);

export const getRunFields = { path: ['promptId', 'runId'] };

function reviveRun(value: Mutable<Run>): void {
  if (value.createdAt != null) {
    value.createdAt = decoded('Run.createdAt', value.createdAt, (raw) => new Date(raw));
  }
}

export const getRunDescriptor = /* @__PURE__ */ callable({
  address: '/prompts/{promptId}/runs/{runId}',
  auth: apiKeyRequirements,
  method: 'get',
  returns: 'json',
  validators: { response: /* @__PURE__ */ reviving(reviveRun) },
} as const);

/** Individual model answers behind the aggregates */
export class Runs extends ElmoResource {
  /**
   * Get a run
   *
   * One model answer, with its text normalized out of the provider’s response and its citations in
   * the order the engine listed them. A run belonging to some other prompt answers `404`. The
   * provider’s raw payload is deliberately not exposed — its shape belongs to the provider, not to
   * this API.
   */
  public get(
    promptId: string,
    runId: string,
    options?: RequestOptions,
  ): RestCallPromise<GetRunResponses, GetRunErrors> {
    return callPromise(
      options?.client ?? this.client,
      getRunDescriptor,
      mergeParams(placeParams({ promptId, runId }, getRunFields, 'query'), options),
    );
  }

  /**
   * List runs for a prompt
   *
   * Individual model answers behind the aggregates, newest first, without their text — the list
   * stays small enough to page through. Fetch `prompts.runs.get()` for the answer itself.
   */
  public list(
    promptId: string,
    params: ListPromptRunsParams,
    options?: RequestOptions,
  ): PagePromise<RunSummary, RunList, ListPromptRunsErrors> {
    return pages(
      options?.client ?? this.client,
      listPromptRunsDescriptor,
      mergeParams(placeParams({ ...params, promptId }, listPromptRunsFields, 'query'), options),
    );
  }
}

export declare namespace Runs {
  export type {
    GetRunErrors,
    GetRunResponses,
    ListPromptRunsErrors,
    ListPromptRunsParams,
    ListPromptRunsResponses,
    Run,
    RunCitation,
    RunList,
    RunSummary,
  };
}
