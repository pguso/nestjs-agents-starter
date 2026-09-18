export interface RequestContext {
  userId: string;
  /** Correlates logs and error responses; from `x-request-id` or generated. */
  requestId: string;
}
