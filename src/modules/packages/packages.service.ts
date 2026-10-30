import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export const packageInclude = {
  lines: { include: { packageItem: true } },
  _count: { select: { products: true } },
} satisfies Prisma.PackageInclude;

type PackageWithLines = Prisma.PackageGetPayload<{ include: typeof packageInclude }>;

/**
 * Serialises a package for API responses. `regularPrice` is the sum of component
 * prices; `price` is the bundle price actually charged, so `savings` reflects the combo deal.
 */
export function shapePackage(p: PackageWithLines) {
  const items = p.lines.map((line) => {
    const unitPrice = Number(line.packageItem.unitPrice);
    return {
      id: line.id,
      packageItemId: line.packageItemId,
      name: line.packageItem.name,
      variant: line.packageItem.variant,
      unitPrice,
      quantity: line.quantity,
      lineTotal: roundMoney(unitPrice * line.quantity),
    };
  });
  const regularPrice = roundMoney(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
  const price = Number(p.price);
  const savings = regularPrice > price ? roundMoney(regularPrice - price) : 0;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price,
    regularPrice,
    savings,
    savingsPercent: regularPrice > 0 && savings > 0 ? Math.round((savings / regularPrice) * 100) : 0,
    status: p.status,
    items,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
    productCount: p._count?.products ?? 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function assertItemsExist(itemIds: string[]) {
  const uniqueIds = [...new Set(itemIds)];
  const count = await prisma.packageItem.count({ where: { id: { in: uniqueIds } } });
  if (count !== uniqueIds.length) {
    throw ApiError.badRequest('One or more package items are invalid');
  }
}

interface LineInput {
  packageItemId: string;
  quantity: number;
}

export const packagesService = {
  // ---- Package components (reusable catalogue) ----
  listItems() {
    return prisma.packageItem.findMany({ orderBy: { name: 'asc' } });
  },

  createItem(data: { name: string; variant?: string; unitPrice: number }) {
    return prisma.packageItem.create({ data });
  },

  async updateItem(
    id: string,
    data: { name?: string; variant?: string | null; unitPrice?: number },
  ) {
    const existing = await prisma.packageItem.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Package item not found');
    return prisma.packageItem.update({ where: { id }, data });
  },

  async removeItem(id: string) {
    const existing = await prisma.packageItem.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Package item not found');
    const used = await prisma.packageLine.count({ where: { packageItemId: id } });
    if (used > 0) {
      throw ApiError.conflict('Cannot delete an item that is still used by a package');
    }
    await prisma.packageItem.delete({ where: { id } });
    return { message: 'Package item deleted' };
  },

  // ---- Packages ----
  async list(params: {
    status?: 'ACTIVE' | 'INACTIVE';
    search?: string;
    productId?: string;
    isAdmin?: boolean;
  }) {
    const where: Prisma.PackageWhereInput = {
      // Non-admin callers only ever see active packages.
      ...(params.isAdmin ? (params.status ? { status: params.status } : {}) : { status: 'ACTIVE' }),
      ...(params.productId ? { products: { some: { productId: params.productId } } } : {}),
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
    };
    const packages = await prisma.package.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: packageInclude,
    });
    return packages.map(shapePackage);
  },

  async getById(id: string, isAdmin = false) {
    const pkg = await prisma.package.findUnique({ where: { id }, include: packageInclude });
    if (!pkg) throw ApiError.notFound('Package not found');
    if (!isAdmin && pkg.status !== 'ACTIVE') throw ApiError.notFound('Package not found');
    return shapePackage(pkg);
  },

  async create(data: {
    name: string;
    description?: string;
    price: number;
    status?: 'ACTIVE' | 'INACTIVE';
    items: LineInput[];
  }) {
    await assertItemsExist(data.items.map((i) => i.packageItemId));
    const pkg = await prisma.package.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        status: data.status ?? 'ACTIVE',
        lines: {
          create: data.items.map((i) => ({
            packageItemId: i.packageItemId,
            quantity: i.quantity,
          })),
        },
      },
      include: packageInclude,
    });
    return shapePackage(pkg);
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      price?: number;
      status?: 'ACTIVE' | 'INACTIVE';
      items?: LineInput[];
    },
  ) {
    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Package not found');
    if (data.items) await assertItemsExist(data.items.map((i) => i.packageItemId));

    const pkg = await prisma.package.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        status: data.status,
        ...(data.items
          ? {
              lines: {
                deleteMany: {},
                create: data.items.map((i) => ({
                  packageItemId: i.packageItemId,
                  quantity: i.quantity,
                })),
              },
            }
          : {}),
      },
      include: packageInclude,
    });
    return shapePackage(pkg);
  },

  async remove(id: string) {
    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Package not found');
    // Cascades remove PackageLine + ProductPackage rows; cart/order references are set null
    // so historical orders keep their package snapshot (packageName/packagePrice).
    await prisma.package.delete({ where: { id } });
    return { message: 'Package deleted' };
  },
};
