import { z } from 'zod';
import { ENGLISH_CATEGORY_NAME } from '../categories/categories.validation';

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

const englishName = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(ENGLISH_CATEGORY_NAME, {
    message:
      "Subcategory name must be in English (letters, numbers, spaces and & ' ( ) , . / -)",
  });

const title = z.union([z.string().trim().max(150), z.null()]).optional();

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const listSubcategoriesSchema = z.object({
  query: z.object({
    categoryId: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const createSubcategorySchema = z.object({
  body: z.object({
    name: englishName,
    title,
    categoryId: z.string().min(1),
    description: z.string().max(500).optional(),
    image: optionalImage,
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const updateSubcategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: englishName.optional(),
    title,
    categoryId: z.string().min(1).optional(),
    description: z.string().max(500).optional(),
    image: optionalImage,
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});
