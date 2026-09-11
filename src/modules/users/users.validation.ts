import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().max(30).optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(72),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }),
});

export const addressSchema = z.object({
  body: z.object({
    type: z.enum(['SHIPPING', 'BILLING']).optional(),
    fullName: z.string().min(2),
    phone: z.string().min(3),
    country: z.string().min(1),
    city: z.string().min(1),
    area: z.string().optional(),
    street: z.string().min(1),
    postalCode: z.string().optional(),
    isDefault: z.boolean().optional(),
  }),
});
