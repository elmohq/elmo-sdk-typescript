import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import { deleteCompetitorDescriptor, deleteCompetitorFields } from '../resources/competitors';
import type { RequestOptions } from '../resources/shared/request-options';
import type { DeleteCompetitorErrors, DeleteCompetitorResponses } from '../types/competitors';

/** Delete a competitor */
export function competitorsDelete(
  client: Client,
  competitorId: string,
  options?: RequestOptions,
): RestCallPromise<DeleteCompetitorResponses, DeleteCompetitorErrors> {
  return callPromise(
    options?.client ?? client,
    deleteCompetitorDescriptor,
    mergeParams(placeParams({ competitorId }, deleteCompetitorFields, 'query'), options),
  );
}
