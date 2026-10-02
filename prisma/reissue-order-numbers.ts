/**
 * Renumbers orders that don't use the `#ORD-YYYYMMDD-NNN` format, using each order's
 * own creation date (store time zone) and continuing that day's sequence in order of
 * creation. Run while checkout traffic is quiet.
 *
 * Dry run (default):  npm run db:reissue-order-numbers
 * Apply changes:      npm run db:reissue-order-numbers -- --apply
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  ORDER_NUMBER_PATTERN,
  formatOrderNumber,
  orderDateKey,
  orderSequenceOf,
} from '../src/utils/orderNumber';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const orders = await prisma.order.findMany({
    select: { id: true, orderNumber: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const lastSequenceByDay = new Map<string, number>();
  for (const order of orders) {
    if (!ORDER_NUMBER_PATTERN.test(order.orderNumber)) continue;
    const day = orderDateKey(order.createdAt);
    const sequence = orderSequenceOf(order.orderNumber, day);
    lastSequenceByDay.set(day, Math.max(lastSequenceByDay.get(day) ?? 0, sequence));
  }

  const legacy = orders.filter((o) => !ORDER_NUMBER_PATTERN.test(o.orderNumber));
  console.log(`${legacy.length} of ${orders.length} orders need a new number.`);

  for (const order of legacy) {
    const day = orderDateKey(order.createdAt);
    const sequence = (lastSequenceByDay.get(day) ?? 0) + 1;
    lastSequenceByDay.set(day, sequence);
    const next = formatOrderNumber(day, sequence);

    console.log(`  ${order.orderNumber} -> ${next}`);
    if (apply) {
      await prisma.order.update({ where: { id: order.id }, data: { orderNumber: next } });
    }
  }

  console.log(apply ? 'Done.' : 'Dry run only. Re-run with --apply to save.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
