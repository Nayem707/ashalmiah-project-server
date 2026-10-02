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

export const ENGLISH_CATEGORY_NAME = /^[A-Za-z0-9][A-Za-z0-9 &'(),./-]*$/;

const englishName = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(ENGLISH_CATEGORY_NAME, {
    message:
      "Category name must be in English (letters, numbers, spaces and & ' ( ) , . / -)",
  });

const title = z.union([z.string().trim().max(150), z.null()]).optional();

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: englishName,
    title,
    description: z.string().max(500).optional(),
    image: optionalImage,
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: englishName.optional(),
    title,
    description: z.string().max(500).optional(),
    image: optionalImage,
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});
