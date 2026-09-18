import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';

export const homepageService = {
  // Aggregated public payload for rendering the storefront homepage.
  async getPublic() {
    const [sections, slides, featured, popular, newArrivals, categories] = await Promise.all([
      // Return all sections (including inactive) so the storefront can honor
      // per-section `active` flags without falling back to client defaults.
      prisma.homepageSection.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.heroSlide.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.product.findMany({
        where: { status: 'ACTIVE', featured: true },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findMany({
        where: { status: 'ACTIVE', popular: true },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findMany({
        where: { status: 'ACTIVE', newArrival: true },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.category.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } }),
    ]);

    const mapProduct = (p: (typeof featured)[number]) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      discount: p.discount,
      rating: p.rating,
      image: p.images[0] ?? null,
    });

    return {
      sections,
      heroSlides: slides,
      categories,
      featured: featured.map(mapProduct),
      popular: popular.map(mapProduct),
      newArrivals: newArrivals.map(mapProduct),
    };
  },

  listSections() {
    return prisma.homepageSection.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async updateSection(key: string, data: Prisma.HomepageSectionUpdateInput) {
    const section = await prisma.homepageSection.findUnique({ where: { sectionKey: key } });
    if (!section) {
      return prisma.homepageSection.create({
        data: { ...(data as Prisma.HomepageSectionCreateInput), sectionKey: key },
      });
    }
    return prisma.homepageSection.update({ where: { sectionKey: key }, data });
  },

  listSlides() {
    return prisma.heroSlide.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  createSlide(data: Prisma.HeroSlideCreateInput) {
    return prisma.heroSlide.create({ data });
  },

  async updateSlide(id: string, data: Prisma.HeroSlideUpdateInput) {
    const slide = await prisma.heroSlide.findUnique({ where: { id } });
    if (!slide) throw ApiError.notFound('Slide not found');
    return prisma.heroSlide.update({ where: { id }, data });
  },

  async removeSlide(id: string) {
    const slide = await prisma.heroSlide.findUnique({ where: { id } });
    if (!slide) throw ApiError.notFound('Slide not found');
    await prisma.heroSlide.delete({ where: { id } });
    return { message: 'Slide deleted' };
  },
};
