import type { Client } from '../internal/core/client';
import { PagePromise, pages } from '../internal/core/page';
import { mergeParams, placeParams } from '../internal/core/params';
import {
  listBrandCitationURLsDescriptor,
  listBrandCitationUrlsFields,
} from '../resources/analytics';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  CitationURL,
  CitationURLList,
  ListBrandCitationURLsErrors,
  ListBrandCitationURLsParams,
} from '../types/analytics';
import type { BrandIdPath } from '../types/shared/brand-id-path';

/**
 * List cited URLs
 *
 * Individual pages the engines cited, with their category and page type.
 */
export function brandsCitationsURLsList(
  client: Client,
  brandId: BrandIdPath,
  params: ListBrandCitationURLsParams,
  options?: RequestOptions,
): PagePromise<CitationURL, CitationURLList, ListBrandCitationURLsErrors> {
  return pages(
    options?.client ?? client,
    listBrandCitationURLsDescriptor,
    mergeParams(placeParams({ ...params, brandId }, listBrandCitationUrlsFields, 'query'), options),
  );
}
