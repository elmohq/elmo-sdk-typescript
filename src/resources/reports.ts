import { apiKeyRequirements } from './shared/auth';
import type { RequestOptions } from './shared/request-options';
import { ElmoResource } from './shared/resource';
import { brandNameRule } from './shared/rule';
import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import { callable } from '../internal/core/callable';
import { groupParams, mergeParams, placeParams } from '../internal/core/params';
import type { Mutable } from '../internal/feature/validate';
import { decoded } from '../internal/feature/validate';
import { PagePromise, pages } from '../internal/page/page';
import type {
  CreateReportErrors,
  CreateReportParams,
  CreateReportResponse,
  CreateReportResponses,
  GetReportErrors,
  GetReportParams,
  GetReportResponse,
  GetReportResponses,
  ListReportsErrors,
  ListReportsParams,
  ListReportsResponse,
  ListReportsResponses,
  ReportPromptSnapshot,
  ReportSummary,
} from '../types/reports';

function reviveReportSummary(value: Mutable<ReportSummary>): void {
  if (value.createdAt != null) {
    value.createdAt = decoded('ReportSummary.createdAt', value.createdAt, (raw) => new Date(raw));
  }
  if (value.completedAt != null) {
    value.completedAt = decoded(
      'ReportSummary.completedAt',
      value.completedAt,
      (raw) => new Date(raw),
    );
  }
}

export const listReportsDescriptor = /* @__PURE__ */ callable({
  address: '/reports',
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
  validators: {
    response: (data: unknown) => {
      const value = data as ListReportsResponse;
      if (value == null) {
        return value;
      }
      if (value.data != null) {
        value.data.forEach((item) => {
          reviveReportSummary(item);
        });
      }
      if (value.reports != null) {
        value.reports.forEach((item) => {
          reviveReportSummary(item);
        });
      }
      return value;
    },
  },
} as const);

export const createReportDescriptor = /* @__PURE__ */ callable({
  address: '/reports',
  auth: apiKeyRequirements,
  mediaType: 'application/json',
  method: 'post',
  returns: 'json',
  rules: [
    brandNameRule,
    {
      max: 10,
      name: 'brandAliases',
      of: 'items',
    },
    {
      min: 1,
      name: 'brandWebsite',
      of: 'characters',
    },
  ],
  validators: {
    response: (data: unknown) => {
      const value = data as CreateReportResponse;
      if (value == null) {
        return value;
      }
      if (value.createdAt != null) {
        value.createdAt = decoded('createdAt', value.createdAt, (raw) => new Date(raw));
      }
      return value;
    },
  },
} as const);

export const getReportFields = { path: ['reportId'] };

export const getReportDescriptor = /* @__PURE__ */ callable({
  address: '/reports/{reportId}',
  auth: apiKeyRequirements,
  method: 'get',
  returns: 'json',
  validators: {
    response: (data: unknown) => {
      const value = data as GetReportResponse;
      if (value == null) {
        return value;
      }
      if (value.createdAt != null) {
        value.createdAt = decoded('createdAt', value.createdAt, (raw) => new Date(raw));
      }
      if (value.completedAt != null) {
        value.completedAt = decoded('completedAt', value.completedAt, (raw) => new Date(raw));
      }
      return value;
    },
  },
} as const);

/** Generate and retrieve AI Share of Voice reports */
export class Reports extends ElmoResource {
  /**
   * Create a report
   *
   * Create a new AI Share of Voice report and queue it for generation. The report will evaluate the
   * brand across multiple AI engines (ChatGPT, Claude, Google AI) using generated and optional
   * custom prompts.
   *
   * Requires an instance admin key; organization keys receive `403`.
   */
  public create(
    params: CreateReportParams,
    options?: RequestOptions,
  ): RestCallPromise<CreateReportResponses, CreateReportErrors> {
    return callPromise(
      options?.client ?? this.client,
      createReportDescriptor,
      mergeParams(groupParams(params, 'body'), options),
    );
  }

  /**
   * Get report status and data
   *
   * Poll a report's status. When completed, returns per-prompt snapshot data with raw mention
   * counts. Consumers are responsible for computing SoV and other derived metrics from the raw
   * data.
   *
   * Requires an instance admin key; organization keys receive `403`.
   *
   * @param reportId The ID of the report
   */
  public get(
    reportId: string,
    params?: GetReportParams,
    options?: RequestOptions,
  ): RestCallPromise<GetReportResponses, GetReportErrors> {
    return callPromise(
      options?.client ?? this.client,
      getReportDescriptor,
      mergeParams(placeParams({ ...params, reportId }, getReportFields, 'query'), options),
    );
  }

  /**
   * Retrieve a paginated list of all reports, ordered by creation date (newest first).
   *
   * Requires an instance admin key; organization keys receive `403`.
   */
  public list(
    params?: ListReportsParams,
    options?: RequestOptions,
  ): PagePromise<ReportSummary, ListReportsResponse, ListReportsErrors> {
    return pages(
      options?.client ?? this.client,
      listReportsDescriptor,
      mergeParams(groupParams(params, 'query'), options),
    );
  }
}

export declare namespace Reports {
  export type {
    CreateReportErrors,
    CreateReportParams,
    CreateReportResponse,
    CreateReportResponses,
    GetReportErrors,
    GetReportParams,
    GetReportResponse,
    GetReportResponses,
    ListReportsErrors,
    ListReportsParams,
    ListReportsResponse,
    ListReportsResponses,
    ReportPromptSnapshot,
    ReportSummary,
  };
}
