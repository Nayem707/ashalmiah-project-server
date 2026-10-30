import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import categoriesRoutes from '../modules/categories/categories.routes';
import productsRoutes from '../modules/products/products.routes';
import attributesRoutes from '../modules/attributes/attributes.routes';
import packagesRoutes from '../modules/packages/packages.routes';
import cartRoutes from '../modules/cart/cart.routes';
import wishlistRoutes from '../modules/wishlist/wishlist.routes';
import ordersRoutes from '../modules/orders/orders.routes';
import reviewsRoutes from '../modules/reviews/reviews.routes';
import homepageRoutes from '../modules/homepage/homepage.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import uploadsRoutes from '../modules/uploads/uploads.routes';
import settingsRoutes from '../modules/settings/settings.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/attributes', attributesRoutes);
router.use('/packages', packagesRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', ordersRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/homepage', homepageRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/uploads', uploadsRoutes);
router.use('/settings', settingsRoutes);

export default router;
