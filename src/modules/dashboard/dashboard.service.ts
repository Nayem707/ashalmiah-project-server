import { OrderStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildMonthBuckets(months: number) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const cursor = addMonths(startOfMonth(now), -i);
    buckets.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      month: MONTH_LABELS[cursor.getMonth()],
      year: cursor.getFullYear(),
      revenue: 0,
      orders: 0,
    });
  }
  return buckets;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export const dashboardService = {
  async overview() {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = addMonths(thisMonthStart, -1);
    const sixMonthsStart = addMonths(thisMonthStart, -5);

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      revenueAgg,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      processingOrders,
      lowStock,
      recentUsers,
      monthlyOrders,
      thisMonthRevenue,
      lastMonthRevenue,
      thisMonthOrderCount,
      lastMonthOrderCount,
      thisMonthUserCount,
      lastMonthUserCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: OrderStatus.CANCELLED } },
      }),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      prisma.order.count({
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED] },
        },
      }),
      prisma.product.count({ where: { stock: { lte: 5 } } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatarUrl: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: sixMonthsStart } },
        select: { createdAt: true, totalAmount: true, status: true },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: thisMonthStart },
          status: { not: OrderStatus.CANCELLED },
        },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: lastMonthStart, lt: thisMonthStart },
          status: { not: OrderStatus.CANCELLED },
        },
      }),
      prisma.order.count({ where: { createdAt: { gte: thisMonthStart } } }),
      prisma.order.count({
        where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
      }),
      prisma.user.count({ where: { createdAt: { gte: thisMonthStart } } }),
      prisma.user.count({
        where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
      }),
    ]);

    const salesByMonth = buildMonthBuckets(6);
    const indexByKey = new Map(salesByMonth.map((bucket, index) => [bucket.key, index]));

    for (const order of monthlyOrders) {
      const created = new Date(order.createdAt);
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      const index = indexByKey.get(key);
      if (index === undefined) continue;
      salesByMonth[index].orders += 1;
      if (order.status !== OrderStatus.CANCELLED) {
        salesByMonth[index].revenue += Number(order.totalAmount || 0);
      }
    }

    const currentRevenue = Number(thisMonthRevenue._sum.totalAmount ?? 0);
    const previousRevenue = Number(lastMonthRevenue._sum.totalAmount ?? 0);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      processingOrders,
      lowStockProducts: lowStock,
      salesByMonth,
      recentUsers,
      trends: {
        revenue: {
          value: percentChange(currentRevenue, previousRevenue),
          positive: currentRevenue >= previousRevenue,
          label: 'vs last month',
        },
        orders: {
          value: percentChange(thisMonthOrderCount, lastMonthOrderCount),
          positive: thisMonthOrderCount >= lastMonthOrderCount,
          label: 'vs last month',
        },
        users: {
          value: percentChange(thisMonthUserCount, lastMonthUserCount),
          positive: thisMonthUserCount >= lastMonthUserCount,
          label: 'vs last month',
        },
      },
    };
  },

  async stats() {
    const [ordersByStatus, recentOrders, topProducts] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { select: { id: true } },
        },
      }),
      prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      ordersByStatus: ordersByStatus.map((o) => ({
        status: o.status,
        count: o._count,
      })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: Number(order.totalAmount || 0),
        createdAt: order.createdAt,
        customer: {
          id: order.user?.id || order.userId,
          name: order.user?.name || order.shipFullName || 'Customer',
          email: order.user?.email || '',
        },
        itemCount: order.items?.length || 0,
      })),
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        name: p.productName,
        sales: p._sum.quantity ?? 0,
        unitsSold: p._sum.quantity ?? 0,
      })),
    };
  },
};
