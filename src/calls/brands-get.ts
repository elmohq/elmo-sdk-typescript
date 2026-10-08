import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import { getBrandDescriptor, getBrandFields } from '../resources/brands';
import type { RequestOptions } from '../resources/shared/request-options';
import type { GetBrandErrors, GetBrandResponses } from '../types/brands';

/** Get a brand */
export function brandsGet(
  client: Client,
  brandId: string,
  options?: RequestOptions,
): RestCallPromise<GetBrandResponses, GetBrandErrors> {
  return callPromise(
    options?.client ?? client,
    getBrandDescriptor,
    mergeParams(placeParams({ brandId }, getBrandFields, 'query'), options),
  );
}
