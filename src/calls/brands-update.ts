import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import { updateBrandDescriptor, updateBrandFields } from '../resources/brands';
import type { RequestOptions } from '../resources/shared/request-options';
import type { UpdateBrandErrors, UpdateBrandParams, UpdateBrandResponses } from '../types/brands';

/** Update a brand */
export function brandsUpdate(
  client: Client,
  brandId: string,
  params: UpdateBrandParams,
  options?: RequestOptions,
): RestCallPromise<UpdateBrandResponses, UpdateBrandErrors> {
  return callPromise(
    options?.client ?? client,
    updateBrandDescriptor,
    mergeParams(placeParams({ ...params, brandId }, updateBrandFields, 'body'), options),
  );
}
