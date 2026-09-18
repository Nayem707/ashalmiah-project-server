import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/error';
import apiRoutes from './routes';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(compression());

  if (!env.isProduction) {
    app.use(morgan('dev'));
  }

  // Serve uploaded files from the physical upload root at the public URL path.
  // Disk: env.upload.dir (e.g. ./uploads or /uploads)
  // URL:  env.upload.publicPath (always /uploads)
  app.use(env.upload.publicPath, express.static(env.upload.dir));

  app.use(env.apiPrefix, apiLimiter, apiRoutes);

  app.get('/', (_req, res) => {
    res.json({ success: true, data: { name: 'Shoply API', prefix: env.apiPrefix } });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
