import { MikroORM } from '@mikro-orm/core';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';
import { databaseConfig } from './config/database.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const orm = await MikroORM.init(databaseConfig);

  // Sincroniza esquema automáticamente
  const generator = orm.getSchemaGenerator();

  await generator.updateSchema();

  // CRÍTICO: cookie-parser DEBE ir ANTES que CORS
  app.use(cookieParser());

  // Configurar archivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Configurar CORS para el frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      // Cookie y Set-Cookie NO van aquí - se manejan automáticamente
    ],
  });

  // Configurar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Servidor ejecutándose en http://localhost:${port}/api`);
}
bootstrap().catch((err) => {
  console.error('Error al iniciar la aplicación:', err);
});
