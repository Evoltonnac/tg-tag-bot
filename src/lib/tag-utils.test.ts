import { describe, it, expect } from 'vitest';
import { parseTagBlock, removeTagBlock, generateTagBlock, TAG_BLOCK_START, TAG_BLOCK_END } from './tag-utils';
import { FieldConfig } from './types';

// 测试用的字段配置
const mockFields: FieldConfig[] = [
  { key: 'category', label: '分类', type: 'select', options: ['电影', '音乐', '游戏'] },
  { key: 'author', label: '作者', type: 'text' },
  { key: 'genres', label: '类型', type: 'multi_select', options: ['动作', '科幻', '喜剧'] },
  { key: 'source', label: '来源', type: 'text' },
];

describe('parseTagBlock', () => {
  it('应该解析完整的标签块', () => {
    const text = `这是一段描述文字

==============
🏷️ Tags

🔸 分类: #电影
🔸 作者: 张三
🔸 类型: #动作 #科幻
==============`;

    const result = parseTagBlock(text, mockFields);

    expect(result).toEqual({
      category: '#电影',
      author: '张三',
      genres: '#动作 #科幻',
    });
  });

  it('应该返回空对象当没有标签块时', () => {
    const text = '这是普通文本，没有标签块';
    const result = parseTagBlock(text, mockFields);
    expect(result).toEqual({});
  });

  it('应该忽略不在配置中的标签', () => {
    const text = `==============
🏷️ Tags

🔸 分类: 电影
🔸 未知字段: 某个值
==============`;

    const result = parseTagBlock(text, mockFields);
    expect(result).toEqual({ category: '电影' });
    expect(result).not.toHaveProperty('未知字段');
  });

  it('应该正确处理空标签块', () => {
    const text = `==============
🏷️ Tags

==============`;

    const result = parseTagBlock(text, mockFields);
    expect(result).toEqual({});
  });

  it('应该处理标签块后有其他内容的情况', () => {
    const text = `描述文字

==============
🏷️ Tags

🔸 分类: 音乐
==============
其他内容`;

    const result = parseTagBlock(text, mockFields);
    expect(result).toEqual({ category: '音乐' });
  });
});

describe('removeTagBlock', () => {
  it('应该移除标签块并保留原始内容', () => {
    const text = `这是原始描述

==============
🏷️ Tags

🔸 分类: 电影
==============`;

    const result = removeTagBlock(text);
    expect(result).toBe('这是原始描述');
  });

  it('应该返回原文当没有标签块时', () => {
    const text = '这是普通文本';
    const result = removeTagBlock(text);
    expect(result).toBe('这是普通文本');
  });

  it('应该正确处理标签块在中间的情况', () => {
    const text = `开头内容

==============
🏷️ Tags

🔸 分类: 电影
==============
结尾内容`;

    const result = removeTagBlock(text);
    expect(result).toBe('开头内容\n结尾内容');
  });
});

describe('generateTagBlock', () => {
  it('应该生成正确格式的标签块', () => {
    const data = {
      category: '电影',
      author: '张三',
    };

    const result = generateTagBlock(data, mockFields);

    expect(result).toContain(TAG_BLOCK_START);
    expect(result).toContain(TAG_BLOCK_END);
    expect(result).toContain('🔸 分类: #电影');
    expect(result).toContain('🔸 作者: 张三');
  });

  it('应该为 select/multi_select 类型字段添加 # 前缀', () => {
    const data = {
      category: '电影',
      genres: '动作 科幻',
    };

    const result = generateTagBlock(data, mockFields);

    expect(result).toContain('🔸 分类: #电影');
    expect(result).toContain('🔸 类型: #动作 #科幻');
  });

  it('应该保留已有的 # 前缀', () => {
    const data = {
      genres: '#动作 科幻 #喜剧',
    };

    const result = generateTagBlock(data, mockFields);

    expect(result).toContain('🔸 类型: #动作 #科幻 #喜剧');
  });

  it('text 类型不应添加 # 前缀', () => {
    const data = {
      author: '张三',
    };

    const result = generateTagBlock(data, mockFields);

    expect(result).toContain('🔸 作者: 张三');
    expect(result).not.toContain('#张三');
  });

  it('text 类型应该直接输出原始值', () => {
    const data = {
      source: '@someone',
    };

    const result = generateTagBlock(data, mockFields);

    expect(result).toContain('🔸 来源: @someone');
  });

  it('应该返回空字符串当没有数据时', () => {
    const result = generateTagBlock({}, mockFields);
    expect(result).toBe('');
  });

  it('应该忽略空值', () => {
    const data = {
      category: '电影',
      author: '',
    };

    const result = generateTagBlock(data, mockFields);

    expect(result).toContain('🔸 分类: #电影');
    expect(result).not.toContain('作者');
  });
});

describe('parseTagBlock + generateTagBlock 往返测试', () => {
  it('生成后解析应该能还原数据（select/multi_select 会带 # 前缀）', () => {
    const originalData = {
      category: '游戏',
      author: '李四',
      genres: '动作',
    };

    const generatedBlock = generateTagBlock(originalData, mockFields);
    const parsedData = parseTagBlock(generatedBlock, mockFields);

    // select/multi_select 类型会被格式化成 #tag 格式
    expect(parsedData).toEqual({
      category: '#游戏',
      author: '李四',
      genres: '#动作',
    });
  });

  it('移除后重新添加应该一致', () => {
    const originalCaption = '这是视频描述';
    const tags = { category: '音乐' };

    const block = generateTagBlock(tags, mockFields);
    const fullText = originalCaption + block;

    const cleaned = removeTagBlock(fullText);
    expect(cleaned).toBe(originalCaption);
  });
});

