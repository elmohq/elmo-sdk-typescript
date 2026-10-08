import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import {
  listBrandCitationURLsDescriptor,
  listBrandCitationUrlsFields,
} from '../resources/analytics';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  ListBrandCitationURLsErrors,
  ListBrandCitationURLsParams,
  ListBrandCitationURLsResponses,
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
): RestCallPromise<ListBrandCitationURLsResponses, ListBrandCitationURLsErrors> {
  return callPromise(
    options?.client ?? client,
    listBrandCitationURLsDescriptor,
    mergeParams(placeParams({ ...params, brandId }, listBrandCitationUrlsFields, 'query'), options),
  );
}
