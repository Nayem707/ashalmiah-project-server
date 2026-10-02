import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { buildMeta } from '../../utils/pagination';
import { toSlug } from '../../utils/slug';
import {
  deleteLocalUpload,
  extractUploadKey,
} from '../uploads/uploads.utils';

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  colors: { include: { color: true } },
  sizes: { include: { size: true } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function shape(p: ProductWithRelations) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    categoryId: p.categoryId,
    category: p.category?.name,
    description: p.description,
    price: Number(p.price),
    baseCurrency: p.baseCurrency || 'BDT',
    discount: p.discount,
    stock: p.stock,
    status: p.status,
    rating: p.rating,
    reviews: p.reviewsCount,
    featured: p.featured,
    popular: p.popular,
    newArrival: p.newArrival,
    images: p.images,
    colors: p.colors.map((c) => c.color.name),
    colorIds: p.colors.map((c) => c.color.id),
    sizes: p.sizes.map((s) => s.size.name),
    sizeIds: p.sizes.map((s) => s.size.id),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function uniqueSlug(name: string, ignoreId?: string): Promise<string> {
  const base = toSlug(name, 'product');
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${n++}`;
  }
}

interface ListParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  category?: string;
  colors?: string[];
  sizes?: string[];
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  popular?: boolean;
  newArrival?: boolean;
  inStock?: boolean;
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating';
  isAdmin?: boolean;
}

async function assertUniqueSku(sku: string, ignoreId?: string) {
  const existing = await prisma.product.findUnique({ where: { sku } });
  if (existing && existing.id !== ignoreId) {
    throw ApiError.conflict('A product with this SKU already exists');
  }
}

async function assertAttributeIds(colorIds?: string[], sizeIds?: string[]) {
  if (colorIds?.length) {
    const uniqueIds = [...new Set(colorIds)];
    const count = await prisma.color.count({ where: { id: { in: uniqueIds } } });
    if (count !== uniqueIds.length) throw ApiError.badRequest('One or more colorIds are invalid');
  }
  if (sizeIds?.length) {
    const uniqueIds = [...new Set(sizeIds)];
    const count = await prisma.size.count({ where: { id: { in: uniqueIds } } });
    if (count !== uniqueIds.length) throw ApiError.badRequest('One or more sizeIds are invalid');
  }
}

function buildOrderBy(sort?: ListParams['sort']): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'price-asc':
      return { price: 'asc' };
    case 'price-desc':
      return { price: 'desc' };
    case 'rating':
      return { rating: 'desc' };
    case 'newest':
      return { createdAt: 'desc' };
    case 'featured':
    default:
      return { createdAt: 'desc' };
  }
}

export const productsService = {
  async list(params: ListParams) {
    const where: Prisma.ProductWhereInput = {
      // Non-admin callers only see active products.
      ...(params.isAdmin ? (params.status ? { status: params.status } : {}) : { status: 'ACTIVE' }),
      ...(params.category
        ? {
            category: {
              OR: [{ id: params.category }, { slug: params.category }],
            },
          }
        : {}),
      ...(params.colors?.length
        ? {
            colors: {
              some: {
                OR: params.colors.map((value) => ({
                  color: {
                    OR: [{ id: value }, { name: { equals: value, mode: 'insensitive' } }],
                  },
                })),
              },
            },
          }
        : {}),
      ...(params.sizes?.length
        ? {
            sizes: {
              some: {
                OR: params.sizes.map((value) => ({
                  size: {
                    OR: [{ id: value }, { name: { equals: value, mode: 'insensitive' } }],
                  },
                })),
              },
            },
          }
        : {}),
      ...(params.featured !== undefined ? { featured: params.featured } : {}),
      ...(params.popular !== undefined ? { popular: params.popular } : {}),
      ...(params.newArrival !== undefined ? { newArrival: params.newArrival } : {}),
      ...(params.inStock ? { stock: { gt: 0 } } : {}),
      ...(params.minPrice !== undefined || params.maxPrice !== undefined
        ? {
            price: {
              ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
              ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
              { sku: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: buildOrderBy(params.sort),
        include: productInclude,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: items.map(shape),
      meta: buildMeta(params.page, params.limit, total),
    };
  },

  async getByIdOrSlug(idOrSlug: string, isAdmin = false) {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: productInclude,
    });
    if (!product) throw ApiError.notFound('Product not found');
    if (!isAdmin && product.status !== 'ACTIVE') {
      throw ApiError.notFound('Product not found');
    }
    return shape(product);
  },

  async getByFlag(flag: 'featured' | 'popular' | 'newArrival', limit = 8) {
    const items = await prisma.product.findMany({
      where: { status: 'ACTIVE', [flag]: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: productInclude,
    });
    return items.map(shape);
  },

  async create(data: {
    name: string;
    sku: string;
    categoryId: string;
    description?: string;
    price: number;
    baseCurrency?: string;
    discount?: number;
    stock?: number;
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    featured?: boolean;
    popular?: boolean;
    newArrival?: boolean;
    images?: string[];
    colorIds?: string[];
    sizeIds?: string[];
  }) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw ApiError.badRequest('Invalid categoryId');

    await assertUniqueSku(data.sku);
    await assertAttributeIds(data.colorIds, data.sizeIds);

    const slug = await uniqueSlug(data.name);
    const baseCurrency =
      String(data.baseCurrency || 'BDT').toUpperCase() === 'USD' ? 'USD' : 'BDT';
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        sku: data.sku,
        categoryId: data.categoryId,
        description: data.description,
        price: data.price,
        baseCurrency,
        discount: data.discount ?? 0,
        stock: data.stock ?? 0,
        status: data.status ?? 'ACTIVE',
        featured: data.featured ?? false,
        popular: data.popular ?? false,
        newArrival: data.newArrival ?? false,
        images: data.images ?? [],
        colors: data.colorIds?.length
          ? { create: data.colorIds.map((colorId) => ({ colorId })) }
          : undefined,
        sizes: data.sizeIds?.length
          ? { create: data.sizeIds.map((sizeId) => ({ sizeId })) }
          : undefined,
      },
      include: productInclude,
    });
    return shape(product);
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      sku: string;
      categoryId: string;
      description: string;
      price: number;
      baseCurrency: string;
      discount: number;
      stock: number;
      status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
      featured: boolean;
      popular: boolean;
      newArrival: boolean;
      images: string[];
      colorIds: string[];
      sizeIds: string[];
    }>,
  ) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Product not found');

    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw ApiError.badRequest('Invalid categoryId');
    }

    if (data.sku) await assertUniqueSku(data.sku, id);
    await assertAttributeIds(data.colorIds, data.sizeIds);

    const slug = data.name ? await uniqueSlug(data.name, id) : undefined;
    const baseCurrency =
      data.baseCurrency !== undefined
        ? String(data.baseCurrency).toUpperCase() === 'USD'
          ? 'USD'
          : 'BDT'
        : undefined;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        ...(slug ? { slug } : {}),
        sku: data.sku,
        categoryId: data.categoryId,
        description: data.description,
        price: data.price,
        ...(baseCurrency ? { baseCurrency } : {}),
        discount: data.discount,
        stock: data.stock,
        status: data.status,
        featured: data.featured,
        popular: data.popular,
        newArrival: data.newArrival,
        images: data.images,
        ...(data.colorIds
          ? { colors: { deleteMany: {}, create: data.colorIds.map((colorId) => ({ colorId })) } }
          : {}),
        ...(data.sizeIds
          ? { sizes: { deleteMany: {}, create: data.sizeIds.map((sizeId) => ({ sizeId })) } }
          : {}),
      },
      include: productInclude,
    });

    if (data.images) {
      const next = new Set(data.images);
      for (const image of existing.images || []) {
        if (!next.has(image)) {
          deleteLocalUpload(extractUploadKey(image));
        }
      }
    }

    return shape(product);
  },

  async remove(id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Product not found');

    await prisma.$transaction(async (tx) => {
      // Keep historical order lines; just detach the catalog record.
      await tx.orderItem.updateMany({ where: { productId: id }, data: { productId: null } });
      await tx.product.delete({ where: { id } });
    });

    for (const image of existing.images || []) {
      deleteLocalUpload(extractUploadKey(image));
    }

    return { message: 'Product deleted' };
  },
};
