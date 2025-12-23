/**
 * 规范化标签值：去掉开头的#，将空格转换为下划线，确保 hashtag 不会断开
 */
export function normalizeTagValue(value: string): string {
  return value.trim().replace(/^#/, '').replace(/\s+/g, '_');
}

/**
 * 智能解析 value：
 * - 如果 value 包含 #，则解析为 string[]（去掉每个标签的 # 前缀）
 * - 否则返回原始 string
 */
export function parseValueSmart(value: string): string | string[] {
  const trimmed = value.trim();
  if (trimmed.includes('#')) {
    // 按空格分割，去掉每个标签开头的 #
    return trimmed.split(/\s+/).map(v => v.replace(/^#/, '')).filter(Boolean);
  }
  return trimmed;
}

