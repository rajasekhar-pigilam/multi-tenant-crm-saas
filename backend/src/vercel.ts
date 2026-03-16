import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';

type ExpressApp = ReturnType<typeof express>;

let cachedServer: ExpressApp | null = null;

async function createServer(): Promise<ExpressApp> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn']
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Multi-Tenant CRM SaaS API')
    .setDescription('Database-per-tenant CRM proof of concept')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'Bearer'
    )
    .addSecurityRequirements('Bearer')
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.init();
  return expressApp;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
module.exports = async (req: Request, res: Response): Promise<void> => {
  if (!cachedServer) {
    cachedServer = await createServer();
  }
  cachedServer(req, res);
};
