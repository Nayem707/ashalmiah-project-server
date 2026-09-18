import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { buildMeta } from '../../utils/pagination';

const SHIPPING_FLAT_RATE = 12;
const FREE_SHIPPING_THRESHOLD = 150;

interface CheckoutItemInput {
  productId: string;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

interface ShippingInput {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  postalCode?: string;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function generateOrderNumber(): string {
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `ORD-${rand}`;
}

async function resolveItems(
  _userId: string,
  provided?: CheckoutItemInput[],
): Promise<CheckoutItemInput[]> {
  if (!provided?.length) throw ApiError.badRequest('Cart is empty');
  return provided;
}

export const ordersService = {
  async checkout(
    userId: string,
    input: {
      items?: CheckoutItemInput[];
      paymentMethod?: 'COD' | 'ONLINE';
      shipping: ShippingInput;
    },
  ) {
    const items = await resolveItems(userId, input.items);
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        colors: { include: { color: true } },
        sizes: { include: { size: true } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate availability and compute totals server-side.
    let subtotal = 0;
    let discountTotal = 0;
    const orderItemsData = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product || product.status !== 'ACTIVE') {
        throw ApiError.badRequest(`Product not available: ${item.productId}`);
      }
      if (product.stock < item.quantity) {
        throw ApiError.badRequest(`Insufficient stock for ${product.name}`);
      }

      const availableColors = product.colors.map((c) => c.color.name);
      const availableSizes = product.sizes.map((s) => s.size.name);

      if (availableColors.length > 0) {
        if (!item.selectedColor) {
          throw ApiError.badRequest(`Color is required for ${product.name}`);
        }
        if (!availableColors.includes(item.selectedColor)) {
          throw ApiError.badRequest(`Invalid color for ${product.name}`);
        }
      }

      if (availableSizes.length > 0) {
        if (!item.selectedSize) {
          throw ApiError.badRequest(`Size is required for ${product.name}`);
        }
        if (!availableSizes.includes(item.selectedSize)) {
          throw ApiError.badRequest(`Invalid size for ${product.name}`);
        }
      }

      const basePrice = Number(product.price);
      const unitPrice = round(basePrice * (1 - product.discount / 100));
      const lineSubtotal = round(unitPrice * item.quantity);
      subtotal += round(basePrice * item.quantity);
      discountTotal += round((basePrice - unitPrice) * item.quantity);
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        subtotal: lineSubtotal,
      };
    });

    const itemsTotal = round(subtotal - discountTotal);
    const shippingFee = itemsTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
    const totalAmount = round(itemsTotal + shippingFee);

    // Transaction: create order, decrement stock, clear cart.
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          status: OrderStatus.PENDING,
          subtotal: round(subtotal),
          discount: round(discountTotal),
          shippingFee,
          totalAmount,
          paymentMethod: (input.paymentMethod as PaymentMethod) ?? PaymentMethod.COD,
          paymentStatus: PaymentStatus.UNPAID,
          shipFullName: input.shipping.fullName,
          shipPhone: input.shipping.phone,
          shipCountry: input.shipping.country,
          shipCity: input.shipping.city,
          shipStreet: input.shipping.street,
          shipPostalCode: input.shipping.postalCode,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      for (const item of orderItemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    return this.getById(order.id, userId, false);
  },

  async listMine(
    userId: string,
    params: { page: number; limit: number; skip: number; status?: OrderStatus },
  ) {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(params.status ? { status: params.status } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.order.count({ where }),
    ]);
    return { items, meta: buildMeta(params.page, params.limit, total) };
  },

  async listAll(params: {
    page: number;
    limit: number;
    skip: number;
    status?: OrderStatus;
    search?: string;
  }) {
    const where: Prisma.OrderWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { orderNumber: { contains: params.search, mode: 'insensitive' } },
              { user: { name: { contains: params.search, mode: 'insensitive' } } },
              { user: { email: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.order.count({ where }),
    ]);
    return { items, meta: buildMeta(params.page, params.limit, total) };
  },

  async getById(id: string, userId: string, isAdmin: boolean) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, user: { select: { id: true, name: true, email: true } } },
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (!isAdmin && order.userId !== userId) {
      throw ApiError.forbidden('You cannot access this order');
    }
    return order;
  },

  async updateStatus(id: string, status: OrderStatus, paymentStatus?: PaymentStatus) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw ApiError.notFound('Order not found');
    return prisma.order.update({
      where: { id },
      data: { status, ...(paymentStatus ? { paymentStatus } : {}) },
      include: { items: true },
    });
  },
};
