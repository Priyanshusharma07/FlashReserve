/** Standard response envelope returned by the FlashReserve sale service. */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PageMeta;
}
