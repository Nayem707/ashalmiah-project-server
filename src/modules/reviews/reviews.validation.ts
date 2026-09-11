import { z } from 'zod';

export const createReviewSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
  }),
});

export const updateReviewSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(2000).optional(),
    status: z.enum(['PUBLISHED', 'PENDING', 'HIDDEN']).optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
