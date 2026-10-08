import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import { PagePromise, pages } from '../internal/page/page';
import { listPromptRunsDescriptor, listPromptRunsFields } from '../resources/runs';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  ListPromptRunsErrors,
  ListPromptRunsParams,
  RunList,
  RunSummary,
} from '../types/runs';

/**
 * List runs for a prompt
 *
 * Individual model answers behind the aggregates, newest first, without their text — the list stays
 * small enough to page through. Fetch `promptsRunsGet()` for the answer itself.
 */
export function promptsRunsList(
  client: Client,
  promptId: string,
  params: ListPromptRunsParams,
  options?: RequestOptions,
): PagePromise<RunSummary, RunList, ListPromptRunsErrors> {
  return pages(
    options?.client ?? client,
    listPromptRunsDescriptor,
    mergeParams(placeParams({ ...params, promptId }, listPromptRunsFields, 'query'), options),
  );
}
