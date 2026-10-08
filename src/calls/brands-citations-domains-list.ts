import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import {
  listBrandCitationDomainsDescriptor,
  listBrandCitationDomainsFields,
} from '../resources/analytics';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  ListBrandCitationDomainsErrors,
  ListBrandCitationDomainsParams,
  ListBrandCitationDomainsResponses,
} from '../types/analytics';
import type { BrandIdPath } from '../types/shared/brand-id-path';

/**
 * List cited domains
 *
 * Domains the engines cited when answering this brand's prompts, categorized and compared against
 * the equal-length window immediately before this one.
 */
export function brandsCitationsDomainsList(
  client: Client,
  brandId: BrandIdPath,
  params: ListBrandCitationDomainsParams,
  options?: RequestOptions,
): RestCallPromise<ListBrandCitationDomainsResponses, ListBrandCitationDomainsErrors> {
  return callPromise(
    options?.client ?? client,
    listBrandCitationDomainsDescriptor,
    mergeParams(
      placeParams({ ...params, brandId }, listBrandCitationDomainsFields, 'query'),
      options,
    ),
  );
}
