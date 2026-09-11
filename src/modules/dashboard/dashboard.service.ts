import { OrderStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';

export const dashboardService = {
  async overview() {
    const [totalUsers, totalProducts, totalOrders, revenueAgg, pendingOrders, lowStock] =
      await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.order.count(),
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { status: { not: OrderStatus.CANCELLED } },
        }),
        prisma.order.count({ where: { status: OrderStatus.PENDING } }),
        prisma.product.count({ where: { stock: { lte: 5 } } }),
      ]);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
      pendingOrders,
      lowStockProducts: lowStock,
    };
  },

  async stats() {
    const [ordersByStatus, recentOrders, topProducts] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      ordersByStatus: ordersByStatus.map((o) => ({ status: o.status, count: o._count })),
      recentOrders,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        name: p.productName,
        unitsSold: p._sum.quantity ?? 0,
      })),
    };
  },
};
