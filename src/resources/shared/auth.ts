import type { AuthScheme } from '../../internal/core/types';

/**
 * An instance admin key from `ADMIN_API_KEYS`, or an organization key (`elmo_…`) issued from the
 * dashboard.
 */
export const apiKeyRequirements = [
  {
    key: 'apiKey',
    scheme: 'bearer',
    type: 'http',
  },
] as const satisfies ReadonlyArray<AuthScheme>;
