import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, ProductStatus } from '@prisma/client';
import slugify from 'slugify';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Electronics', description: 'Latest gadgets, audio, and smart devices.' },
  { name: 'Fashion', description: 'Apparel, footwear, and accessories.' },
  { name: 'Home & Living', description: 'Furniture, decor, and kitchen essentials.' },
  { name: 'Beauty', description: 'Skincare, makeup, and grooming.' },
  { name: 'Sports & Outdoors', description: 'Gear for training, travel, and adventure.' },
  { name: 'Books', description: 'Bestsellers, classics, and more.' },
];

const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1F2A44' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Green', hex: '#16A34A' },
];

const SIZES = [
  { name: 'XS', sortOrder: 1 },
  { name: 'S', sortOrder: 2 },
  { name: 'M', sortOrder: 3 },
  { name: 'L', sortOrder: 4 },
  { name: 'XL', sortOrder: 5 },
  { name: 'Standard', sortOrder: 6 },
];

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80`;

async function main() {
  console.log('Seeding database...');

  // Users
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const userPassword = await bcrypt.hash('User@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@shoply.com' },
    update: {},
    create: {
      name: 'Sam Rivera',
      email: 'admin@shoply.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      phone: '+1 202 555 0177',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'user@shoply.com' },
    update: {},
    create: {
      name: 'Alex Morgan',
      email: 'user@shoply.com',
      passwordHash: userPassword,
      role: Role.USER,
      phone: '+1 202 555 0112',
    },
  });

  // Categories
  const categoryMap = new Map<string, string>();
  for (const c of CATEGORIES) {
    const slug = slugify(c.name, { lower: true, strict: true });
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name: c.name, slug, description: c.description },
    });
    categoryMap.set(c.name, cat.id);
  }

  // Colors & sizes
  for (const c of COLORS) {
    await prisma.color.upsert({ where: { name: c.name }, update: {}, create: c });
  }
  for (const s of SIZES) {
    await prisma.size.upsert({ where: { name: s.name }, update: {}, create: s });
  }

  // Products
  const products = [
    {
      name: 'Aurora Wireless Headphones',
      sku: 'ELEC-AUR-001',
      category: 'Electronics',
      price: 199.99,
      discount: 20,
      stock: 42,
      featured: true,
      popular: true,
      newArrival: false,
      images: [img('1505740420928-5e560c06d30e'), img('1484704849700-f032a568e944')],
      description: 'Immersive over-ear headphones with active noise cancellation.',
    },
    {
      name: 'Meridian Smart Watch',
      sku: 'ELEC-MER-002',
      category: 'Electronics',
      price: 249.0,
      discount: 10,
      stock: 27,
      featured: true,
      popular: true,
      newArrival: true,
      images: [img('1523275335684-37898b6baf30')],
      description: 'Track fitness, sleep, and notifications with a vivid AMOLED display.',
    },
    {
      name: 'Nimbus Running Sneakers',
      sku: 'FASH-NIM-003',
      category: 'Fashion',
      price: 129.99,
      discount: 15,
      stock: 60,
      featured: true,
      popular: true,
      newArrival: false,
      images: [img('1542291026-7eec264c27ff')],
      description: 'Lightweight performance running shoes with responsive foam midsoles.',
    },
    {
      name: 'Cloud Comfort Hoodie',
      sku: 'FASH-CLD-004',
      category: 'Fashion',
      price: 69.99,
      discount: 0,
      stock: 0,
      featured: false,
      popular: true,
      newArrival: false,
      images: [img('1556821840-3a63f95609a7')],
      description: 'An ultra-soft brushed-fleece hoodie with a relaxed fit.',
    },
    {
      name: 'Lumen Desk Lamp',
      sku: 'HOME-LUM-005',
      category: 'Home & Living',
      price: 54.99,
      discount: 25,
      stock: 33,
      featured: false,
      popular: false,
      newArrival: true,
      images: [img('1507473885765-e6ed057f782c')],
      description: 'A minimalist LED desk lamp with adjustable color temperature.',
    },
  ];

  const black = await prisma.color.findUnique({ where: { name: 'Black' } });
  const white = await prisma.color.findUnique({ where: { name: 'White' } });
  const sizeM = await prisma.size.findUnique({ where: { name: 'M' } });
  const sizeStd = await prisma.size.findUnique({ where: { name: 'Standard' } });

  for (const p of products) {
    const slug = slugify(p.name, { lower: true, strict: true });
    const created = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        name: p.name,
        slug,
        sku: p.sku,
        categoryId: categoryMap.get(p.category)!,
        price: p.price,
        discount: p.discount,
        stock: p.stock,
        status: ProductStatus.ACTIVE,
        featured: p.featured,
        popular: p.popular,
        newArrival: p.newArrival,
        images: p.images,
        description: p.description,
        colors: {
          create: [{ colorId: black!.id }, { colorId: white!.id }],
        },
        sizes: {
          create: [{ sizeId: p.category === 'Fashion' ? sizeM!.id : sizeStd!.id }],
        },
      },
    });
    console.log(`  product: ${created.name}`);
  }

  // Homepage sections
  const sections = [
    { sectionKey: 'hero', title: 'Discover your next favorite', sortOrder: 1 },
    { sectionKey: 'perks', title: 'Why shop with us', sortOrder: 2 },
    { sectionKey: 'categories', title: 'Shop by category', sortOrder: 3 },
    { sectionKey: 'featured', title: 'Featured products', sortOrder: 4 },
    { sectionKey: 'popular', title: 'Popular right now', sortOrder: 5 },
    { sectionKey: 'newArrivals', title: 'New arrivals', sortOrder: 6 },
    { sectionKey: 'promo', title: 'Seasonal promotion', sortOrder: 7 },
  ];
  for (const s of sections) {
    await prisma.homepageSection.upsert({
      where: { sectionKey: s.sectionKey },
      update: {},
      create: s,
    });
  }

  const heroSection = await prisma.homepageSection.findUnique({ where: { sectionKey: 'hero' } });
  const existingSlides = await prisma.heroSlide.count();
  if (existingSlides === 0) {
    await prisma.heroSlide.createMany({
      data: [
        {
          sectionId: heroSection!.id,
          title: 'New Season Arrivals',
          subtitle: 'Up to 40% off',
          description: 'Refresh your wardrobe with the latest drops.',
          image: img('1441986300917-64674bd600d8'),
          buttonText: 'Shop now',
          buttonUrl: '/products',
          sortOrder: 1,
        },
        {
          sectionId: heroSection!.id,
          title: 'Tech that keeps up',
          subtitle: 'Smart devices',
          description: 'Explore our best-selling electronics.',
          image: img('1498049794561-7780e7231661'),
          buttonText: 'Explore',
          buttonUrl: '/products?category=electronics',
          sortOrder: 2,
        },
      ],
    });
  }

  console.log(
    `Seed complete. Admin: ${admin.email} / Admin@123 | User: ${customer.email} / User@123`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
