import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';

type HeroSlideInput = {
  id?: string | number;
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  image?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  active?: boolean;
  sortOrder?: number;
};

function asSlideArray(value: unknown): HeroSlideInput[] {
  return Array.isArray(value) ? (value as HeroSlideInput[]) : [];
}

function normalizePublicSlide(slide: HeroSlideInput, index: number) {
  return {
    id: slide.id != null ? String(slide.id) : `slide-${index + 1}`,
    title: String(slide.title || `Slide ${index + 1}`),
    subtitle: slide.subtitle || null,
    description: slide.description || null,
    image: String(slide.image || ''),
    buttonText: slide.buttonText || null,
    buttonUrl: slide.buttonUrl || null,
    active: slide.active !== false,
    sortOrder: typeof slide.sortOrder === 'number' ? slide.sortOrder : index,
  };
}

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

    const heroSection = sections.find((section) => section.sectionKey === 'hero');
    const content = (heroSection?.content ?? null) as { slides?: unknown } | null;
    const contentSlides = asSlideArray(content?.slides)
      .map((slide, index) => normalizePublicSlide(slide, index))
      .filter((slide) => slide.active && Boolean(slide.image));

    const tableSlides = slides.map((slide, index) =>
      normalizePublicSlide(
        {
          id: slide.id,
          title: slide.title,
          subtitle: slide.subtitle,
          description: slide.description,
          image: slide.image,
          buttonText: slide.buttonText,
          buttonUrl: slide.buttonUrl,
          active: slide.active,
          sortOrder: slide.sortOrder,
        },
        index,
      ),
    );

    // Prefer admin-managed section content (includes uploaded images) when present.
    const heroSlides = contentSlides.length > 0 ? contentSlides : tableSlides;

    return {
      sections,
      heroSlides,
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
    const existing = await prisma.homepageSection.findUnique({ where: { sectionKey: key } });
    const section = existing
      ? await prisma.homepageSection.update({ where: { sectionKey: key }, data })
      : await prisma.homepageSection.create({
          data: { ...(data as Prisma.HomepageSectionCreateInput), sectionKey: key },
        });

    if (key === 'hero') {
      const content = (section.content ?? null) as { slides?: unknown } | null;
      await this.syncHeroSlides(section.id, asSlideArray(content?.slides));
    }

    return section;
  },

  /**
   * Keep HeroSlide rows in sync with Home Page Management hero content.
   */
  async syncHeroSlides(sectionId: string, slides: HeroSlideInput[]) {
    await prisma.heroSlide.deleteMany({
      where: {
        OR: [{ sectionId }, { sectionId: null }],
      },
    });

    const rows = slides
      .map((slide, index) => ({
        sectionId,
        title: String(slide.title || `Slide ${index + 1}`).slice(0, 200),
        subtitle: slide.subtitle ? String(slide.subtitle).slice(0, 300) : null,
        description: slide.description ? String(slide.description).slice(0, 1000) : null,
        image: String(slide.image || '').trim(),
        buttonText: slide.buttonText ? String(slide.buttonText).slice(0, 60) : null,
        buttonUrl: slide.buttonUrl ? String(slide.buttonUrl).slice(0, 300) : null,
        active: slide.active !== false,
        sortOrder: index,
      }))
      .filter((slide) => Boolean(slide.image));

    if (rows.length === 0) return;

    await prisma.heroSlide.createMany({ data: rows });
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
