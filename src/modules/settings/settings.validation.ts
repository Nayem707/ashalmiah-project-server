import { z } from 'zod';

export const updateStoreSettingsSchema = z.object({
  body: z.object({
    storeName: z.string().min(1).max(120).optional(),
    supportEmail: z.string().email().optional(),
    phone: z.string().max(40).optional(),
    currency: z.enum(['USD', 'BDT']).optional(),
    bdtPerUsd: z.coerce.number().positive().max(100000).optional(),
    address: z.string().max(300).optional(),
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
