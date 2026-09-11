import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPagination(req: Request, defaultLimit = 20, maxLimit = 100): PaginationParams {
  const page = Math.max(1, Number(req.query.page) || 1);
  const rawLimit = Number(req.query.limit) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
