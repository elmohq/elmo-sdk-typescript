export type Error = {
  /**
   * Stable machine-readable code. Deliberately not an enum: new values are added without a version
   * bump, so treat an unrecognized one as its HTTP status implies. Currently: `unauthorized`,
   * `insufficient_scope`, `forbidden`, `not_found`, `validation_error`, `conflict`, `rate_limited`,
   * `method_not_allowed`, `read_only`, `no_active_plan`, `brand_limit`, `prompt_limit`,
   * `model_not_in_plan`, `model_picks_exceeded`, `premium_not_in_plan`, `premium_pool_exhausted`,
   * `cadence_faster_than_plan`, `internal_error`.
   */
  code?: string;
  /** Error type */
  error: string;
  /** Detailed error message */
  message?: string;
};

/** Authentication required */
export type UnauthorizedError = Error;

export type InternalServerError = Error;

/**
 * The key is valid but not permitted: a missing scope, an admin-only endpoint, or a write in
 * read-only (demo) mode.
 */
export type ForbiddenError = Error;

/** Per-key rate limit exceeded. */
export type RateLimitError = Error;
