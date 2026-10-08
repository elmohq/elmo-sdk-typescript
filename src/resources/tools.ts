import { apiKeyRequirements } from './shared/auth';
import type { RequestOptions } from './shared/request-options';
import { ElmoResource } from './shared/resource';
import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import { callable } from '../internal/core/callable';
import { groupParams, mergeParams } from '../internal/core/params';
import type {
  AnalyzeBrandErrors,
  AnalyzeBrandParams,
  AnalyzeBrandResponses,
  OnboardingSuggestion,
} from '../types/tools';

export const analyzeBrandDescriptor = /* @__PURE__ */ callable({
  address: '/tools/analyze',
  auth: apiKeyRequirements,
  mediaType: 'application/json',
  method: 'post',
  returns: 'json',
  rules: [
    {
      min: 1,
      name: 'website',
      of: 'characters',
    },
    {
      max: 100,
      min: 0,
      name: 'maxCompetitors',
    },
    {
      max: 100,
      min: 0,
      name: 'maxPrompts',
    },
  ],
} as const);

/** One-shot helpers (e.g. brand analysis) that don't persist anything */
export class Tools extends ElmoResource {
  /**
   * Analyze a website
   *
   * Run brand analysis without persisting anything. Returns suggested additional domains, aliases,
   * competitors, and prompts.
   *
   * Requires an instance admin key; organization keys receive `403`.
   */
  public analyze(
    params: AnalyzeBrandParams,
    options?: RequestOptions,
  ): RestCallPromise<AnalyzeBrandResponses, AnalyzeBrandErrors> {
    return callPromise(
      options?.client ?? this.client,
      analyzeBrandDescriptor,
      mergeParams(groupParams(params, 'body'), options),
    );
  }
}

export declare namespace Tools {
  export type {
    AnalyzeBrandErrors,
    AnalyzeBrandParams,
    AnalyzeBrandResponses,
    OnboardingSuggestion,
  };
}
