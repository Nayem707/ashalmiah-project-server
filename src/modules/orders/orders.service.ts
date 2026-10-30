import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { CancelledBy, OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { buildMeta } from '../../utils/pagination';
import { settingsService } from '../settings/settings.service';
import {
  formatOrderNumber,
  orderDateKey,
  orderNumberPrefix,
  orderSequenceOf,
} from '../../utils/orderNumber';
import { normalizeBdMobile } from '../../utils/phone';

const TRACKING_ORDER_LIMIT = 20;

/** Statuses a customer may cancel themselves; later stages go through support. */
const CUSTOMER_CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];

// 32 symbols (no 0/O/1/I) so each random byte maps without bias.
const CANCEL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CANCEL_CODE_LENGTH = 10;

function generateCancelCode() {
  const chars = Array.from(randomBytes(CANCEL_CODE_LENGTH), (b) => CANCEL_CODE_ALPHABET[b & 31]);
  return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`;
}

function hashCancelCode(code: string) {
  return createHash('sha256')
    .update(code.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .digest('hex');
}

function cancelCodeMatches(code: string, storedHash: string | null) {
  if (!storedHash) return false;
  const given = Buffer.from(hashCancelCode(code), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return given.length === stored.length && timingSafeEqual(given, stored);
}

function assertCustomerCancellable(status: OrderStatus) {
  if (CUSTOMER_CANCELLABLE.includes(status)) return;
  if (status === OrderStatus.CANCELLED) throw ApiError.conflict('This order is already cancelled');
  if (status === OrderStatus.PROCESSING) {
    throw ApiError.conflict(
      'This order is already being processed. Please contact support to cancel it.',
    );
  }
  throw ApiError.conflict('Shipped or delivered orders cannot be cancelled');
}

/**
 * Cancels only if the order still matches `where` (including its current status), so a
 * repeated or concurrent request finds nothing to update and stock is restored once.
 */
async function cancelAndRestock(
  tx: Prisma.TransactionClient,
  where: Prisma.OrderWhereInput & { id: string },
  data: Prisma.OrderUpdateManyMutationInput,
) {
  const { count } = await tx.order.updateMany({
    where,
    data: { ...data, status: OrderStatus.CANCELLED, cancelledAt: new Date() },
  });
  if (count === 0) return false;

  const items = await tx.orderItem.findMany({ where: { orderId: where.id } });
  for (const item of items) {
    if (!item.productId) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
  return true;
}

const orderItemInclude = {
  product: { select: { id: true, images: true } },
} satisfies Prisma.OrderItemInclude;

const orderInclude = {
  items: { include: orderItemInclude },
} satisfies Prisma.OrderInclude;

const orderAdminInclude = {
  items: { include: orderItemInclude },
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type OrderWithItemsAdmin = Prisma.OrderGetPayload<{ include: typeof orderAdminInclude }>;

interface CheckoutItemInput {
  productId: string;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  selectedPackageId?: string;
}

interface ShippingInput {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  postalCode?: string;
  deliveryArea?: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA';
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

const ORDER_NUMBER_ATTEMPTS = 3;

/**
 * Next `#ORD-YYYYMMDD-NNN` for the day of `createdAt`. Must run inside the transaction
 * that inserts the order: the advisory lock is held until that transaction commits,
 * so concurrent checkouts for the same day are numbered one after another.
 */
async function allocateOrderNumber(tx: Prisma.TransactionClient, createdAt: Date) {
  const dateKey = orderDateKey(createdAt);
  const prefix = orderNumberPrefix(dateKey);

  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`order-number:${dateKey}`}))`;

  const [latest] = await tx.$queryRaw<Array<{ orderNumber: string }>>`
    SELECT "orderNumber" FROM "Order"
    WHERE "orderNumber" LIKE ${`${prefix}%`}
    ORDER BY length("orderNumber") DESC, "orderNumber" DESC
    LIMIT 1
  `;

  return formatOrderNumber(dateKey, orderSequenceOf(latest?.orderNumber ?? '', dateKey) + 1);
}

function isOrderNumberConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.includes('orderNumber')
    : String(target).includes('orderNumber');
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 5) return '*'.repeat(digits.length);
  return `${digits.slice(0, 3)}${'*'.repeat(digits.length - 5)}${digits.slice(-2)}`;
}

const publicTrackingSelect = {
  orderNumber: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  currency: true,
  subtotal: true,
  discount: true,
  shippingFee: true,
  totalAmount: true,
  shipFullName: true,
  shipPhone: true,
  shipCountry: true,
  shipCity: true,
  cancelReason: true,
  cancelledAt: true,
  cancelledBy: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      productId: true,
      productName: true,
      quantity: true,
      unitPrice: true,
      selectedColor: true,
      selectedSize: true,
      packageId: true,
      packageName: true,
      packagePrice: true,
      subtotal: true,
      product: { select: { images: true } },
    },
  },
} satisfies Prisma.OrderSelect;

function resolveItemImage(item: { product?: { images?: string[] } | null }): string | null {
  return item.product?.images?.[0] ?? null;
}

function shapeOrderItem<T extends { product?: { images?: string[] } | null }>(item: T) {
  const { product, ...rest } = item;
  return {
    ...rest,
    image: resolveItemImage({ product }),
  };
}

function shapeOrder<
  T extends {
    items: Array<{ product?: { images?: string[] } | null }>;
    currency?: string | null;
    guestCancelTokenHash?: string | null;
  },
>(order: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { guestCancelTokenHash, ...rest } = order;
  return {
    ...rest,
    currency: order.currency || 'BDT',
    items: order.items.map(shapeOrderItem),
  };
}

async function resolveItems(
  _userId: string | null,
  provided?: CheckoutItemInput[],
): Promise<CheckoutItemInput[]> {
  if (!provided?.length) throw ApiError.badRequest('Cart is empty');
  return provided;
}

export const ordersService = {
  /** `userId` is null for guest checkout; it always comes from the verified token, never the body. */
  async checkout(
    userId: string | null,
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

    // Fetch any selected packages once; prices come from the DB, never the client.
    const selectedPackageIds = [
      ...new Set(items.map((i) => i.selectedPackageId).filter((id): id is string => Boolean(id))),
    ];
    const packages = selectedPackageIds.length
      ? await prisma.package.findMany({
          where: { id: { in: selectedPackageIds } },
          include: { products: { select: { productId: true } } },
        })
      : [];
    const packageMap = new Map(packages.map((p) => [p.id, p]));

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

      // Package pricing: a selected package is an ADD-ON — its DB price is added to the product
      // price, then the product discount applies. The name/price are snapshotted so the order is
      // stable if the package is later renamed or removed. No package = product price only.
      let basePrice = Number(product.price);
      let packageId: string | null = null;
      let packageName: string | null = null;
      let packagePrice: number | null = null;
      if (item.selectedPackageId) {
        const pkg = packageMap.get(item.selectedPackageId);
        if (!pkg || pkg.status !== 'ACTIVE') {
          throw ApiError.badRequest(`Selected package is not available for ${product.name}`);
        }
        if (!pkg.products.some((pp) => pp.productId === product.id)) {
          throw ApiError.badRequest(`Selected package does not belong to ${product.name}`);
        }
        basePrice = Number(product.price) + Number(pkg.price);
        packageId = pkg.id;
        packageName = pkg.name;
        packagePrice = Number(pkg.price);
      }

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
        packageId,
        packageName,
        packagePrice,
        subtotal: lineSubtotal,
      };
    });

    const itemsTotal = round(subtotal - discountTotal);
    const storeSettings = await settingsService.get();
    const shippingFee =
      input.shipping.deliveryArea === 'INSIDE_DHAKA'
        ? storeSettings.deliveryInsideDhaka
        : storeSettings.deliveryOutsideDhaka;
    const totalAmount = round(itemsTotal + shippingFee);

    // Orders store amounts in product base currency (unchanged DB prices). Default BDT.
    const orderCurrency = products[0]?.baseCurrency?.toUpperCase() === 'USD' ? 'USD' : 'BDT';

    // Guests can't sign in, so this one-time code (shown once, stored hashed) proves ownership.
    const guestCancelCode = userId ? null : generateCancelCode();

    // Transaction: number the order, create it, decrement stock, clear cart.
    const placeOrder = () =>
      prisma.$transaction(
        async (tx) => {
          const createdAt = new Date();
          const orderNumber = await allocateOrderNumber(tx, createdAt);

          const created = await tx.order.create({
            data: {
              orderNumber,
              createdAt,
              userId,
              status: OrderStatus.PENDING,
              subtotal: round(subtotal),
              discount: round(discountTotal),
              shippingFee,
              totalAmount,
              currency: orderCurrency,
              paymentMethod: (input.paymentMethod as PaymentMethod) ?? PaymentMethod.COD,
              paymentStatus: PaymentStatus.UNPAID,
              shipFullName: input.shipping.fullName,
              shipPhone: normalizeBdMobile(input.shipping.phone) ?? input.shipping.phone,
              shipCountry: input.shipping.country,
              shipCity: input.shipping.city,
              shipStreet: input.shipping.street,
              shipPostalCode: input.shipping.postalCode,
              guestCancelTokenHash: guestCancelCode ? hashCancelCode(guestCancelCode) : null,
              items: { create: orderItemsData },
            },
            include: orderInclude,
          });

          for (const item of orderItemsData) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }

          if (userId) {
            const cart = await tx.cart.findUnique({ where: { userId } });
            if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          }

          return created;
        },
        { maxWait: 10_000, timeout: 20_000 },
      );

    let order: Awaited<ReturnType<typeof placeOrder>> | undefined;
    for (let attempt = 1; !order; attempt += 1) {
      try {
        order = await placeOrder();
      } catch (error) {
        if (!isOrderNumberConflict(error) || attempt >= ORDER_NUMBER_ATTEMPTS) throw error;
      }
    }

    return userId
      ? this.getById(order.id, userId, false)
      : { ...shapeOrder(order), guestCancelCode };
  },

  /** Signed-in customer cancelling their own order; `userId` comes from the verified token. */
  async cancelMine(id: string, userId: string, reason: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.userId !== userId) throw ApiError.forbidden('You cannot access this order');
    assertCustomerCancellable(order.status);

    const cancelled = await prisma.$transaction((tx) =>
      cancelAndRestock(
        tx,
        { id, userId, status: { in: CUSTOMER_CANCELLABLE } },
        { cancelReason: reason, cancelledBy: CancelledBy.CUSTOMER },
      ),
    );
    if (!cancelled) {
      throw ApiError.conflict('This order was just updated. Please refresh and try again.');
    }
    return this.getById(id, userId, false);
  },

  /** Public: guest cancellation requires phone, order number and the checkout cancellation code. */
  async cancelAsGuest(input: { phone: string; orderNumber: string; code: string; reason: string }) {
    const order = await prisma.order.findUnique({
      where: { orderNumber: input.orderNumber },
      select: { id: true, shipPhone: true, status: true, guestCancelTokenHash: true },
    });
    // One message for every mismatch so the response doesn't reveal which detail was wrong.
    if (
      !order ||
      normalizeBdMobile(order.shipPhone) !== input.phone ||
      !cancelCodeMatches(input.code, order.guestCancelTokenHash)
    ) {
      throw ApiError.notFound('Order not found or the cancellation code is incorrect');
    }
    assertCustomerCancellable(order.status);

    const cancelled = await prisma.$transaction((tx) =>
      cancelAndRestock(
        tx,
        {
          id: order.id,
          guestCancelTokenHash: order.guestCancelTokenHash,
          status: { in: CUSTOMER_CANCELLABLE },
        },
        { cancelReason: input.reason, cancelledBy: CancelledBy.CUSTOMER },
      ),
    );
    if (!cancelled) {
      throw ApiError.conflict('This order was just updated. Please refresh and try again.');
    }
    return this.trackOrderDetails(input.phone, input.orderNumber);
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
        include: orderInclude,
      }),
      prisma.order.count({ where }),
    ]);
    return {
      items: (items as OrderWithItems[]).map(shapeOrder),
      meta: buildMeta(params.page, params.limit, total),
    };
  },

  async listAll(params: {
    page: number;
    limit: number;
    skip: number;
    status?: OrderStatus;
    search?: string;
    customerType?: 'USER' | 'GUEST';
  }) {
    const where: Prisma.OrderWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.customerType === 'USER' ? { userId: { not: null } } : {}),
      ...(params.customerType === 'GUEST' ? { userId: null } : {}),
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
        include: orderAdminInclude,
      }),
      prisma.order.count({ where }),
    ]);
    return {
      items: (items as OrderWithItemsAdmin[]).map(shapeOrder),
      meta: buildMeta(params.page, params.limit, total),
    };
  },

  async getById(id: string, userId: string, isAdmin: boolean) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: orderAdminInclude,
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (!isAdmin && order.userId !== userId) {
      throw ApiError.forbidden('You cannot access this order');
    }
    return shapeOrder(order);
  },

  /** Public, unauthenticated: order numbers placed with this mobile number (no item details). */
  async trackByPhone(phone: string) {
    // Stored phones may contain spaces, dashes or +880, so match on their digits.
    const matches = await prisma.$queryRaw<
      Array<{ orderNumber: string; status: OrderStatus; createdAt: Date; shipPhone: string }>
    >`
      SELECT "orderNumber", status, "createdAt", "shipPhone" FROM "Order"
      WHERE right(regexp_replace("shipPhone", '\\D', '', 'g'), 10) = ${phone.slice(1)}
      ORDER BY "createdAt" DESC
      LIMIT ${TRACKING_ORDER_LIMIT}
    `;

    return matches
      .filter((order) => normalizeBdMobile(order.shipPhone) === phone)
      .map(({ orderNumber, status, createdAt }) => ({ orderNumber, status, createdAt }));
  },

  /** Public, unauthenticated: one order's details, only if it was placed with this mobile number. */
  async trackOrderDetails(phone: string, orderNumber: string) {
    const found = await prisma.order.findUnique({
      where: { orderNumber },
      select: { ...publicTrackingSelect, userId: true, guestCancelTokenHash: true },
    });
    if (!found || normalizeBdMobile(found.shipPhone) !== phone) {
      throw ApiError.notFound('No order found for this mobile number');
    }
    const { userId, guestCancelTokenHash, ...order } = found;
    return {
      ...order,
      isAccountOrder: Boolean(userId),
      hasCancelCode: Boolean(guestCancelTokenHash),
      currency: order.currency || 'BDT',
      shipPhone: maskPhone(order.shipPhone),
      items: order.items.map(shapeOrderItem),
    };
  },

  async updateStatus(id: string, status: OrderStatus, paymentStatus?: PaymentStatus) {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!order) throw ApiError.notFound('Order not found');

    const becomingCancelled =
      status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED;

    const updated = await prisma.$transaction(async (tx) => {
      if (becomingCancelled) {
        const cancelled = await cancelAndRestock(
          tx,
          { id, status: { not: OrderStatus.CANCELLED } },
          { cancelledBy: CancelledBy.ADMIN, ...(paymentStatus ? { paymentStatus } : {}) },
        );
        if (!cancelled) throw ApiError.conflict('This order is already cancelled');
        return tx.order.findUniqueOrThrow({ where: { id }, include: orderAdminInclude });
      }

      return tx.order.update({
        where: { id },
        data: { status, ...(paymentStatus ? { paymentStatus } : {}) },
        include: orderAdminInclude,
      });
    });

    return shapeOrder(updated);
  },
};
