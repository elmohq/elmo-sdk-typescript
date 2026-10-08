import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import { updateCompetitorDescriptor, updateCompetitorFields } from '../resources/competitors';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  UpdateCompetitorErrors,
  UpdateCompetitorParams,
  UpdateCompetitorResponses,
} from '../types/competitors';

/** Update a competitor */
export function competitorsUpdate(
  client: Client,
  competitorId: string,
  params: UpdateCompetitorParams,
  options?: RequestOptions,
): RestCallPromise<UpdateCompetitorResponses, UpdateCompetitorErrors> {
  return callPromise(
    options?.client ?? client,
    updateCompetitorDescriptor,
    mergeParams(placeParams({ ...params, competitorId }, updateCompetitorFields, 'body'), options),
  );
}
