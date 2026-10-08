import type { Client } from '../internal/core/client';
import { groupParams, mergeParams } from '../internal/core/params';
import { PagePromise, pages } from '../internal/page/page';
import { listPromptsDescriptor } from '../resources/prompts';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  ListPromptsErrors,
  ListPromptsParams,
  ListPromptsResponse,
  Prompt,
} from '../types/prompts';

/**
 * List all prompts
 *
 * Retrieve a paginated list of all prompts across all brands
 */
export function promptsList(
  client: Client,
  params?: ListPromptsParams,
  options?: RequestOptions,
): PagePromise<Prompt, ListPromptsResponse, ListPromptsErrors> {
  return pages(
    options?.client ?? client,
    listPromptsDescriptor,
    mergeParams(groupParams(params, 'query'), options),
  );
}
