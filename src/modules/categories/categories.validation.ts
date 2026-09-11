import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    image: z.string().url().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    image: z.string().url().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});
