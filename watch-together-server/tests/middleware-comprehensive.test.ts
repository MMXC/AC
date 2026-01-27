/**
 * 中间件综合测试
 * 测试所有中间件功能，包括错误处理、验证、限流等
 */

import request from 'supertest';
import express, { Express } from 'express';
import { createApp } from '../src/app';
import { errorHandler } from '../src/middleware/errorHandler';
import { validateBody, validateParams, validateQuery } from '../src/middleware/validate';
import { rateLimit } from '../src/middleware/rateLimit';
import { getCacheService } from '../src/redis';

// Mock Redis
jest.mock('../src/redis');

describe('中间件综合测试', () => {
  let mockCache: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Cache Service
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
    };
    (getCacheService as jest.Mock).mockReturnValue(mockCache);
  });

  describe('错误处理中间件', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(errorHandler);
    });

    it('应该处理同步错误', async () => {
      app.get('/test-error', () => {
        throw new Error('Test error');
      });

      const response = await request(app).get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('应该处理异步错误', async () => {
      app.get('/test-async-error', async () => {
        throw new Error('Async test error');
      });

      const response = await request(app).get('/test-async-error');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('应该处理 HTTP 错误', async () => {
      const { createHttpError, ErrorCode } = require('../src/middleware/errorHandler');
      
      app.get('/test-http-error', () => {
        throw createHttpError(404, ErrorCode.NOT_FOUND, 'Resource not found');
      });

      const response = await request(app).get('/test-http-error');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message', 'Resource not found');
    });
  });

  describe('验证中间件', () => {
    let app: Express;
    const testSchema = require('zod').z.object({
      name: require('zod').z.string().min(1),
      age: require('zod').z.number().int().positive(),
    });

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(errorHandler);
    });

    it('应该验证请求体', async () => {
      app.post('/test-validate-body', validateBody(testSchema), (req, res) => {
        res.json({ success: true });
      });

      // 有效请求
      const validResponse = await request(app)
        .post('/test-validate-body')
        .send({ name: 'Test', age: 25 });

      expect(validResponse.status).toBe(200);

      // 无效请求
      const invalidResponse = await request(app)
        .post('/test-validate-body')
        .send({ name: '', age: -1 });

      expect(invalidResponse.status).toBe(400);
    });

    it('应该验证路径参数', async () => {
      const paramSchema = require('zod').z.object({
        id: require('zod').z.string().regex(/^[a-z0-9-]+$/),
      });

      app.get('/test-validate-params/:id', validateParams(paramSchema), (req, res) => {
        res.json({ success: true });
      });

      // 有效请求
      const validResponse = await request(app).get('/test-validate-params/abc123');

      expect(validResponse.status).toBe(200);

      // 无效请求
      const invalidResponse = await request(app).get('/test-validate-params/invalid@id');

      expect(invalidResponse.status).toBe(400);
    });

    it('应该验证查询参数', async () => {
      const querySchema = require('zod').z.object({
        page: require('zod').z.string().regex(/^\d+$/).transform(Number),
        limit: require('zod').z.string().regex(/^\d+$/).transform(Number),
      });

      app.get('/test-validate-query', validateQuery(querySchema), (req, res) => {
        res.json({ success: true });
      });

      // 有效请求
      const validResponse = await request(app)
        .get('/test-validate-query')
        .query({ page: '1', limit: '10' });

      expect(validResponse.status).toBe(200);

      // 无效请求
      const invalidResponse = await request(app)
        .get('/test-validate-query')
        .query({ page: 'abc', limit: '10' });

      expect(invalidResponse.status).toBe(400);
    });
  });

  describe('限流中间件', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api', rateLimit);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandler);
    });

    it('应该允许正常请求', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);
      mockCache.incr.mockResolvedValue(1);
      mockCache.expire.mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/test')
        .set('x-forwarded-for', '192.168.1.1');

      expect(response.status).toBe(200);
    });

    it('应该限制超过阈值的请求', async () => {
      // Mock 超过限制
      mockCache.get.mockResolvedValue('100'); // 当前计数
      mockCache.incr.mockResolvedValue(101); // 超过限制

      const response = await request(app)
        .get('/api/test')
        .set('x-forwarded-for', '192.168.1.1');

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error');
      expect(response.headers['retry-after']).toBeDefined();
    });

    it('应该使用 IP 地址进行限流', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.incr.mockResolvedValue(1);

      await request(app)
        .get('/api/test')
        .set('x-forwarded-for', '192.168.1.1');

      expect(mockCache.incr).toHaveBeenCalled();
    });

    it('应该使用用户 ID 进行限流（如果提供）', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.incr.mockResolvedValue(1);

      await request(app)
        .get('/api/test')
        .set('x-user-id', 'user-123')
        .set('x-forwarded-for', '192.168.1.1');

      expect(mockCache.incr).toHaveBeenCalled();
    });
  });

  describe('CORS 中间件', () => {
    it('应该设置 CORS 头', async () => {
      const app = createApp();

      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('应该允许所有来源', async () => {
      const app = createApp();

      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://example.com');

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('JSON 解析中间件', () => {
    it('应该正确解析 JSON 请求体', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });
      app.use(errorHandler);

      const testData = { message: 'test', number: 123 };
      const response = await request(app)
        .post('/test-json')
        .send(testData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.received).toEqual(testData);
    });

    it('应该处理无效的 JSON', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });
      app.use(errorHandler);

      const response = await request(app)
        .post('/test-json')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('404 处理', () => {
    it('应该返回 404 对于不存在的路由', async () => {
      const app = createApp();

      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });
});
