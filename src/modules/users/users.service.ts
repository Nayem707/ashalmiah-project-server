import { Prisma, User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { comparePassword, hashPassword } from '../../utils/password';
import { buildMeta } from '../../utils/pagination';

function toPublicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export const usersService = {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: true },
    });
    if (!user) throw ApiError.notFound('User not found');
    return { ...toPublicUser(user), addresses: user.addresses };
  },

  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; avatarUrl?: string | null },
  ) {
    const payload: { name?: string; phone?: string | null; avatarUrl?: string | null } = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.phone !== undefined) payload.phone = data.phone || null;
    if (data.avatarUrl !== undefined) {
      payload.avatarUrl = data.avatarUrl ? data.avatarUrl : null;
    }
    const user = await prisma.user.update({ where: { id: userId }, data: payload });
    return toPublicUser(user);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw ApiError.badRequest('Current password is incorrect');
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    return { message: 'Password updated' };
  },

  // ---- Admin ----
  async listUsers(params: {
    page: number;
    limit: number;
    skip: number;
    search?: string;
    role?: 'USER' | 'ADMIN';
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    const where: Prisma.UserWhereInput = {
      ...(params.role ? { role: params.role } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { orders: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({ ...toPublicUser(u), orders: u._count.orders })),
      meta: buildMeta(params.page, params.limit, total),
    };
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { addresses: true, _count: { select: { orders: true } } },
    });
    if (!user) throw ApiError.notFound('User not found');
    return { ...toPublicUser(user), addresses: user.addresses, orders: user._count.orders };
  },

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    const user = await prisma.user.update({ where: { id }, data: { status } });
    return toPublicUser(user);
  },

  // ---- Addresses ----
  async listAddresses(userId: string) {
    return prisma.address.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  },

  async createAddress(userId: string, data: Prisma.AddressCreateWithoutUserInput) {
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.address.create({ data: { ...data, user: { connect: { id: userId } } } });
  },

  async updateAddress(userId: string, id: string, data: Prisma.AddressUpdateInput) {
    const existing = await prisma.address.findFirst({ where: { id, userId } });
    if (!existing) throw ApiError.notFound('Address not found');
    if (data.isDefault === true) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.address.update({ where: { id }, data });
  },

  async deleteAddress(userId: string, id: string) {
    const existing = await prisma.address.findFirst({ where: { id, userId } });
    if (!existing) throw ApiError.notFound('Address not found');
    await prisma.address.delete({ where: { id } });
    return { message: 'Address deleted' };
  },
};
