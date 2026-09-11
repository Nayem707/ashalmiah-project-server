import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';

export const attributesService = {
  // ---- Colors ----
  listColors() {
    return prisma.color.findMany({ orderBy: { name: 'asc' } });
  },
  createColor(data: { name: string; hex?: string }) {
    return prisma.color.create({ data });
  },
  async updateColor(id: string, data: { name?: string; hex?: string }) {
    const existing = await prisma.color.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Color not found');
    return prisma.color.update({ where: { id }, data });
  },
  async removeColor(id: string) {
    const existing = await prisma.color.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Color not found');
    await prisma.color.delete({ where: { id } });
    return { message: 'Color deleted' };
  },

  // ---- Sizes ----
  listSizes() {
    return prisma.size.findMany({ orderBy: { sortOrder: 'asc' } });
  },
  createSize(data: { name: string; sortOrder?: number }) {
    return prisma.size.create({ data });
  },
  async updateSize(id: string, data: { name?: string; sortOrder?: number }) {
    const existing = await prisma.size.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Size not found');
    return prisma.size.update({ where: { id }, data });
  },
  async removeSize(id: string) {
    const existing = await prisma.size.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Size not found');
    await prisma.size.delete({ where: { id } });
    return { message: 'Size deleted' };
  },
};
