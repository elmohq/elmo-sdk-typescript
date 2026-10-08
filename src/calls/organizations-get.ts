import { callPromise, RestCallPromise } from '../internal/core/call-promise';
import type { Client } from '../internal/core/client';
import { mergeParams, placeParams } from '../internal/core/params';
import { getOrganizationDescriptor, getOrganizationFields } from '../resources/organizations';
import type { RequestOptions } from '../resources/shared/request-options';
import type { GetOrganizationErrors, GetOrganizationResponses } from '../types/organizations';

/**
 * Get an organization
 *
 * No scope required. An organization outside the key's reach answers `404`, identically to one that
 * does not exist.
 */
export function organizationsGet(
  client: Client,
  organizationId: string,
  options?: RequestOptions,
): RestCallPromise<GetOrganizationResponses, GetOrganizationErrors> {
  return callPromise(
    options?.client ?? client,
    getOrganizationDescriptor,
    mergeParams(placeParams({ organizationId }, getOrganizationFields, 'query'), options),
  );
}
