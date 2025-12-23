/**
 * Neo-brutalism 风格 Telegram 消息模板
 * 
 * 使用 HTML 格式以确保正确渲染（参考 https://core.telegram.org/api/entities）
 * 支持: <b>, <i>, <code>, <u>, <s>, <pre>
 */

// ═══════════════════════════════════════════════════════
// 🤖 BOT SYSTEM MESSAGES (HTML format)
// ═══════════════════════════════════════════════════════

/**
 * 欢迎消息 - 用户首次 /start 无参数
 */
export const MSG_WELCOME = `<b>━━ TAG BOT ━━</b>

🟨 <b>SYSTEM ONLINE</b>

<code>1</code> 将 Bot 加入频道设为管理员
<code>2</code> 频道内发送 /config
<code>3</code> 发布内容开始打标

<i>❯❯❯ Ready</i>`;

/**
 * 配置提示 - 在频道/群组中使用 /config
 */
export const MSG_CONFIG_PROMPT = `<b>━━ CONFIG ━━</b>

🟨 点击按钮前往私聊配置`;

/**
 * 配置入口 - 私聊中显示配置按钮
 */
export function msgConfigEntry(channelId: string): string {
  return `<b>━━ CONFIG ━━</b>

🟦 <code>${channelId}</code>

点击按钮打开配置面板`;
}

/**
 * 打标准备消息 - 通过 deep link 进入
 */
export const MSG_TAG_PREPARING = `<b>━━ LOADING ━━</b>

🟨 正在准备...`;

/**
 * 打标就绪消息 - 显示打标按钮
 */
export const MSG_TAG_READY = `<b>━━ TAG ━━</b>

🟨 点击按钮开始打标`;

/**
 * 转发消息检测 - 检测到已配置频道的消息
 */
export const MSG_FORWARD_DETECTED = `<b>━━ DETECTED ━━</b>

🟩 已识别频道消息，点击打标`;

// ═══════════════════════════════════════════════════════
// 🚫 ERROR MESSAGES
// ═══════════════════════════════════════════════════════

/**
 * 权限错误 - 非管理员
 */
export const MSG_ERR_NOT_ADMIN = `<b>━━ ERROR ━━</b>

🟥 <b>ACCESS DENIED</b>
您不是该频道的管理员`;

/**
 * 权限验证失败
 */
export const MSG_ERR_VERIFY_FAILED = `<b>━━ ERROR ━━</b>

🟥 <b>VERIFY FAILED</b>
无法验证身份，请确保 Bot 是频道管理员`;

/**
 * 消息获取失败
 */
export const MSG_ERR_MESSAGE_NOT_FOUND = `<b>━━ ERROR ━━</b>

🟥 <b>NOT FOUND</b>
消息可能已删除或 Bot 不是管理员`;

/**
 * 无效参数
 */
export const MSG_ERR_INVALID_PARAM = `<b>━━ ERROR ━━</b>

🟥 <b>INVALID</b>
无效的参数`;

/**
 * 错误的使用位置
 */
export const MSG_ERR_WRONG_CHAT = `<b>━━ ERROR ━━</b>

🟥 <b>WRONG CHAT</b>
请在频道或群组中使用此命令`;

// ═══════════════════════════════════════════════════════
// 📤 SEAMLESS FORWARD MESSAGES
// ═══════════════════════════════════════════════════════

/**
 * 无痕转发 - 检测到消息，提示选择频道
 */
export const MSG_SEAMLESS_FORWARD_PROMPT = `<b>━━ SEAMLESS FORWARD ━━</b>

🟨 <b>检测到消息</b>
点击下方按钮选择要转发到的频道

<i>Bot 会去除转发来源，无痕发布</i>`;

/**
 * 无痕转发 - 选择频道按钮文字
 */
export const MSG_SEAMLESS_SELECT_CHANNEL = '📢 选择目标频道';

/**
 * 无痕转发 - 正在转发
 */
export const MSG_SEAMLESS_FORWARDING = `<b>━━ FORWARDING ━━</b>

🟨 正在转发到频道...`;

/**
 * 无痕转发 - 成功
 */
export function msgSeamlessForwardSuccess(channelTitle: string): string {
  return `<b>━━ SUCCESS ━━</b>

🟩 <b>FORWARDED</b>
已无痕转发至 <b>${channelTitle}</b>`;
}

/**
 * 无痕转发 - 失败
 */
export const MSG_ERR_FORWARD_FAILED = `<b>━━ ERROR ━━</b>

🟥 <b>FORWARD FAILED</b>
无法转发消息，请确保 Bot 是目标频道的管理员`;

/**
 * 无痕转发 - 不支持的消息类型
 */
export const MSG_ERR_UNSUPPORTED_MESSAGE = `<b>━━ ERROR ━━</b>

🟥 <b>UNSUPPORTED</b>
不支持的消息类型`;

/**
 * 成功通知消息
 */
export function msgTagSuccess(summaryText: string): string {
  const displayText = summaryText.length > 40 
    ? summaryText.substring(0, 40) + '...' 
    : summaryText;
  return `<b>━━ SUCCESS ━━</b>

🟩 <b>TAG SAVED</b>
${displayText ? `<i>${displayText}</i>` : ''}`;
}

// ═══════════════════════════════════════════════════════
// 🏷️ TAG BLOCK FORMAT
// ═══════════════════════════════════════════════════════

export const TAG_BLOCK_HEADER = '┈┈┈ 🏷️ ┈┈┈';
export const TAG_BLOCK_FOOTER = '┈┈┈┈┈┈┈┈┈';

/**
 * 生成简洁的 Tag Block（纯文本，不含 HTML/Markdown）
 * 因为 caption 编辑不支持 parse_mode
 */
export function generateNeoBrutalTagBlock(
  data: Record<string, string>,
  fields: { key: string; label: string; type: string }[]
): string {
  const tagLines: string[] = [];

  for (const field of fields) {
    const value = data[field.key];
    if (value) {
      let displayValue = value.trim();

      if (field.type === 'select' || field.type === 'multi_select') {
        const parts = displayValue.split(/[\s,]+/).filter(Boolean);
        displayValue = parts.map((p) => (p.startsWith('#') ? p : `#${p}`)).join(' ');
      }

      tagLines.push(`▸ ${field.label}: ${displayValue}`);
    }
  }

  if (tagLines.length === 0) return '';

  return `

${TAG_BLOCK_HEADER}
${tagLines.join('\n')}
${TAG_BLOCK_FOOTER}`;
}

/**
 * 解析 Tag Block 的正则表达式
 * 兼容 🏷️ (带变体选择器) 和 🏷 (不带变体选择器)
 * Telegram 手动编辑消息时可能会去掉变体选择器
 */
export const NEO_TAG_BLOCK_REGEX = /┈┈┈ 🏷\uFE0F? ┈┈┈\n([\s\S]*?)\n┈┈┈┈┈┈┈┈┈\n?/;

/**
 * 智能解析 value：
 * - 如果 value 包含 #，则解析为 string[]（去掉每个标签的 # 前缀）
 * - 否则返回原始 string
 */
function parseValueSmart(value: string): string | string[] {
  const trimmed = value.trim();
  if (trimmed.includes('#')) {
    return trimmed.split(/\s+/).map(v => v.replace(/^#/, '')).filter(Boolean);
  }
  return trimmed;
}

/**
 * 从文本中解析 Tag Block
 * 根据 value 内容自动推断类型
 */
export function parseNeoBrutalTagBlock(
  text: string,
  fields: { key: string; label: string }[]
): Record<string, string | string[]> {
  const data: Record<string, string | string[]> = {};
  const match = text.match(NEO_TAG_BLOCK_REGEX);

  if (match && match[1]) {
    const content = match[1];
    const lines = content.split('\n');

    const labelToKey: Record<string, string> = {};
    fields.forEach((f) => {
      labelToKey[f.label] = f.key;
    });

    lines.forEach((line) => {
      // Line format: "▸ Label: Value"
      const lineMatch = line.match(/▸\s*(.+?):\s*(.*)/);
      if (lineMatch) {
        const label = lineMatch[1].trim();
        const rawValue = lineMatch[2].trim();

        const key = labelToKey[label];
        if (key) {
          data[key] = parseValueSmart(rawValue);
        }
      }
    });
  }

  return data;
}

/**
 * 移除 Tag Block
 * 兼容 🏷️ (带变体选择器) 和 🏷 (不带变体选择器)
 */
export function removeNeoBrutalTagBlock(text: string): string {
  const cleaned = text.replace(
    /\n*┈┈┈ 🏷\uFE0F? ┈┈┈\n[\s\S]*?\n┈┈┈┈┈┈┈┈┈\n*/g,
    '\n'
  );
  return cleaned.trim();
}

/**
 * 解析 Tag Block
 * 返回格式类似: {"title":"xxx","studio":"xxx","actors":[],"tags":["剧情","覆面"]}
 */
export function parseTagBlockSmart(
  text: string,
  fields: { key: string; label: string }[]
): Record<string, string | string[]> {
  return parseNeoBrutalTagBlock(text, fields);
}

/**
 * 移除 Tag Block
 */
export function removeTagBlockSmart(text: string): string {
  return removeNeoBrutalTagBlock(text);
}
