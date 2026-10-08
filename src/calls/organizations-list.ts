import type { Client } from '../internal/core/client';
import { groupParams, mergeParams } from '../internal/core/params';
import { PagePromise, pages } from '../internal/page/page';
import { listOrganizationsDescriptor } from '../resources/organizations';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  ListOrganizationsErrors,
  ListOrganizationsParams,
  Organization,
  OrganizationList,
} from '../types/organizations';

/**
 * One entry for an organization key — the one it acts inside. Every organization for an instance
 * admin key. No scope required: a key can only ever see the organization it is already bound to.
 */
export function organizationsList(
  client: Client,
  params?: ListOrganizationsParams,
  options?: RequestOptions,
): PagePromise<Organization, OrganizationList, ListOrganizationsErrors> {
  return pages(
    options?.client ?? client,
    listOrganizationsDescriptor,
    mergeParams(groupParams(params, 'query'), options),
  );
}
