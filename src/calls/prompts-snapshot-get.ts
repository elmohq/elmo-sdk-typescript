import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import type { RequestOptions } from '../resources/shared/request-options';
import { getPromptSnapshotDescriptor, getPromptSnapshotFields } from '../resources/snapshots';
import type {
  GetPromptSnapshotErrors,
  GetPromptSnapshotParams,
  GetPromptSnapshotResponses,
} from '../types/snapshots';

/**
 * Get an aggregated snapshot of mention and citation analytics for a specific prompt over a date
 * range. Use this to identify competitive gaps, track brand visibility trends, and discover top
 * cited URLs.
 */
export function promptsSnapshotGet(
  client: Client,
  promptId: string,
  params: GetPromptSnapshotParams,
  options?: RequestOptions,
): RestCallPromise<GetPromptSnapshotResponses, GetPromptSnapshotErrors> {
  return callPromise(
    options?.client ?? client,
    getPromptSnapshotDescriptor,
    mergeParams(placeParams({ ...params, promptId }, getPromptSnapshotFields, 'query'), options),
  );
}
