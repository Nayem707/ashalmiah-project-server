import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';

async function getOrCreateCart(userId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (cart) return cart;
  return prisma.cart.create({ data: { userId } });
}

function priceAfterDiscount(price: number, discount: number) {
  return Math.round(price * (1 - discount / 100) * 100) / 100;
}

async function buildCartResponse(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              discount: true,
              images: true,
              stock: true,
            },
          },
          selectedPackage: {
            include: { lines: { include: { packageItem: true } } },
          },
        },
      },
    },
  });

  const items = (cart?.items ?? []).map((item) => {
    const pkg = item.selectedPackage;
    // A selected package is an add-on: its price is ADDED to the product price (DB-trusted).
    const base = Number(item.product.price) + (pkg ? Number(pkg.price) : 0);
    const unitPrice = priceAfterDiscount(base, item.product.discount);
    return {
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      image: item.product.images[0] ?? null,
      price: base,
      productPrice: Number(item.product.price),
      discount: item.product.discount,
      unitPrice,
      quantity: item.quantity,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
      selectedPackageId: item.selectedPackageId,
      selectedPackage: pkg
        ? {
            id: pkg.id,
            name: pkg.name,
            price: Number(pkg.price),
            status: pkg.status,
            items: pkg.lines.map((line) => ({
              name: line.packageItem.name,
              variant: line.packageItem.variant,
              quantity: line.quantity,
            })),
          }
        : null,
      stock: item.product.stock,
      lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
    };
  });

  const subtotal = Math.round(items.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return { id: cart?.id ?? null, items, subtotal, totalItems };
}

export const cartService = {
  get(userId: string) {
    return buildCartResponse(userId);
  },

  async addItem(
    userId: string,
    input: {
      productId: string;
      quantity?: number;
      selectedColor?: string;
      selectedSize?: string;
      selectedPackageId?: string;
    },
  ) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product || product.status !== 'ACTIVE') throw ApiError.notFound('Product not available');

    const quantity = input.quantity ?? 1;
    if (product.stock < quantity) throw ApiError.badRequest('Insufficient stock');

    // A package may only be added if it is active and assigned to this product.
    if (input.selectedPackageId) {
      const pkg = await prisma.package.findFirst({
        where: {
          id: input.selectedPackageId,
          status: 'ACTIVE',
          products: { some: { productId: input.productId } },
        },
        select: { id: true },
      });
      if (!pkg) throw ApiError.badRequest('Selected package is not available for this product');
    }

    const cart = await getOrCreateCart(userId);

    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: input.productId,
        selectedColor: input.selectedColor ?? null,
        selectedSize: input.selectedSize ?? null,
        selectedPackageId: input.selectedPackageId ?? null,
      },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (product.stock < newQty) throw ApiError.badRequest('Insufficient stock');
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          quantity,
          selectedColor: input.selectedColor,
          selectedSize: input.selectedSize,
          selectedPackageId: input.selectedPackageId,
        },
      });
    }
    return buildCartResponse(userId);
  },

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await getOrCreateCart(userId);
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    });
    if (!item) throw ApiError.notFound('Cart item not found');
    if (item.product.stock < quantity) throw ApiError.badRequest('Insufficient stock');
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return buildCartResponse(userId);
  },

  async removeItem(userId: string, itemId: string) {
    const cart = await getOrCreateCart(userId);
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw ApiError.notFound('Cart item not found');
    await prisma.cartItem.delete({ where: { id: itemId } });
    return buildCartResponse(userId);
  },

  async clear(userId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return buildCartResponse(userId);
  },
};
