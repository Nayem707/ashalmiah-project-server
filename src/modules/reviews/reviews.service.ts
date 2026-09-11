import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';

// Recomputes the product's average rating and review count from published reviews.
async function refreshProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, status: 'PUBLISHED' },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewsCount: agg._count,
    },
  });
}

export const reviewsService = {
  async listForProduct(productId: string) {
    return prisma.review.findMany({
      where: { productId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  },

  async create(productId: string, userId: string, data: { rating: number; comment?: string }) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');

    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
    });
    if (existing) throw ApiError.conflict('You have already reviewed this product');

    const review = await prisma.review.create({
      data: { productId, userId, rating: data.rating, comment: data.comment },
    });
    await refreshProductRating(productId);
    return review;
  },

  async update(
    reviewId: string,
    userId: string,
    isAdmin: boolean,
    data: { rating?: number; comment?: string; status?: 'PUBLISHED' | 'PENDING' | 'HIDDEN' },
  ) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw ApiError.notFound('Review not found');
    if (!isAdmin && review.userId !== userId) {
      throw ApiError.forbidden('You cannot modify this review');
    }
    // Only admins may change moderation status.
    const status = isAdmin ? data.status : undefined;
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { rating: data.rating, comment: data.comment, status },
    });
    await refreshProductRating(review.productId);
    return updated;
  },

  async remove(reviewId: string, userId: string, isAdmin: boolean) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw ApiError.notFound('Review not found');
    if (!isAdmin && review.userId !== userId) {
      throw ApiError.forbidden('You cannot delete this review');
    }
    await prisma.review.delete({ where: { id: reviewId } });
    await refreshProductRating(review.productId);
    return { message: 'Review deleted' };
  },
};
