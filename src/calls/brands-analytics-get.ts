import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import { getBrandAnalyticsDescriptor, getBrandAnalyticsFields } from '../resources/analytics';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  GetBrandAnalyticsErrors,
  GetBrandAnalyticsParams,
  GetBrandAnalyticsResponses,
} from '../types/analytics';
import type { BrandIdPath } from '../types/shared/brand-id-path';

/**
 * Get a brand's analytics
 *
 * Visibility, share of voice, the per-model breakdown and the citation totals for one window, in
 * one request.
 *
 * The long lists — cited domains and URLs, sub-queries, per-prompt results — are endpoints of their
 * own. Everything else is always included.
 */
export function brandsAnalyticsGet(
  client: Client,
  brandId: BrandIdPath,
  params: GetBrandAnalyticsParams,
  options?: RequestOptions,
): RestCallPromise<GetBrandAnalyticsResponses, GetBrandAnalyticsErrors> {
  return callPromise(
    options?.client ?? client,
    getBrandAnalyticsDescriptor,
    mergeParams(placeParams({ ...params, brandId }, getBrandAnalyticsFields, 'query'), options),
  );
}
