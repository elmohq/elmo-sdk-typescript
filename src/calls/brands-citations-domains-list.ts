import type { Client } from '../internal/core/client';
import { PagePromise, pages } from '../internal/core/page';
import { mergeParams, placeParams } from '../internal/core/params';
import {
  listBrandCitationDomainsDescriptor,
  listBrandCitationDomainsFields,
} from '../resources/analytics';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  CitationDomain,
  CitationDomainList,
  ListBrandCitationDomainsErrors,
  ListBrandCitationDomainsParams,
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
): PagePromise<CitationDomain, CitationDomainList, ListBrandCitationDomainsErrors> {
  return pages(
    options?.client ?? client,
    listBrandCitationDomainsDescriptor,
    mergeParams(
      placeParams({ ...params, brandId }, listBrandCitationDomainsFields, 'query'),
      options,
    ),
  );
}
