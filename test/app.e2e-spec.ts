import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

describe('FlashReserve API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.init();
    await (app as NestFastifyApplication).getHttpAdapter().getInstance().ready();
  });

  it('/health/live (GET) returns 200 OK', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  it('/metrics (GET) returns Prometheus metrics text', () => {
    return request(app.getHttpServer())
      .get('/metrics')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect((res) => {
        expect(res.text).toContain('flash_http_requests_total');
      });
  });

  it('/api/v1/auth/token (POST) generates valid Bearer token', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/token')
      .send({ userId: 'user_1001', role: 'user' })
      .expect(200)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.tokenType).toBe('Bearer');
        expect(res.body.userId).toBe('user_1001');
      });
  });

  it('/api/v1/sales/camp_1/reserve (POST) rejects unauthenticated requests with 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/sales/camp_1/reserve')
      .send({ quantity: 1 })
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
