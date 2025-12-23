import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for frontend
  // In Docker/production, frontend is served from the same origin, so allow all origins
  // In development, use the configured FRONTEND_URL
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL || (isProduction ? '*' : 'http://localhost:3000');
  
  app.enableCors({
    origin: isProduction && !process.env.FRONTEND_URL ? true : frontendUrl,
    credentials: true,
  });

  // Serve static files from frontend build (if in production)
  const publicPath = join(__dirname, '..', 'public');
  if (existsSync(publicPath)) {
    app.useStaticAssets(publicPath, {
      index: false,
      prefix: '/',
    });
    
    // Serve index.html for all non-API routes (SPA routing)
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
        res.sendFile(join(publicPath, 'index.html'));
      } else {
        next();
      }
    });
    console.log(`Serving frontend from: ${publicPath}`);
  } else {
    // Static files not available, skip (development mode)
    console.log('Static files not found, running in API-only mode');
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();

