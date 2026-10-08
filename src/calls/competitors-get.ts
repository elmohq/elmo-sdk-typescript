import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import { getCompetitorDescriptor, getCompetitorFields } from '../resources/competitors';
import type { RequestOptions } from '../resources/shared/request-options';
import type { GetCompetitorErrors, GetCompetitorResponses } from '../types/competitors';

/** Get a competitor */
export function competitorsGet(
  client: Client,
  competitorId: string,
  options?: RequestOptions,
): RestCallPromise<GetCompetitorResponses, GetCompetitorErrors> {
  return callPromise(
    options?.client ?? client,
    getCompetitorDescriptor,
    mergeParams(placeParams({ competitorId }, getCompetitorFields, 'query'), options),
  );
}
