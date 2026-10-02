/**
 * Regenerates product/category slugs that the old strict slugify produced as
 * "", "-1", "-2", ... for non-Latin (e.g. Bengali) names.
 *
 * Dry run (default):  npm run db:fix-slugs
 * Apply changes:      npm run db:fix-slugs -- --apply
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { isBrokenSlug, toSlug } from '../src/utils/slug';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

type SlugModel = 'product' | 'category';

async function slugTaken(model: SlugModel, slug: string, ignoreId: string) {
  const existing =
    model === 'product'
      ? await prisma.product.findUnique({ where: { slug }, select: { id: true } })
      : await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  return !!existing && existing.id !== ignoreId;
}

async function nextSlug(model: SlugModel, name: string, id: string, reserved: Set<string>) {
  const base = toSlug(name, model);
  let slug = base;
  let n = 1;
  while (reserved.has(slug) || (await slugTaken(model, slug, id))) {
    slug = `${base}-${n++}`;
  }
  reserved.add(slug);
  return slug;
}

async function fix(model: SlugModel) {
  const rows =
    model === 'product'
      ? await prisma.product.findMany({ select: { id: true, name: true, slug: true } })
      : await prisma.category.findMany({ select: { id: true, name: true, slug: true } });

  const broken = rows.filter((row) => isBrokenSlug(row.slug));
  const reserved = new Set<string>();
  console.log(`\n${model}: ${broken.length} of ${rows.length} have broken slugs`);

  for (const row of broken) {
    const slug = await nextSlug(model, row.name, row.id, reserved);
    console.log(`  ${row.id}  "${row.slug}" -> "${slug}"`);
    if (!apply) continue;
    if (model === 'product') {
      await prisma.product.update({ where: { id: row.id }, data: { slug } });
    } else {
      await prisma.category.update({ where: { id: row.id }, data: { slug } });
    }
  }
}

async function main() {
  await fix('category');
  await fix('product');
  console.log(apply ? '\nSlugs updated.' : '\nDry run only. Re-run with --apply to save.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
