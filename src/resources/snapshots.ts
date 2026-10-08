import { apiKeyRequirements } from './shared/auth';
import type { RequestOptions } from './shared/request-options';
import { ElmoResource } from './shared/resource';
import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import { callable } from '../internal/core/callable';
import { mergeParams, placeParams } from '../internal/core/params';
import type {
  CitedURLEntry,
  GetPromptSnapshotErrors,
  GetPromptSnapshotParams,
  GetPromptSnapshotResponses,
  PromptSnapshot,
} from '../types/snapshots';

export const getPromptSnapshotFields = { path: ['promptId'] };

export const getPromptSnapshotDescriptor = /* @__PURE__ */ callable({
  address: '/prompts/{promptId}/snapshot',
  auth: apiKeyRequirements,
  method: 'get',
  returns: 'json',
} as const);

/** Aggregated analytics snapshots for prompts */
export class Snapshot extends ElmoResource {
  /**
   * Get an aggregated snapshot of mention and citation analytics for a specific prompt over a date
   * range. Use this to identify competitive gaps, track brand visibility trends, and discover top
   * cited URLs.
   *
   * @param promptId The ID of the prompt
   */
  public get(
    promptId: string,
    params: GetPromptSnapshotParams,
    options?: RequestOptions,
  ): RestCallPromise<GetPromptSnapshotResponses, GetPromptSnapshotErrors> {
    return callPromise(
      options?.client ?? this.client,
      getPromptSnapshotDescriptor,
      mergeParams(placeParams({ ...params, promptId }, getPromptSnapshotFields, 'query'), options),
    );
  }
}

export declare namespace Snapshot {
  export type {
    CitedURLEntry,
    GetPromptSnapshotErrors,
    GetPromptSnapshotParams,
    GetPromptSnapshotResponses,
    PromptSnapshot,
  };
}
