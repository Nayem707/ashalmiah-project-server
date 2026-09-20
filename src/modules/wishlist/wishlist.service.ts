import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';

export const wishlistService = {
  async list(userId: string) {
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            baseCurrency: true,
            discount: true,
            images: true,
            rating: true,
            stock: true,
            colors: { include: { color: true } },
            sizes: { include: { size: true } },
          },
        },
      },
    });
    return items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.product.name,
      slug: i.product.slug,
      price: Number(i.product.price),
      baseCurrency: i.product.baseCurrency || 'BDT',
      discount: i.product.discount,
      image: i.product.images[0] ?? null,
      rating: i.product.rating,
      stock: i.product.stock,
      colors: i.product.colors.map((c) => c.color.name),
      sizes: i.product.sizes.map((s) => s.size.name),
      createdAt: i.createdAt,
    }));
  },

  async add(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
    return this.list(userId);
  },

  async remove(userId: string, productId: string) {
    await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return this.list(userId);
  },
};
