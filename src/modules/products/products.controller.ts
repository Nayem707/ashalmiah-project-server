import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { getPagination } from '../../utils/pagination';
import { productsService } from './products.service';

function toBool(v: unknown): boolean | undefined {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

function parseCsv(v?: string): string[] | undefined {
  if (!v) return undefined;
  const values = v
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
}

export const productsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req);
    const q = req.query as Record<string, string | undefined>;
    const result = await productsService.list({
      page,
      limit,
      skip,
      search: q.search,
      category: q.category,
      colors: parseCsv(q.color),
      sizes: parseCsv(q.size),
      status: q.status as 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | undefined,
      minPrice: q.minPrice ? Number(q.minPrice) : undefined,
      maxPrice: q.maxPrice ? Number(q.maxPrice) : undefined,
      featured: toBool(q.featured),
      popular: toBool(q.popular),
      newArrival: toBool(q.newArrival),
      inStock: toBool(q.inStock),
      sort: q.sort as 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | undefined,
      isAdmin: req.user?.role === 'ADMIN',
    });
    return sendSuccess(res, result.items, 200, result.meta);
  }),

  featured: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(
      res,
      await productsService.getByFlag('featured', Number(req.query.limit) || 8),
    );
  }),

  popular: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(
      res,
      await productsService.getByFlag('popular', Number(req.query.limit) || 8),
    );
  }),

  newArrivals: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(
      res,
      await productsService.getByFlag('newArrival', Number(req.query.limit) || 8),
    );
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(
      res,
      await productsService.getByIdOrSlug(req.params.idOrSlug, req.user?.role === 'ADMIN'),
    );
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await productsService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await productsService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await productsService.remove(req.params.id));
  }),
};
