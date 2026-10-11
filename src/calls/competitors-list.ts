import type { Client } from '../internal/core/client';
import { PagePromise, pages } from '../internal/core/page';
import { groupParams, mergeParams } from '../internal/core/params';
import { listCompetitorsDescriptor } from '../resources/competitors';
import type { RequestOptions } from '../resources/shared/request-options';
import type {
  Competitor,
  CompetitorsList,
  ListCompetitorsErrors,
  ListCompetitorsParams,
} from '../types/competitors';

export function competitorsList(
  client: Client,
  params?: ListCompetitorsParams,
  options?: RequestOptions,
): PagePromise<Competitor, CompetitorsList, ListCompetitorsErrors> {
  return pages(
    options?.client ?? client,
    listCompetitorsDescriptor,
    mergeParams(groupParams(params, 'query'), options),
  );
}
