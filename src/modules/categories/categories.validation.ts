import { z } from 'zod';

const imageRef = z
  .string()
  .min(1)
  .refine(
    (value) =>
      /^https?:\/\//i.test(value) ||
      value.startsWith('/uploads/') ||
      value.startsWith('/image/'),
    { message: 'Must be a valid URL or upload path' },
  );

const optionalImage = z.union([imageRef, z.literal(''), z.null()]).optional();

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    image: optionalImage,
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    image: optionalImage,
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});
