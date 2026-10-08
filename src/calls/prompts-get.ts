import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import { getPromptDescriptor, getPromptFields } from '../resources/prompts';
import type { RequestOptions } from '../resources/shared/request-options';
import type { GetPromptErrors, GetPromptResponses } from '../types/prompts';

/**
 * Get a prompt
 *
 * Retrieve a specific prompt by ID
 */
export function promptsGet(
  client: Client,
  promptId: string,
  options?: RequestOptions,
): RestCallPromise<GetPromptResponses, GetPromptErrors> {
  return callPromise(
    options?.client ?? client,
    getPromptDescriptor,
    mergeParams(placeParams({ promptId }, getPromptFields, 'query'), options),
  );
}
