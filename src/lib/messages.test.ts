import { describe, it, expect } from 'vitest';
import {
  generateNeoBrutalTagBlock,
  parseNeoBrutalTagBlock,
  removeNeoBrutalTagBlock,
  parseTagBlockSmart,
  removeTagBlockSmart,
  TAG_BLOCK_HEADER,
  TAG_BLOCK_FOOTER,
  msgTagSuccess,
  MSG_WELCOME,
  MSG_CONFIG_PROMPT,
} from './messages';
import { FieldConfig } from './types';

// 测试用的字段配置
const mockFields: FieldConfig[] = [
  { key: 'category', label: '分类', type: 'select', options: ['电影', '音乐', '游戏'] },
  { key: 'author', label: '作者', type: 'text' },
  { key: 'genres', label: '类型', type: 'multi_select', options: ['动作', '科幻', '喜剧'] },
  { key: 'source', label: '来源', type: 'text' },
];

describe('System Messages', () => {
  it('欢迎消息应包含 HTML 标签', () => {
    expect(MSG_WELCOME).toContain('<b>');
    expect(MSG_WELCOME).toContain('</b>');
    expect(MSG_WELCOME).toContain('<code>');
  });

  it('配置提示消息应简洁', () => {
    expect(MSG_CONFIG_PROMPT).toContain('<b>━━ CONFIG ━━</b>');
    expect(MSG_CONFIG_PROMPT.length).toBeLessThan(100);
  });

  it('成功消息函数应正确生成', () => {
    const result = msgTagSuccess('测试内容');
    expect(result).toContain('<b>━━ SUCCESS ━━</b>');
    expect(result).toContain('TAG SAVED');
    expect(result).toContain('测试内容');
  });

  it('成功消息应截断过长内容', () => {
    const longText = 'A'.repeat(100);
    const result = msgTagSuccess(longText);
    expect(result).toContain('...');
    expect(result.length).toBeLessThan(200);
  });
});

describe('Tag Block', () => {
  describe('generateNeoBrutalTagBlock', () => {
    it('应该生成正确格式的标签块', () => {
      const data = {
        category: '电影',
        author: '张三',
      };

      const result = generateNeoBrutalTagBlock(data, mockFields);

      expect(result).toContain(TAG_BLOCK_HEADER);
      expect(result).toContain(TAG_BLOCK_FOOTER);
      expect(result).toContain('▸ 分类: #电影');
      expect(result).toContain('▸ 作者: 张三');
    });

    it('应该为 select/multi_select 类型字段添加 # 前缀', () => {
      const data = {
        category: '电影',
        genres: '动作 科幻',
      };

      const result = generateNeoBrutalTagBlock(data, mockFields);

      expect(result).toContain('▸ 分类: #电影');
      expect(result).toContain('▸ 类型: #动作 #科幻');
    });

    it('text 类型不应添加 # 前缀', () => {
      const data = {
        author: '张三',
      };

      const result = generateNeoBrutalTagBlock(data, mockFields);

      expect(result).toContain('▸ 作者: 张三');
      expect(result).not.toContain('#张三');
    });

    it('应该返回空字符串当没有数据时', () => {
      const result = generateNeoBrutalTagBlock({}, mockFields);
      expect(result).toBe('');
    });
  });

  describe('parseNeoBrutalTagBlock', () => {
    it('应该解析标签块', () => {
      const text = `这是一段描述文字

┈┈┈ 🏷️ ┈┈┈
▸ 分类: #电影
▸ 作者: 张三
▸ 类型: #动作 #科幻
┈┈┈┈┈┈┈┈┈`;

      const result = parseNeoBrutalTagBlock(text, mockFields);

      expect(result).toEqual({
        category: '#电影',
        author: '张三',
        genres: '#动作 #科幻',
      });
    });

    it('应该返回空对象当没有标签块时', () => {
      const text = '这是普通文本，没有标签块';
      const result = parseNeoBrutalTagBlock(text, mockFields);
      expect(result).toEqual({});
    });
  });

  describe('removeNeoBrutalTagBlock', () => {
    it('应该移除标签块并保留原始内容', () => {
      const text = `这是原始描述

┈┈┈ 🏷️ ┈┈┈
▸ 分类: #电影
┈┈┈┈┈┈┈┈┈`;

      const result = removeNeoBrutalTagBlock(text);
      expect(result).toBe('这是原始描述');
    });
  });
});

describe('Smart Tag Block 兼容性测试', () => {
  it('parseTagBlockSmart 应该解析新格式', () => {
    const text = `描述

┈┈┈ 🏷️ ┈┈┈
▸ 分类: #电影
┈┈┈┈┈┈┈┈┈`;

    const result = parseTagBlockSmart(text, mockFields);
    expect(result).toEqual({ category: '#电影' });
  });

  it('parseTagBlockSmart 应该解析旧格式 V1', () => {
    const text = `描述

==============
🏷️ Tags

🔸 分类: #电影
==============`;

    const result = parseTagBlockSmart(text, mockFields);
    expect(result).toEqual({ category: '#电影' });
  });

  it('parseTagBlockSmart 应该解析旧格式 V2', () => {
    const text = `描述

▀▀▀ 🏷️ TAGS ▀▀▀

▸ **分类:** #电影

▀▀▀▀▀▀▀▀▀▀▀▀▀▀`;

    const result = parseTagBlockSmart(text, mockFields);
    expect(result).toEqual({ category: '#电影' });
  });

  it('removeTagBlockSmart 应该移除新格式', () => {
    const text = `原始内容

┈┈┈ 🏷️ ┈┈┈
▸ 分类: #电影
┈┈┈┈┈┈┈┈┈`;

    const result = removeTagBlockSmart(text);
    expect(result).toBe('原始内容');
  });

  it('removeTagBlockSmart 应该移除旧格式', () => {
    const text = `原始内容

==============
🏷️ Tags

🔸 分类: 电影
==============`;

    const result = removeTagBlockSmart(text);
    expect(result).toBe('原始内容');
  });
});

describe('往返测试', () => {
  it('生成后解析应该能还原数据', () => {
    const originalData = {
      category: '游戏',
      author: '李四',
      genres: '动作',
    };

    const generatedBlock = generateNeoBrutalTagBlock(originalData, mockFields);
    const parsedData = parseNeoBrutalTagBlock(generatedBlock, mockFields);

    expect(parsedData).toEqual({
      category: '#游戏',
      author: '李四',
      genres: '#动作',
    });
  });

  it('移除后重新添加应该一致', () => {
    const originalCaption = '这是视频描述';
    const tags = { category: '音乐' };

    const block = generateNeoBrutalTagBlock(tags, mockFields);
    const fullText = originalCaption + block;

    const cleaned = removeNeoBrutalTagBlock(fullText);
    expect(cleaned).toBe(originalCaption);
  });
});
