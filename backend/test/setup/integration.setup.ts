import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';

let app: INestApplication;
let server: any;

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  
  // Use dynamic port to avoid conflicts
  await app.init();
  server = app.getHttpServer();
  
  return app;
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close();
  }
}

export function getTestServer(): any {
  return server;
}

export function getTestApp(): INestApplication {
  return app;
}

