import type { Client } from '../internal/core/client';
import { PagePromise, pages } from '../internal/core/page';
import { mergeParams, placeParams } from '../internal/core/params';
import { getBrandQueryFanoutDescriptor, getBrandQueryFanoutFields } from '../resources/analytics';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  BrandQueryFanout,
  FanoutQuery,
  GetBrandQueryFanoutErrors,
  GetBrandQueryFanoutParams,
} from '../types/analytics';
import type { BrandIdPath } from '../types/shared/brand-id-path';

/**
 * Get query fan-out
 *
 * The searches engines ran while answering this brand's prompts. Engines that don't expose their
 * searches still contribute runs, so `coverageRate` is the honest denominator.
 */
export function brandsQueryFanoutGet(
  client: Client,
  brandId: BrandIdPath,
  params: GetBrandQueryFanoutParams,
  options?: RequestOptions,
): PagePromise<FanoutQuery, BrandQueryFanout, GetBrandQueryFanoutErrors> {
  return pages(
    options?.client ?? client,
    getBrandQueryFanoutDescriptor,
    mergeParams(placeParams({ ...params, brandId }, getBrandQueryFanoutFields, 'query'), options),
  );
}
