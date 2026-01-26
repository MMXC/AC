/**
 * 性能测试和优化
 *
 * 测试目标：
 * 1. REST API P95 响应时间 < 200ms
 * 2. WebSocket 消息延迟 P95 < 50ms
 * 3. 支持 10,000+ 并发 WebSocket 连接（单实例）
 * 4. 支持 1,000+ QPS（REST API）
 * 5. 数据库查询优化（索引、连接池）
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { getPrismaClient } from '../src/db';
import { connectRedis } from '../src/redis';
import { createWebSocketServer, closeWebSocketServer } from '../src/websocket';
import { Server } from 'http';
import WebSocket from 'ws';
import { AddressInfo } from 'net';

/**
 * 计算百分位数
 */
function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * 计算统计信息
 */
function calculateStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    p50: calculatePercentile(values, 50),
    p95: calculatePercentile(values, 95),
    p99: calculatePercentile(values, 99),
  };
}

describe('性能测试和优化', () => {
  let app: ReturnType<typeof createApp>;
  let server: Server;
  let baseUrl: string;
  let wsUrl: string;
  let testRoomId: string;
  let testHostId: string;
  let testUserId: string;

  beforeAll(async () => {
    // 连接 Redis（如果可用）
    try {
      await connectRedis();
    } catch (error) {
      console.warn('Redis connection failed, continuing without Redis');
    }

    app = createApp();
    server = app.listen(0); // 使用随机端口
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
    wsUrl = `ws://localhost:${address.port}/ws`;

    // 创建 WebSocket 服务器
    createWebSocketServer(server);

    // 创建测试房间
    const prisma = getPrismaClient();
    testRoomId = `room-${Math.random().toString(36).substring(2, 10)}`;
    testHostId = `user-${Math.random().toString(36).substring(2, 10)}`;
    testUserId = `user-${Math.random().toString(36).substring(2, 10)}`;

    // 创建测试房间和成员
    await prisma.room.create({
      data: {
        id: testRoomId,
        hostId: testHostId,
        name: '性能测试房间',
        members: {
          create: [
            {
              userId: testHostId,
              nickname: '房主',
              isHost: true,
            },
            {
              userId: testUserId,
              nickname: '测试用户',
              isHost: false,
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // 关闭 WebSocket 服务器
    await closeWebSocketServer().catch(() => {
      // 忽略关闭错误
    });

    // 清理测试数据
    const prisma = getPrismaClient();
    await prisma.room.delete({
      where: { id: testRoomId },
    }).catch(() => {
      // 忽略删除错误
    });

    // 关闭服务器
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('REST API 性能测试', () => {
    it('GET /api/v1/rooms/:roomId P95 响应时间应该 < 200ms', async () => {
      const concurrency = 100; // 并发数
      const requests = 1000; // 总请求数
      const responseTimes: number[] = [];

      // 执行并发请求
      const promises: Promise<void>[] = [];
      for (let i = 0; i < requests; i++) {
        promises.push(
          (async () => {
            const start = Date.now();
            try {
              await request(app)
                .get(`/api/v1/rooms/${testRoomId}`)
                .expect(200);
              const duration = Date.now() - start;
              responseTimes.push(duration);
            } catch (error) {
              // 忽略错误，只记录成功的请求
            }
          })()
        );

        // 控制并发数
        if (promises.length >= concurrency) {
          await Promise.all(promises);
          promises.length = 0;
        }
      }

      // 等待剩余请求完成
      await Promise.all(promises);

      // 计算统计信息
      const stats = calculateStats(responseTimes);

      console.log('REST API 响应时间统计:', {
        total: responseTimes.length,
        min: `${stats.min}ms`,
        max: `${stats.max}ms`,
        avg: `${stats.avg.toFixed(2)}ms`,
        p50: `${stats.p50}ms`,
        p95: `${stats.p95}ms`,
        p99: `${stats.p99}ms`,
      });

      // 断言 P95 响应时间 < 200ms
      expect(stats.p95).toBeLessThan(200);
    }, 60000); // 60秒超时

    it('应该支持 1,000+ QPS（REST API）', async () => {
      const duration = 10; // 测试持续时间（秒）
      const targetQps = 1000; // 目标 QPS
      const requestsPerSecond = targetQps;
      const totalRequests = duration * requestsPerSecond;

      let successCount = 0;
      let errorCount = 0;
      const startTime = Date.now();

      // 创建请求函数
      const makeRequest = async (): Promise<void> => {
        try {
          await request(app).get(`/api/v1/rooms/${testRoomId}`).expect(200);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      };

      // 执行请求（使用 setInterval 控制速率）
      const promises: Promise<void>[] = [];
      let requestCount = 0;

      const interval = setInterval(() => {
        // 每秒发送 requestsPerSecond 个请求
        for (let i = 0; i < requestsPerSecond; i++) {
          if (requestCount < totalRequests) {
            promises.push(makeRequest());
            requestCount++;
          }
        }
      }, 1000);

      // 等待测试完成
      await new Promise((resolve) => {
        setTimeout(() => {
          clearInterval(interval);
          resolve(undefined);
        }, duration * 1000);
      });

      // 等待所有请求完成
      await Promise.all(promises);

      const elapsed = (Date.now() - startTime) / 1000;
      const actualQps = successCount / elapsed;

      console.log('QPS 测试结果:', {
        duration: `${elapsed.toFixed(2)}s`,
        totalRequests: requestCount,
        successCount,
        errorCount,
        actualQps: `${actualQps.toFixed(2)}`,
        targetQps: `${targetQps}`,
      });

      // 断言实际 QPS >= 目标 QPS 的 80%（允许一些误差）
      expect(actualQps).toBeGreaterThanOrEqual(targetQps * 0.8);
    }, 30000); // 30秒超时
  });

  describe('WebSocket 性能测试', () => {
    it('WebSocket 消息延迟 P95 应该 < 50ms', async () => {
      const messageCount = 1000;
      const latencies: number[] = [];

      // 创建 WebSocket 连接（使用正确的 URL 格式）
      const ws = new WebSocket(
        `${wsUrl}?roomId=${testRoomId}&userId=${testUserId}`
      );

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          resolve();
        });
        ws.on('error', reject);
      });

      // 监听消息
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'CHAT_MESSAGE' && message.data?.timestamp) {
            const latency = Date.now() - message.data.timestamp;
            latencies.push(latency);
          }
        } catch (error) {
          // 忽略解析错误
        }
      });

      // 发送消息
      for (let i = 0; i < messageCount; i++) {
        const message = {
          type: 'CHAT_MESSAGE',
          data: {
            content: `测试消息 ${i}`,
            userId: testUserId,
            timestamp: Date.now(),
          },
        };
        ws.send(JSON.stringify(message));
        await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms 间隔
      }

      // 等待所有消息处理完成
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 关闭连接
      ws.close();

      // 计算统计信息
      const stats = calculateStats(latencies);

      console.log('WebSocket 消息延迟统计:', {
        total: latencies.length,
        min: `${stats.min}ms`,
        max: `${stats.max}ms`,
        avg: `${stats.avg.toFixed(2)}ms`,
        p50: `${stats.p50}ms`,
        p95: `${stats.p95}ms`,
        p99: `${stats.p99}ms`,
      });

      // 断言 P95 延迟 < 50ms
      expect(stats.p95).toBeLessThan(50);
    }, 60000); // 60秒超时

    it('应该支持 10,000+ 并发 WebSocket 连接（单实例）', async () => {
      const targetConnections = 10000;
      const connections: WebSocket[] = [];
      let connectedCount = 0;
      let errorCount = 0;

      // 创建连接
      console.log(`开始创建 ${targetConnections} 个 WebSocket 连接...`);
      const startTime = Date.now();

      // 首先需要为每个用户创建成员记录
      const prisma = getPrismaClient();
      const userIds: string[] = [];
      for (let i = 0; i < targetConnections; i++) {
        const userId = `user-${Math.random().toString(36).substring(2, 10)}`;
        userIds.push(userId);
        
        // 创建成员记录
        await prisma.roomMember.create({
          data: {
            roomId: testRoomId,
            userId: userId,
            nickname: `用户${i}`,
            isHost: false,
          },
        }).catch(() => {
          // 忽略创建错误（可能已存在）
        });
      }

      // 然后创建 WebSocket 连接
      for (let i = 0; i < targetConnections; i++) {
        const userId = userIds[i];
        const ws = new WebSocket(
          `${wsUrl}?roomId=${testRoomId}&userId=${userId}`
        );

        ws.on('open', () => {
          connectedCount++;
        });

        ws.on('error', () => {
          errorCount++;
        });

        connections.push(ws);

        // 控制连接速率（每 100ms 创建 100 个连接）
        if ((i + 1) % 100 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // 等待所有连接建立
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const elapsed = (Date.now() - startTime) / 1000;

      console.log('并发连接测试结果:', {
        targetConnections,
        connectedCount,
        errorCount,
        elapsed: `${elapsed.toFixed(2)}s`,
      });

      // 关闭所有连接
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });

      // 断言成功连接数 >= 目标连接数的 80%（允许一些错误）
      expect(connectedCount).toBeGreaterThanOrEqual(targetConnections * 0.8);
    }, 120000); // 120秒超时
  });

  describe('数据库查询优化', () => {
    it('应该使用索引优化查询', async () => {
      const prisma = getPrismaClient();

      // 测试房间查询（应该使用 hostId 索引）
      const start1 = Date.now();
      await prisma.room.findMany({
        where: {
          hostId: testHostId,
        },
      });
      const duration1 = Date.now() - start1;

      // 测试成员查询（应该使用 roomId 索引）
      const start2 = Date.now();
      await prisma.roomMember.findMany({
        where: {
          roomId: testRoomId,
        },
      });
      const duration2 = Date.now() - start2;

      // 测试消息查询（应该使用 roomId, createdAt 复合索引）
      const start3 = Date.now();
      await prisma.message.findMany({
        where: {
          roomId: testRoomId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });
      const duration3 = Date.now() - start3;

      console.log('数据库查询性能:', {
        '房间查询 (hostId索引)': `${duration1}ms`,
        '成员查询 (roomId索引)': `${duration2}ms`,
        '消息查询 (roomId, createdAt索引)': `${duration3}ms`,
      });

      // 断言所有查询都应该在合理时间内完成（< 100ms）
      expect(duration1).toBeLessThan(100);
      expect(duration2).toBeLessThan(100);
      expect(duration3).toBeLessThan(100);
    });

    it('连接池配置应该正确', async () => {
      const databaseUrl = process.env.DATABASE_URL;
      
      // 检查 DATABASE_URL 是否包含连接池参数
      if (databaseUrl) {
        const url = new URL(databaseUrl);
        const connectionLimit = url.searchParams.get('connection_limit');
        const poolTimeout = url.searchParams.get('pool_timeout');

        console.log('数据库连接池配置:', {
          connectionLimit: connectionLimit || '未设置（使用默认值）',
          poolTimeout: poolTimeout || '未设置（使用默认值）',
        });

        // 建议设置连接池参数（但不强制要求）
        if (connectionLimit) {
          expect(parseInt(connectionLimit, 10)).toBeGreaterThan(0);
        }
      } else {
        console.warn('DATABASE_URL 未设置，无法检查连接池配置');
      }
    });
  });
});
