import slugify from 'slugify';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { buildMeta } from '../../utils/pagination';

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
    sizes: p.sizes.map((s) => s.size.name),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function uniqueSlug(name: string, ignoreId?: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true });
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

  async getByIdOrSlug(idOrSlug: string) {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: productInclude,
    });
    if (!product) throw ApiError.notFound('Product not found');
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

    const slug = await uniqueSlug(data.name);
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        sku: data.sku,
        categoryId: data.categoryId,
        description: data.description,
        price: data.price,
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

    const slug = data.name ? await uniqueSlug(data.name, id) : undefined;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        ...(slug ? { slug } : {}),
        sku: data.sku,
        categoryId: data.categoryId,
        description: data.description,
        price: data.price,
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
    return shape(product);
  },

  async remove(id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Product not found');
    await prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  },
};
