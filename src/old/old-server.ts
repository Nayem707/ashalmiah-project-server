import { createApp } from '../app';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import 'dotenv/config';

async function bootstrap() {
  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`Shoply API running at http://localhost:${env.port}${env.apiPrefix}`);
    console.log(`Environment: ${env.nodeEnv}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
