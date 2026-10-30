import { z } from 'zod';

export const addItemSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive().max(999).optional(),
    selectedColor: z.string().optional(),
    selectedSize: z.string().optional(),
    selectedPackageId: z.string().optional(),
  }),
});

export const updateItemSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    quantity: z.number().int().positive().max(999),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
