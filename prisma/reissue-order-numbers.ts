/**
 * Replaces legacy, guessable order numbers (e.g. "ORD-12345") with secure
 * random ones so they can be used for public order tracking.
 *
 * Dry run (default):  npm run db:reissue-order-numbers
 * Apply changes:      npm run db:reissue-order-numbers -- --apply
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ORDER_NUMBER_PATTERN, generateOrderNumber } from '../src/utils/orderNumber';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const orders = await prisma.order.findMany({
    select: { id: true, orderNumber: true },
    orderBy: { createdAt: 'asc' },
  });
  const legacy = orders.filter((o) => !ORDER_NUMBER_PATTERN.test(o.orderNumber));
  const taken = new Set(orders.map((o) => o.orderNumber));

  console.log(`${legacy.length} of ${orders.length} orders need a new number.`);

  for (const order of legacy) {
    let next = generateOrderNumber();
    while (taken.has(next)) next = generateOrderNumber();
    taken.add(next);

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
