import { z } from 'zod';

export const listProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
    category: z.string().optional(), // category id or slug
    color: z.string().optional(), // comma-separated color ids or names
    size: z.string().optional(), // comma-separated size ids or names
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    featured: z.enum(['true', 'false']).optional(),
    popular: z.enum(['true', 'false']).optional(),
    newArrival: z.enum(['true', 'false']).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc', 'rating']).optional(),
  }),
});

export const idOrSlugParamSchema = z.object({
  params: z.object({ idOrSlug: z.string().min(1) }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

const imageRef = z
  .string()
  .min(1)
  .refine((value) => /^https?:\/\//i.test(value) || value.startsWith('/'), {
    message: 'Must be a valid URL or upload path',
  });

const productBody = {
  name: z.string().min(2).max(200),
  sku: z.string().min(1).max(60),
  categoryId: z.string().min(1),
  description: z.string().max(4000).optional(),
  price: z.coerce.number().positive(),
  discount: z.coerce.number().int().min(0).max(100).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  featured: z.boolean().optional(),
  popular: z.boolean().optional(),
  newArrival: z.boolean().optional(),
  images: z.array(imageRef).optional(),
  colorIds: z.array(z.string().min(1)).optional(),
  sizeIds: z.array(z.string().min(1)).optional(),
};

export const createProductSchema = z.object({
  body: z.object(productBody),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: productBody.name.optional(),
    sku: productBody.sku.optional(),
    categoryId: productBody.categoryId.optional(),
    description: productBody.description,
    price: productBody.price.optional(),
    discount: productBody.discount,
    stock: productBody.stock,
    status: productBody.status,
    featured: productBody.featured,
    popular: productBody.popular,
    newArrival: productBody.newArrival,
    images: productBody.images,
    colorIds: productBody.colorIds,
    sizeIds: productBody.sizeIds,
  }),
});
