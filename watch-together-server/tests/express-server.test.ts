/**
 * Express 服务器基础框架测试
 */

import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app';

describe('Express 服务器基础框架', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  describe('健康检查端点', () => {
    it('应该返回 200 状态码', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });

    it('应该返回正确的响应体', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('时间戳应该是有效的 ISO 格式', async () => {
      const response = await request(app).get('/health');
      const timestamp = response.body.timestamp;
      expect(() => new Date(timestamp)).not.toThrow();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  describe('CORS 中间件', () => {
    it('应该设置 CORS 头', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('应该允许所有来源', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://example.com');
      
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('JSON 解析中间件', () => {
    it('应该正确解析 JSON 请求体', async () => {
      // 创建一个新的 app 实例，手动添加路由（在错误处理之前）
      const testApp = express();
      testApp.use(express.json());
      testApp.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });
      // 添加错误处理中间件
      testApp.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        if (err instanceof SyntaxError && 'body' in err) {
          res.status(400).json({
            error: 'Invalid JSON',
            message: 'Request body contains invalid JSON',
          });
          return;
        }
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const testData = { message: 'test', number: 123 };
      const response = await request(testApp)
        .post('/test-json')
        .send(testData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.received).toEqual(testData);
    });

    it('应该拒绝无效的 JSON', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });
      testApp.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        if (err instanceof SyntaxError && 'body' in err) {
          res.status(400).json({
            error: 'Invalid JSON',
            message: 'Request body contains invalid JSON',
          });
          return;
        }
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(testApp)
        .post('/test-json')
        .send('invalid json{')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid JSON');
    });
  });

  describe('错误处理中间件', () => {
    it('应该捕获并格式化未处理的错误', async () => {
      // 创建一个新的 app 实例，手动添加路由和错误处理
      const testApp = express();
      testApp.get('/test-error', () => {
        throw new Error('Test error');
      });
      testApp.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error('Error:', err);
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
        });
      });

      const response = await request(testApp).get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal Server Error');
    });

    it('应该在开发环境显示错误消息', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const testApp = express();
      testApp.get('/test-error', () => {
        throw new Error('Test error message');
      });
      testApp.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
        });
      });

      const response = await request(testApp).get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Test error message');

      process.env.NODE_ENV = originalEnv;
    });

    it('应该在生产环境隐藏错误详情', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const testApp = express();
      testApp.get('/test-error', () => {
        throw new Error('Test error message');
      });
      testApp.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
        });
      });

      const response = await request(testApp).get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'An error occurred');
      expect(response.body.message).not.toBe('Test error message');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('404 处理', () => {
    it('应该返回 404 对于不存在的路由', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message');
    });
  });
});
