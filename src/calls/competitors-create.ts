import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { groupParams, mergeParams } from '../internal/core/params';
import { createCompetitorDescriptor } from '../resources/competitors';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  CreateCompetitorErrors,
  CreateCompetitorParams,
  CreateCompetitorResponses,
} from '../types/competitors';

/**
 * Add a competitor
 *
 * A `brandId` outside the key's reach answers `400`, identically to one that does not exist. A
 * brand tracks at most 500 competitors; adding one past that answers `409`.
 */
export function competitorsCreate(
  client: Client,
  params: CreateCompetitorParams,
  options?: RequestOptions,
): RestCallPromise<CreateCompetitorResponses, CreateCompetitorErrors> {
  return callPromise(
    options?.client ?? client,
    createCompetitorDescriptor,
    mergeParams(groupParams(params, 'body'), options),
  );
}
