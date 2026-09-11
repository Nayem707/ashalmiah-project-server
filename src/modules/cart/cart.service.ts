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
        },
      },
    },
  });

  const items = (cart?.items ?? []).map((item) => {
    const price = Number(item.product.price);
    const unitPrice = priceAfterDiscount(price, item.product.discount);
    return {
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      image: item.product.images[0] ?? null,
      price,
      discount: item.product.discount,
      unitPrice,
      quantity: item.quantity,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
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
    input: { productId: string; quantity?: number; selectedColor?: string; selectedSize?: string },
  ) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product || product.status !== 'ACTIVE') throw ApiError.notFound('Product not available');

    const quantity = input.quantity ?? 1;
    if (product.stock < quantity) throw ApiError.badRequest('Insufficient stock');

    const cart = await getOrCreateCart(userId);

    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: input.productId,
        selectedColor: input.selectedColor ?? null,
        selectedSize: input.selectedSize ?? null,
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
