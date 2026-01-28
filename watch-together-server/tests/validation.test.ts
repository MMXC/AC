/**
 * 输入验证 Schema 测试
 * 测试所有 API 端点的输入验证规则
 */

import { joinRoomSchema } from '../src/validation/schemas';

describe('输入验证 Schema', () => {
  describe('joinRoomSchema', () => {
    it('有效的 userId 格式应通过验证', () => {
      const validData = {
        nickname: 'test',
        userId: 'user-abc12345', // 有效格式：user-{8位字符}
      };

      expect(() => joinRoomSchema.parse(validData)).not.toThrow();
      const result = joinRoomSchema.parse(validData);
      expect(result.userId).toBe('user-abc12345');
      expect(result.nickname).toBe('test');
    });

    it('无效的 userId 格式应抛出错误', () => {
      const invalidData = {
        nickname: 'test',
        userId: 'invalid', // 无效格式：不符合 user-{8位字符} 格式
      };

      expect(() => joinRoomSchema.parse(invalidData)).toThrow();
    });

    it('不传 userId 应通过验证（向后兼容）', () => {
      const dataWithoutUserId = {
        nickname: 'test',
        // 不传 userId
      };

      expect(() => joinRoomSchema.parse(dataWithoutUserId)).not.toThrow();
      const result = joinRoomSchema.parse(dataWithoutUserId);
      expect(result.nickname).toBe('test');
      expect(result.userId).toBeUndefined();
    });

    it('userId 格式正确但长度不足应抛出错误', () => {
      const invalidData = {
        nickname: 'test',
        userId: 'user-abc', // 长度不足：只有3位字符，需要8位
      };

      expect(() => joinRoomSchema.parse(invalidData)).toThrow();
    });

    it('userId 格式正确但包含无效字符应抛出错误', () => {
      const invalidData = {
        nickname: 'test',
        userId: 'user-abc123!', // 包含无效字符：! 不在 a-z0-9 范围内
      };

      expect(() => joinRoomSchema.parse(invalidData)).toThrow();
    });

    it('userId 格式正确但前缀错误应抛出错误', () => {
      const invalidData = {
        nickname: 'test',
        userId: 'usr-abc12345', // 前缀错误：应该是 user- 而不是 usr-
      };

      expect(() => joinRoomSchema.parse(invalidData)).toThrow();
    });

    it('userId 为空字符串应抛出错误', () => {
      const invalidData = {
        nickname: 'test',
        userId: '', // 空字符串
      };

      expect(() => joinRoomSchema.parse(invalidData)).toThrow();
    });

    it('userId 为 null 应抛出错误', () => {
      const invalidData = {
        nickname: 'test',
        userId: null as any, // null 值
      };

      expect(() => joinRoomSchema.parse(invalidData)).toThrow();
    });

    it('userId 为数字应抛出错误', () => {
      const invalidData = {
        nickname: 'test',
        userId: 12345 as any, // 数字类型
      };

      expect(() => joinRoomSchema.parse(invalidData)).toThrow();
    });

    it('有效的 userId 格式（8位小写字母）应通过验证', () => {
      const validData = {
        nickname: 'test',
        userId: 'user-abcdefgh', // 8位小写字母
      };

      expect(() => joinRoomSchema.parse(validData)).not.toThrow();
      const result = joinRoomSchema.parse(validData);
      expect(result.userId).toBe('user-abcdefgh');
    });

    it('有效的 userId 格式（8位数字）应通过验证', () => {
      const validData = {
        nickname: 'test',
        userId: 'user-12345678', // 8位数字
      };

      expect(() => joinRoomSchema.parse(validData)).not.toThrow();
      const result = joinRoomSchema.parse(validData);
      expect(result.userId).toBe('user-12345678');
    });

    it('有效的 userId 格式（8位字母数字混合）应通过验证', () => {
      const validData = {
        nickname: 'test',
        userId: 'user-abc12345', // 8位字母数字混合
      };

      expect(() => joinRoomSchema.parse(validData)).not.toThrow();
      const result = joinRoomSchema.parse(validData);
      expect(result.userId).toBe('user-abc12345');
    });

    it('nickname 必填，缺少 nickname 应抛出错误', () => {
      const invalidData = {
        userId: 'user-abc12345',
        // 缺少 nickname
      };

      expect(() => joinRoomSchema.parse(invalidData)).toThrow();
    });

    it('nickname 为空字符串应抛出错误', () => {
      const invalidData = {
        nickname: '',
        userId: 'user-abc12345',
      };

      expect(() => joinRoomSchema.parse(invalidData)).toThrow();
    });
  });
});
