import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === '' || /^https?:\/\//i.test(value), {
    message: 'Must be a full URL starting with http:// or https://',
  });

const optionalImageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === '' || /^https?:\/\//i.test(value) || value.startsWith('/'), {
    message: 'Must be an image URL or upload path',
  });

export const SOCIAL_LINK_KEYS = ['facebook', 'instagram', 'tiktok', 'youtube', 'messenger'] as const;

export const updateStoreSettingsSchema = z.object({
  body: z.object({
    storeName: z.string().min(1).max(120).optional(),
    supportEmail: z.string().email().optional(),
    phone: z.string().max(40).optional(),
    currency: z.enum(['USD', 'BDT']).optional(),
    bdtPerUsd: z.coerce.number().positive().max(100000).optional(),
    address: z.string().max(300).optional(),
    whatsapp: z.string().trim().max(40).optional(),
    logoUrl: optionalImageUrl.optional(),
    footerDescription: z.string().trim().max(500).optional(),
    supportHours: z.string().trim().max(100).optional(),
    copyrightName: z.string().trim().max(200).optional(),
    socialLinks: z
      .object(
        Object.fromEntries(SOCIAL_LINK_KEYS.map((key) => [key, optionalUrl.optional()])) as Record<
          (typeof SOCIAL_LINK_KEYS)[number],
          z.ZodOptional<typeof optionalUrl>
        >,
      )
      .strict()
      .optional(),
  }),
});

export const updateShippingSettingsSchema = z.object({
  body: z.object({
    shippingFlatRate: z.coerce.number().nonnegative().optional(),
    freeShippingMin: z.coerce.number().nonnegative().optional(),
    deliveryInsideDhaka: z.coerce.number().nonnegative().optional(),
    deliveryOutsideDhaka: z.coerce.number().nonnegative().optional(),
  }),
});
