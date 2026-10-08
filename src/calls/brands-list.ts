import type { Client } from '../internal/core/client';
import { groupParams, mergeParams } from '../internal/core/params';
import { PagePromise, pages } from '../internal/page/page';
import { listBrandsDescriptor } from '../resources/brands';
import type { RequestOptions } from '../resources/shared/request-options';
import type { Brand, BrandsList, ListBrandsErrors, ListBrandsParams } from '../types/brands';

export function brandsList(
  client: Client,
  params?: ListBrandsParams,
  options?: RequestOptions,
): PagePromise<Brand, BrandsList, ListBrandsErrors> {
  return pages(
    options?.client ?? client,
    listBrandsDescriptor,
    mergeParams(groupParams(params, 'query'), options),
  );
}
