/** Aggregated mention counts for a prompt across its evaluation runs. */
export type MentionsSummary = {
  /** Number of runs where the brand was mentioned */
  brandMentionsTotal: number;
  /**
   * Total count of individual competitor mentions across all runs (a single run mentioning 3
   * competitors counts as 3)
   */
  competitorMentionsTotal: number;
  /** Top-K competitor entities ranked by mention count */
  mentionsTopK: Array<MentionEntry>;
  /** Total brand + competitor mentions across all runs */
  mentionsTotal: number;
};

export type MentionEntry = {
  /** Number of runs where this entity was mentioned */
  count: number;
  /** Competitor entity name */
  entity: string;
};
