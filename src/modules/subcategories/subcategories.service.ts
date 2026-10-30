import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { toSlug } from '../../utils/slug';
import { deleteLocalUpload, extractUploadKey } from '../uploads/uploads.utils';

async function uniqueSlug(name: string, ignoreId?: string): Promise<string> {
  const base = toSlug(name, 'subcategory');
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.subcategory.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${n++}`;
  }
}

async function assertCategory(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw ApiError.badRequest('Invalid parent category');
  return category;
}

const productCountSelect = (includeInactive: boolean) => ({
  _count: {
    select: { products: includeInactive ? true : { where: { status: 'ACTIVE' as const } } },
  },
  category: { select: { id: true, name: true, title: true, slug: true } },
});

export const subcategoriesService = {
  async list(params: {
    categoryId?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    includeInactive?: boolean;
  }) {
    const where: Prisma.SubcategoryWhereInput = {
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.includeInactive
        ? params.status
          ? { status: params.status }
          : {}
        : { status: 'ACTIVE' }),
    };
    return prisma.subcategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: productCountSelect(Boolean(params.includeInactive)),
    });
  },

  async getById(id: string) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id },
      include: productCountSelect(true),
    });
    if (!subcategory) throw ApiError.notFound('Subcategory not found');
    return subcategory;
  },

  async create(data: {
    name: string;
    title?: string | null;
    categoryId: string;
    description?: string;
    image?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    await assertCategory(data.categoryId);
    const slug = await uniqueSlug(data.name);
    return prisma.subcategory.create({
      data: {
        name: data.name,
        title: data.title || null,
        categoryId: data.categoryId,
        description: data.description,
        image: data.image ? data.image : null,
        status: data.status ?? 'ACTIVE',
        slug,
      },
      include: productCountSelect(true),
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      title?: string | null;
      categoryId?: string;
      description?: string;
      image?: string | null;
      status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    const existing = await prisma.subcategory.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Subcategory not found');
    if (data.categoryId && data.categoryId !== existing.categoryId) {
      await assertCategory(data.categoryId);
    }

    const slug = data.name ? await uniqueSlug(data.name, id) : undefined;
    const payload: Prisma.SubcategoryUpdateInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.title !== undefined ? { title: data.title || null } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.image !== undefined ? { image: data.image || null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(slug ? { slug } : {}),
      ...(data.categoryId ? { category: { connect: { id: data.categoryId } } } : {}),
    };

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.subcategory.update({ where: { id }, data: payload });
      // Moving a subcategory to another parent must keep its products' main category in sync.
      if (data.categoryId && data.categoryId !== existing.categoryId) {
        await tx.product.updateMany({
          where: { subcategoryId: id },
          data: { categoryId: data.categoryId },
        });
      }
      return sub;
    });

    if (data.image !== undefined && existing.image && existing.image !== updated.image) {
      deleteLocalUpload(extractUploadKey(existing.image));
    }

    return prisma.subcategory.findUniqueOrThrow({
      where: { id },
      include: productCountSelect(true),
    });
  },

  async remove(id: string) {
    const existing = await prisma.subcategory.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Subcategory not found');
    const count = await prisma.product.count({ where: { subcategoryId: id } });
    if (count > 0) {
      throw ApiError.conflict('Cannot delete a subcategory that still has products');
    }
    await prisma.subcategory.delete({ where: { id } });
    deleteLocalUpload(extractUploadKey(existing.image));
    return { message: 'Subcategory deleted' };
  },
};
