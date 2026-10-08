import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import {
  listBrandPromptPerformanceDescriptor,
  listBrandPromptPerformanceFields,
} from '../resources/analytics';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  ListBrandPromptPerformanceErrors,
  ListBrandPromptPerformanceParams,
  ListBrandPromptPerformanceResponses,
} from '../types/analytics';
import type { BrandIdPath } from '../types/shared/brand-id-path';

/**
 * List prompt performance
 *
 * Per-prompt mention rates over the window. The analytics counterpart to `GET /prompts?brandId=`,
 * which returns prompt configuration rather than results.
 *
 * A prompt the brand stopped tracking is not sampled, so it has no results over the window and does
 * not appear here.
 */
export function brandsPromptPerformanceList(
  client: Client,
  brandId: BrandIdPath,
  params: ListBrandPromptPerformanceParams,
  options?: RequestOptions,
): RestCallPromise<ListBrandPromptPerformanceResponses, ListBrandPromptPerformanceErrors> {
  return callPromise(
    options?.client ?? client,
    listBrandPromptPerformanceDescriptor,
    mergeParams(
      placeParams({ ...params, brandId }, listBrandPromptPerformanceFields, 'query'),
      options,
    ),
  );
}
