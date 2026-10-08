/**
 * Inclusive lower bound of the window, an ISO 8601 timestamp such as `2026-01-01T00:00:00Z`. A bare
 * `YYYY-MM-DD` is rejected: that is `/prompts/{promptId}/snapshot`'s spelling and means a local
 * calendar day there.
 */
export type WindowStart = Date;

/**
 * Exclusive upper bound of the window, an ISO 8601 timestamp. The window is half-open: a run at
 * exactly `end` is outside it.
 */
export type WindowEnd = Date;

/** Restrict to one model, e.g. `chatgpt`. See `models.list()`. */
export type ModelFilter = string;
