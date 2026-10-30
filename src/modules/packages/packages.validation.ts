import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const listPackagesSchema = z.object({
  query: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    search: z.string().optional(),
    productId: z.string().optional(),
  }),
});

const packageLine = z.object({
  packageItemId: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});

export const createPackageSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(200),
    description: z.string().max(2000).optional(),
    price: z.coerce.number().positive(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    items: z.array(packageLine).min(1, 'A package needs at least one item'),
  }),
});

export const updatePackageSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().trim().min(2).max(200).optional(),
    description: z.union([z.string().max(2000), z.null()]).optional(),
    price: z.coerce.number().positive().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    items: z.array(packageLine).min(1).optional(),
  }),
});

export const createPackageItemSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(150),
    variant: z.string().max(150).optional(),
    unitPrice: z.coerce.number().nonnegative(),
  }),
});

export const updatePackageItemSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().trim().min(1).max(150).optional(),
    variant: z.union([z.string().max(150), z.null()]).optional(),
    unitPrice: z.coerce.number().nonnegative().optional(),
  }),
});
