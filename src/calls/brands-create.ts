import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { groupParams, mergeParams } from '../internal/core/params';
import { createBrandDescriptor } from '../resources/brands';
import type { RequestOptions } from '../resources/shared/request-options';
import type { CreateBrandErrors, CreateBrandParams, CreateBrandResponses } from '../types/brands';

/**
 * Create a brand
 *
 * A brand, its competitors and its prompts, created in one request. They are written together, so a
 * request that fails leaves none of them behind, and the prompts are scheduled for execution as
 * soon as the brand exists.
 *
 * Brand ids are chosen by the caller and unique across the instance: an id that is already taken
 * answers `409`, without saying who holds it. A competitor with no domain other than the brand's
 * own website is skipped.
 */
export function brandsCreate(
  client: Client,
  params: CreateBrandParams,
  options?: RequestOptions,
): RestCallPromise<CreateBrandResponses, CreateBrandErrors> {
  return callPromise(
    options?.client ?? client,
    createBrandDescriptor,
    mergeParams(groupParams(params, 'body'), options),
  );
}
