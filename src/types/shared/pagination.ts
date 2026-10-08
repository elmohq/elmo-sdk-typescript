export type Pagination = {
  limit: number;
  page: number;
  /** Total items matching the request. */
  total: number;
  totalPages: number;
};
