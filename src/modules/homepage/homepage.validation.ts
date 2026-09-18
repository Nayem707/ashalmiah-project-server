import { z } from 'zod';

export const updateSectionSchema = z.object({
  params: z.object({ key: z.string().min(1) }),
  body: z.object({
    title: z.string().max(200).optional(),
    subtitle: z.string().max(300).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    content: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const createSlideSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    subtitle: z.string().max(300).optional(),
    description: z.string().max(1000).optional(),
    image: z
      .string()
      .min(1)
      .refine(
        (value) =>
          /^https?:\/\//i.test(value) || value.startsWith('/uploads/') || value.startsWith('/image/'),
        'Must be a valid URL or upload path',
      ),
    buttonText: z.string().max(60).optional(),
    buttonUrl: z.string().max(300).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
});

export const updateSlideSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    subtitle: z.string().max(300).optional(),
    description: z.string().max(1000).optional(),
    image: z
      .string()
      .min(1)
      .refine(
        (value) =>
          /^https?:\/\//i.test(value) || value.startsWith('/uploads/') || value.startsWith('/image/'),
        'Must be a valid URL or upload path',
      )
      .optional(),
    buttonText: z.string().max(60).optional(),
    buttonUrl: z.string().max(300).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
