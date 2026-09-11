import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createColorSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50),
    hex: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color')
      .optional(),
  }),
});

export const updateColorSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    hex: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color')
      .optional(),
  }),
});

export const createSizeSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50),
    sortOrder: z.number().int().optional(),
  }),
});

export const updateSizeSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    sortOrder: z.number().int().optional(),
  }),
});
