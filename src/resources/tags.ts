import { apiKeyRequirements } from './shared/auth';
import type { RequestOptions } from './shared/request-options';
import { ElmoResource } from './shared/resource';
import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import { callable } from '../internal/core/callable';
import { mergeParams, placeParams } from '../internal/core/params';
import type { BrandIdPath } from '../types/shared/brand-id-path';
import type { ListBrandTagsErrors, ListBrandTagsResponses, Tag, TagList } from '../types/tags';

export const listBrandTagsFields = { path: ['brandId'] };

export const listBrandTagsDescriptor = /* @__PURE__ */ callable({
  address: '/brands/{brandId}/tags',
  auth: apiKeyRequirements,
  method: 'get',
  returns: 'json',
} as const);

/** The tags in use on a brand's prompts */
export class Tags extends ElmoResource {
  /**
   * List a brand's tags
   *
   * Every tag in use on the brand's prompts, with how many carry each — enough to build the same
   * filter the dashboard shows without paging the whole prompt list to derive it.
   *
   * Tags are not a resource of their own: a tag exists exactly as long as some prompt carries it.
   * `branded` and `unbranded` are computed by Elmo and always listed.
   *
   * @param brandId Brand identifier.
   */
  public list(
    brandId: BrandIdPath,
    options?: RequestOptions,
  ): RestCallPromise<ListBrandTagsResponses, ListBrandTagsErrors> {
    return callPromise(
      options?.client ?? this.client,
      listBrandTagsDescriptor,
      mergeParams(placeParams({ brandId }, listBrandTagsFields, 'query'), options),
    );
  }
}

export declare namespace Tags {
  export type { ListBrandTagsErrors, ListBrandTagsResponses, Tag, TagList };
}
