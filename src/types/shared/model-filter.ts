/**
 * Inclusive lower bound of the window, an ISO 8601 timestamp such as `2026-01-01T00:00:00Z`.
 * Aligned down to the quarter hour, the grain analytics are aggregated at; where a response repeats
 * the window, it repeats the aligned one. A bare `YYYY-MM-DD` is rejected: that is
 * `/prompts/{promptId}/snapshot`'s spelling and means a local calendar day there.
 */
export type WindowStart = Date;

/**
 * Exclusive upper bound of the window, an ISO 8601 timestamp, also aligned down to the quarter
 * hour. The window is half-open: a run at exactly `end` is outside it. `start` and `end` inside one
 * quarter-hour bucket leave an empty window and are rejected.
 */
export type WindowEnd = Date;

/** Restrict to one model, e.g. `chatgpt`. See `models.list()`. */
export type ModelFilter = string;
