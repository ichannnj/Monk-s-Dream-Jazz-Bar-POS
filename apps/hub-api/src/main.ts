import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { PORT } from './common/constants.js';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter
  );

  // Enable CORS for LAN tablets and admin frontend
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  await app.listen(PORT, '0.0.0.0');
  console.log(`[Hub API] NestJS (Fastify) Server running on http://0.0.0.0:${PORT}`);
}

bootstrap().catch((err) => {
  console.error('[Hub API] Fatal error starting server:', err);
  process.exit(1);
});
