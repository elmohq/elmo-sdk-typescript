import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import { getRunDescriptor, getRunFields } from '../resources/runs';
import type { RequestOptions } from '../resources/shared/request-options';
import type { GetRunErrors, GetRunResponses } from '../types/runs';

/**
 * Get a run
 *
 * One model answer, with its text normalized out of the provider’s response and its citations in
 * the order the engine listed them. A run belonging to some other prompt answers `404`. The
 * provider’s raw payload is deliberately not exposed — its shape belongs to the provider, not to
 * this API.
 */
export function promptsRunsGet(
  client: Client,
  promptId: string,
  runId: string,
  options?: RequestOptions,
): RestCallPromise<GetRunResponses, GetRunErrors> {
  return callPromise(
    options?.client ?? client,
    getRunDescriptor,
    mergeParams(placeParams({ promptId, runId }, getRunFields, 'query'), options),
  );
}
