import path from 'path';
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

  // Serve uploaded files statically.
  app.use(`/${env.upload.dir}`, express.static(path.resolve(process.cwd(), env.upload.dir)));

  app.use(env.apiPrefix, apiLimiter, apiRoutes);

  app.get('/', (_req, res) => {
    res.json({ success: true, data: { name: 'Shoply API', prefix: env.apiPrefix } });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
