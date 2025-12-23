import { describe, it, expect } from 'vitest';
import { normalizeTagValue, parseValueSmart } from './tag-utils';

describe('normalizeTagValue', () => {
  it('应该去掉开头的 # 前缀', () => {
    expect(normalizeTagValue('#电影')).toBe('电影');
    expect(normalizeTagValue('电影')).toBe('电影');
  });

  it('应该将空格转换为下划线', () => {
    expect(normalizeTagValue('动作 片')).toBe('动作_片');
    expect(normalizeTagValue('  多个  空格  ')).toBe('多个_空格');
  });

  it('应该同时处理 # 和空格', () => {
    expect(normalizeTagValue('#动作 片')).toBe('动作_片');
  });

  it('应该 trim 空白字符', () => {
    expect(normalizeTagValue('  电影  ')).toBe('电影');
  });
});

describe('parseValueSmart', () => {
  it('不包含 # 时返回字符串', () => {
    expect(parseValueSmart('张三')).toBe('张三');
    expect(parseValueSmart('  李四  ')).toBe('李四');
  });

  it('包含 # 时解析为数组', () => {
    expect(parseValueSmart('#电影')).toEqual(['电影']);
    expect(parseValueSmart('#动作 #科幻')).toEqual(['动作', '科幻']);
    expect(parseValueSmart('#动作 #科幻 #喜剧')).toEqual(['动作', '科幻', '喜剧']);
  });

  it('应该正确去掉每个标签的 # 前缀', () => {
    expect(parseValueSmart('#tag1 #tag2')).toEqual(['tag1', 'tag2']);
  });

  it('应该过滤空值', () => {
    expect(parseValueSmart('#tag1  #tag2')).toEqual(['tag1', 'tag2']);
  });
});
