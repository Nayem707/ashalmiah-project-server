import { ApiError } from '../../utils/apiError';
import { prisma } from '../../config/prisma';
import {
  DEFAULT_BDT_PER_USD,
  normalizeCurrency,
} from '../../utils/currency';

const DEFAULT_ID = 'default';

const ALLOWED_CURRENCIES = new Set(['USD', 'BDT']);

function toPublicSettings(row: {
  storeName: string;
  supportEmail: string;
  phone: string;
  currency: string;
  bdtPerUsd: { toString(): string } | number;
  address: string;
  shippingFlatRate: { toString(): string } | number;
  freeShippingMin: { toString(): string } | number;
  deliveryInsideDhaka: { toString(): string } | number;
  deliveryOutsideDhaka: { toString(): string } | number;
}) {
  return {
    storeName: row.storeName,
    supportEmail: row.supportEmail,
    phone: row.phone,
    currency: normalizeCurrency(row.currency),
    bdtPerUsd: Number(row.bdtPerUsd) || DEFAULT_BDT_PER_USD,
    address: row.address,
    shippingFlatRate: Number(row.shippingFlatRate),
    freeShippingMin: Number(row.freeShippingMin),
    deliveryInsideDhaka: Number(row.deliveryInsideDhaka),
    deliveryOutsideDhaka: Number(row.deliveryOutsideDhaka),
  };
}

async function ensureSettings() {
  return prisma.appSettings.upsert({
    where: { id: DEFAULT_ID },
    create: { id: DEFAULT_ID },
    update: {},
  });
}

export const settingsService = {
  async get() {
    const row = await ensureSettings();
    return toPublicSettings(row);
  },

  async updateStore(input: {
    storeName?: string;
    supportEmail?: string;
    phone?: string;
    currency?: string;
    bdtPerUsd?: number;
    address?: string;
  }) {
    await ensureSettings();
    const currency = input.currency?.toUpperCase();
    if (currency && !ALLOWED_CURRENCIES.has(currency)) {
      throw ApiError.badRequest('Unsupported currency');
    }
    if (input.bdtPerUsd !== undefined) {
      const rate = Number(input.bdtPerUsd);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw ApiError.badRequest('Exchange rate must be a positive number');
      }
    }

    const row = await prisma.appSettings.update({
      where: { id: DEFAULT_ID },
      data: {
        ...(input.storeName !== undefined ? { storeName: input.storeName } : {}),
        ...(input.supportEmail !== undefined ? { supportEmail: input.supportEmail } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(currency ? { currency: normalizeCurrency(currency) } : {}),
        ...(input.bdtPerUsd !== undefined ? { bdtPerUsd: input.bdtPerUsd } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
      },
    });
    return toPublicSettings(row);
  },

  async updateShipping(input: {
    shippingFlatRate?: number;
    freeShippingMin?: number;
    deliveryInsideDhaka?: number;
    deliveryOutsideDhaka?: number;
  }) {
    await ensureSettings();
    const row = await prisma.appSettings.update({
      where: { id: DEFAULT_ID },
      data: {
        ...(input.shippingFlatRate !== undefined
          ? { shippingFlatRate: input.shippingFlatRate }
          : {}),
        ...(input.freeShippingMin !== undefined
          ? { freeShippingMin: input.freeShippingMin }
          : {}),
        ...(input.deliveryInsideDhaka !== undefined
          ? { deliveryInsideDhaka: input.deliveryInsideDhaka }
          : {}),
        ...(input.deliveryOutsideDhaka !== undefined
          ? { deliveryOutsideDhaka: input.deliveryOutsideDhaka }
          : {}),
      },
    });
    return toPublicSettings(row);
  },
};
