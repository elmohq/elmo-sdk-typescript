import { Analytics, Citations, PromptPerformance, QueryFanout } from './analytics';
import { Opportunities } from './opportunities';
import { apiKeyRequirements } from './shared/auth';
import type { RequestOptions } from './shared/request-options';
import { ElmoResource } from './shared/resource';
import { brandNameRule, domainsRule, nameRule } from './shared/rule';
import { Tags } from './tags';
import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import { callable } from '../internal/core/callable';
import { groupParams, mergeParams, placeParams } from '../internal/core/params';
import { decoded, reviving } from '../internal/feature/validate';
import { PagePromise, pages } from '../internal/page/page';
import type {
  BrandAnalytics,
  BrandQueryFanout,
  DateRange,
  FanoutQuery,
  GetBrandAnalyticsErrors,
  GetBrandAnalyticsParams,
  GetBrandAnalyticsResponses,
  GetBrandQueryFanoutErrors,
  GetBrandQueryFanoutParams,
  GetBrandQueryFanoutResponses,
  ListBrandPromptPerformanceErrors,
  ListBrandPromptPerformanceParams,
  ListBrandPromptPerformanceResponses,
  ModelVisibility,
  PromptPerformanceList,
  ShareOfVoiceEntry,
  ShareOfVoicePoint,
  TagsFilter,
  VisibilityPoint,
} from '../types/analytics';
import type {
  Brand,
  BrandsList,
  CreateBrandErrors,
  CreateBrandParams,
  CreateBrandResponses,
  GetBrandErrors,
  GetBrandResponses,
  ListBrandsErrors,
  ListBrandsParams,
  ListBrandsResponses,
  UpdateBrandErrors,
  UpdateBrandParams,
  UpdateBrandResponses,
} from '../types/brands';
import type {
  BrandOpportunities,
  CitedPage,
  GetBrandOpportunitiesErrors,
  GetBrandOpportunitiesResponses,
  Opportunity,
  OpportunityPrompt,
} from '../types/opportunities';
import type { BrandIdPath } from '../types/shared/brand-id-path';
import type { ListBrandTagsErrors, ListBrandTagsResponses, Tag, TagList } from '../types/tags';

function reviveBrand(value: Brand): void {
  if (value.createdAt != null) {
    value.createdAt = decoded('Brand.createdAt', value.createdAt, (raw) => new Date(raw));
  }
  if (value.updatedAt != null) {
    value.updatedAt = decoded('Brand.updatedAt', value.updatedAt, (raw) => new Date(raw));
  }
}

function reviveBrandsList(value: BrandsList): void {
  if (value.data != null) {
    value.data.forEach((item) => {
      reviveBrand(item);
    });
  }
  if (value.brands != null) {
    value.brands.forEach((item) => {
      reviveBrand(item);
    });
  }
}

export const listBrandsDescriptor = /* @__PURE__ */ callable({
  address: '/brands',
  auth: apiKeyRequirements,
  method: 'get',
  pagination: {
    items: 'data',
    limitParam: 'limit',
    pages: 'pagination.totalPages',
    param: 'page',
    size: 'pagination.limit',
    style: 'page',
    total: 'pagination.total',
  },
  returns: 'json',
  validators: { response: /* @__PURE__ */ reviving(reviveBrandsList) },
} as const);

export const createBrandDescriptor = /* @__PURE__ */ callable({
  address: '/brands',
  auth: apiKeyRequirements,
  mediaType: 'application/json',
  method: 'post',
  returns: 'json',
  rules: [
    {
      min: 1,
      name: 'id',
      of: 'characters',
    },
    nameRule,
    domainsRule,
  ],
  validators: { response: /* @__PURE__ */ reviving(reviveBrand) },
} as const);

export const getBrandFields = { path: ['brandId'] };

export const getBrandDescriptor = /* @__PURE__ */ callable({
  address: '/brands/{brandId}',
  auth: apiKeyRequirements,
  method: 'get',
  returns: 'json',
  validators: { response: /* @__PURE__ */ reviving(reviveBrand) },
} as const);

export const updateBrandFields = { path: ['brandId'] };

export const updateBrandDescriptor = /* @__PURE__ */ callable({
  address: '/brands/{brandId}',
  auth: apiKeyRequirements,
  mediaType: 'application/json',
  method: 'patch',
  returns: 'json',
  rules: [brandNameRule, domainsRule],
  validators: { response: /* @__PURE__ */ reviving(reviveBrand) },
} as const);

/** Manage brand records */
export class Brands extends ElmoResource {
  /** Create a brand */
  public create(
    params: CreateBrandParams,
    options?: RequestOptions,
  ): RestCallPromise<CreateBrandResponses, CreateBrandErrors> {
    return callPromise(
      options?.client ?? this.client,
      createBrandDescriptor,
      mergeParams(groupParams(params, 'body'), options),
    );
  }

  /**
   * Get a brand
   *
   * @param brandId Brand identifier
   */
  public get(
    brandId: string,
    options?: RequestOptions,
  ): RestCallPromise<GetBrandResponses, GetBrandErrors> {
    return callPromise(
      options?.client ?? this.client,
      getBrandDescriptor,
      mergeParams(placeParams({ brandId }, getBrandFields, 'query'), options),
    );
  }

  public list(
    params?: ListBrandsParams,
    options?: RequestOptions,
  ): PagePromise<Brand, BrandsList, ListBrandsErrors> {
    return pages(
      options?.client ?? this.client,
      listBrandsDescriptor,
      mergeParams(groupParams(params, 'query'), options),
    );
  }

  /**
   * Update a brand
   *
   * @param brandId Brand identifier
   */
  public update(
    brandId: string,
    params: UpdateBrandParams,
    options?: RequestOptions,
  ): RestCallPromise<UpdateBrandResponses, UpdateBrandErrors> {
    return callPromise(
      options?.client ?? this.client,
      updateBrandDescriptor,
      mergeParams(placeParams({ ...params, brandId }, updateBrandFields, 'body'), options),
    );
  }

  private _analytics?: Analytics;
  /** Aggregated visibility, share of voice, citations, and query fan-out for a brand */
  get analytics(): Analytics {
    return (this._analytics ??= new Analytics(this.client));
  }

  private _citations?: Citations;
  get citations(): Citations {
    return (this._citations ??= new Citations(this.client));
  }

  private _opportunities?: Opportunities;
  /** Where a brand could win more citations, and why */
  get opportunities(): Opportunities {
    return (this._opportunities ??= new Opportunities(this.client));
  }

  private _promptPerformance?: PromptPerformance;
  /** Aggregated visibility, share of voice, citations, and query fan-out for a brand */
  get promptPerformance(): PromptPerformance {
    return (this._promptPerformance ??= new PromptPerformance(this.client));
  }

  private _queryFanout?: QueryFanout;
  /** Aggregated visibility, share of voice, citations, and query fan-out for a brand */
  get queryFanout(): QueryFanout {
    return (this._queryFanout ??= new QueryFanout(this.client));
  }

  private _tags?: Tags;
  /** The tags in use on a brand's prompts */
  get tags(): Tags {
    return (this._tags ??= new Tags(this.client));
  }
}

export declare namespace Brands {
  export type {
    Analytics,
    Brand,
    BrandAnalytics,
    BrandIdPath,
    BrandOpportunities,
    BrandQueryFanout,
    BrandsList,
    Citations,
    CitedPage,
    CreateBrandErrors,
    CreateBrandParams,
    CreateBrandResponses,
    DateRange,
    FanoutQuery,
    GetBrandAnalyticsErrors,
    GetBrandAnalyticsParams,
    GetBrandAnalyticsResponses,
    GetBrandErrors,
    GetBrandOpportunitiesErrors,
    GetBrandOpportunitiesResponses,
    GetBrandQueryFanoutErrors,
    GetBrandQueryFanoutParams,
    GetBrandQueryFanoutResponses,
    GetBrandResponses,
    ListBrandPromptPerformanceErrors,
    ListBrandPromptPerformanceParams,
    ListBrandPromptPerformanceResponses,
    ListBrandsErrors,
    ListBrandsParams,
    ListBrandsResponses,
    ListBrandTagsErrors,
    ListBrandTagsResponses,
    ModelVisibility,
    Opportunities,
    Opportunity,
    OpportunityPrompt,
    PromptPerformance,
    PromptPerformanceList,
    QueryFanout,
    ShareOfVoiceEntry,
    ShareOfVoicePoint,
    Tag,
    TagList,
    Tags,
    TagsFilter,
    UpdateBrandErrors,
    UpdateBrandParams,
    UpdateBrandResponses,
    VisibilityPoint,
  };
}
