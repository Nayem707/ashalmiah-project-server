import slugify from 'slugify';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';

async function uniqueSlug(name: string, ignoreId?: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true });
  let slug = base;
  let n = 1;
  // Ensure slug uniqueness across categories.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${n++}`;
  }
}

export const categoriesService = {
  async list(includeInactive = false) {
    const where: Prisma.CategoryWhereInput = includeInactive ? {} : { status: 'ACTIVE' };
    return prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  },

  async getById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw ApiError.notFound('Category not found');
    return category;
  },

  async create(data: {
    name: string;
    description?: string;
    image?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    const slug = await uniqueSlug(data.name);
    return prisma.category.create({ data: { ...data, slug } });
  },

  async update(
    id: string,
    data: { name?: string; description?: string; image?: string; status?: 'ACTIVE' | 'INACTIVE' },
  ) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Category not found');
    const slug = data.name ? await uniqueSlug(data.name, id) : undefined;
    return prisma.category.update({ where: { id }, data: { ...data, ...(slug ? { slug } : {}) } });
  },

  async remove(id: string) {
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      throw ApiError.conflict('Cannot delete a category that still has products');
    }
    await prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  },
};
