import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user_id?: string;
  requestId?: string;
}

export interface PaginatedResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  page?: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage?: number | null;
  nextPage?: number | null;
}
