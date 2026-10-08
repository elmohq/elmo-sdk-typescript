import { apiKeyRequirements } from './shared/auth';
import type { RequestOptions } from './shared/request-options';
import { ElmoResource } from './shared/resource';
import { nameRule } from './shared/rule';
import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import { callable } from '../internal/core/callable';
import { groupParams, mergeParams, placeParams } from '../internal/core/params';
import { decoded, reviving } from '../internal/feature/validate';
import { PagePromise, pages } from '../internal/page/page';
import type {
  Competitor,
  CompetitorsList,
  CreateCompetitorErrors,
  CreateCompetitorParams,
  CreateCompetitorResponses,
  DeleteCompetitorErrors,
  DeleteCompetitorResponses,
  GetCompetitorErrors,
  GetCompetitorResponses,
  ListCompetitorsErrors,
  ListCompetitorsParams,
  ListCompetitorsResponses,
  UpdateCompetitorErrors,
  UpdateCompetitorParams,
  UpdateCompetitorResponses,
} from '../types/competitors';

function reviveCompetitor(value: Competitor): void {
  if (value.createdAt != null) {
    value.createdAt = decoded('Competitor.createdAt', value.createdAt, (raw) => new Date(raw));
  }
  if (value.updatedAt != null) {
    value.updatedAt = decoded('Competitor.updatedAt', value.updatedAt, (raw) => new Date(raw));
  }
}

function reviveCompetitorsList(value: CompetitorsList): void {
  if (value.data != null) {
    value.data.forEach((item) => {
      reviveCompetitor(item);
    });
  }
  if (value.competitors != null) {
    value.competitors.forEach((item) => {
      reviveCompetitor(item);
    });
  }
}

export const listCompetitorsDescriptor = /* @__PURE__ */ callable({
  address: '/competitors',
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
  validators: { response: /* @__PURE__ */ reviving(reviveCompetitorsList) },
} as const);

export const createCompetitorDescriptor = /* @__PURE__ */ callable({
  address: '/competitors',
  auth: apiKeyRequirements,
  mediaType: 'application/json',
  method: 'post',
  returns: 'json',
  rules: [
    {
      min: 1,
      name: 'brandId',
      of: 'characters',
    },
    nameRule,
  ],
  validators: { response: /* @__PURE__ */ reviving(reviveCompetitor) },
} as const);

export const deleteCompetitorFields = { path: ['competitorId'] };

export const deleteCompetitorDescriptor = /* @__PURE__ */ callable({
  address: '/competitors/{competitorId}',
  auth: apiKeyRequirements,
  method: 'delete',
  returns: 'json',
  validators: { response: /* @__PURE__ */ reviving(reviveCompetitor) },
} as const);

export const getCompetitorFields = { path: ['competitorId'] };

export const getCompetitorDescriptor = /* @__PURE__ */ callable({
  address: '/competitors/{competitorId}',
  auth: apiKeyRequirements,
  method: 'get',
  returns: 'json',
  validators: { response: /* @__PURE__ */ reviving(reviveCompetitor) },
} as const);

export const updateCompetitorFields = { path: ['competitorId'] };

export const updateCompetitorDescriptor = /* @__PURE__ */ callable({
  address: '/competitors/{competitorId}',
  auth: apiKeyRequirements,
  mediaType: 'application/json',
  method: 'patch',
  returns: 'json',
  rules: [nameRule],
  validators: { response: /* @__PURE__ */ reviving(reviveCompetitor) },
} as const);

/** Manage brand competitors */
export class Competitors extends ElmoResource {
  /** Add a competitor */
  public create(
    params: CreateCompetitorParams,
    options?: RequestOptions,
  ): RestCallPromise<CreateCompetitorResponses, CreateCompetitorErrors> {
    return callPromise(
      options?.client ?? this.client,
      createCompetitorDescriptor,
      mergeParams(groupParams(params, 'body'), options),
    );
  }

  /**
   * Delete a competitor
   *
   * @param competitorId Competitor identifier (UUID)
   */
  public delete(
    competitorId: string,
    options?: RequestOptions,
  ): RestCallPromise<DeleteCompetitorResponses, DeleteCompetitorErrors> {
    return callPromise(
      options?.client ?? this.client,
      deleteCompetitorDescriptor,
      mergeParams(placeParams({ competitorId }, deleteCompetitorFields, 'query'), options),
    );
  }

  /**
   * Get a competitor
   *
   * @param competitorId Competitor identifier (UUID)
   */
  public get(
    competitorId: string,
    options?: RequestOptions,
  ): RestCallPromise<GetCompetitorResponses, GetCompetitorErrors> {
    return callPromise(
      options?.client ?? this.client,
      getCompetitorDescriptor,
      mergeParams(placeParams({ competitorId }, getCompetitorFields, 'query'), options),
    );
  }

  public list(
    params?: ListCompetitorsParams,
    options?: RequestOptions,
  ): PagePromise<Competitor, CompetitorsList, ListCompetitorsErrors> {
    return pages(
      options?.client ?? this.client,
      listCompetitorsDescriptor,
      mergeParams(groupParams(params, 'query'), options),
    );
  }

  /**
   * Update a competitor
   *
   * @param competitorId Competitor identifier (UUID)
   */
  public update(
    competitorId: string,
    params: UpdateCompetitorParams,
    options?: RequestOptions,
  ): RestCallPromise<UpdateCompetitorResponses, UpdateCompetitorErrors> {
    return callPromise(
      options?.client ?? this.client,
      updateCompetitorDescriptor,
      mergeParams(
        placeParams({ ...params, competitorId }, updateCompetitorFields, 'body'),
        options,
      ),
    );
  }
}

export declare namespace Competitors {
  export type {
    Competitor,
    CompetitorsList,
    CreateCompetitorErrors,
    CreateCompetitorParams,
    CreateCompetitorResponses,
    DeleteCompetitorErrors,
    DeleteCompetitorResponses,
    GetCompetitorErrors,
    GetCompetitorResponses,
    ListCompetitorsErrors,
    ListCompetitorsParams,
    ListCompetitorsResponses,
    UpdateCompetitorErrors,
    UpdateCompetitorParams,
    UpdateCompetitorResponses,
  };
}
