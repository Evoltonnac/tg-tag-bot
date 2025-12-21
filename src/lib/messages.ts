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
 */
export const NEO_TAG_BLOCK_REGEX = /┈┈┈ 🏷️ ┈┈┈\n([\s\S]*?)\n┈┈┈┈┈┈┈┈┈\n?/;

/**
 * 从文本中解析 Tag Block
 */
export function parseNeoBrutalTagBlock(
  text: string,
  fields: { key: string; label: string }[]
): Record<string, string> {
  const data: Record<string, string> = {};
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
        const value = lineMatch[2].trim();

        const key = labelToKey[label];
        if (key) {
          data[key] = value;
        }
      }
    });
  }

  return data;
}

/**
 * 移除 Tag Block
 */
export function removeNeoBrutalTagBlock(text: string): string {
  const cleaned = text.replace(
    /\n*┈┈┈ 🏷️ ┈┈┈\n[\s\S]*?\n┈┈┈┈┈┈┈┈┈\n*/g,
    '\n'
  );
  return cleaned.trim();
}

// ═══════════════════════════════════════════════════════
// 🔧 LEGACY COMPATIBILITY
// ═══════════════════════════════════════════════════════

export const LEGACY_TAG_BLOCK_REGEX = /==============\n🏷️ Tags\n([\s\S]*?)\n==============\n?/;
export const LEGACY_TAG_BLOCK_REGEX_V2 = /▀▀▀ 🏷️ TAGS ▀▀▀\n\n([\s\S]*?)\n\n▀▀▀▀▀▀▀▀▀▀▀▀▀▀\n?/;

/**
 * 解析旧版 Tag Block（向后兼容）
 */
export function parseLegacyTagBlock(
  text: string,
  fields: { key: string; label: string }[]
): Record<string, string> {
  const data: Record<string, string> = {};
  
  // 尝试旧版 V1
  let match = text.match(LEGACY_TAG_BLOCK_REGEX);
  let linePattern = /(?:🔹|🔸)\s*(.*?):\s*(.*)/;
  
  // 尝试旧版 V2
  if (!match) {
    match = text.match(LEGACY_TAG_BLOCK_REGEX_V2);
    linePattern = /▸\s*\*\*(.+?):\*\*\s*(.*)/;
  }

  if (match && match[1]) {
    const content = match[1];
    const lines = content.split('\n');

    const labelToKey: Record<string, string> = {};
    fields.forEach((f) => {
      labelToKey[f.label] = f.key;
    });

    lines.forEach((line) => {
      const lineMatch = line.match(linePattern);
      if (lineMatch) {
        const label = lineMatch[1].trim();
        const value = lineMatch[2].trim();
        const key = labelToKey[label];
        if (key) {
          data[key] = value;
        }
      }
    });
  }

  return data;
}

/**
 * 移除旧版 Tag Block
 */
export function removeLegacyTagBlock(text: string): string {
  let cleaned = text.replace(/\n*==============\n🏷️ Tags\n[\s\S]*?\n==============\n*/g, '\n');
  cleaned = cleaned.replace(/\n*▀▀▀ 🏷️ TAGS ▀▀▀\n\n[\s\S]*?\n\n▀▀▀▀▀▀▀▀▀▀▀▀▀▀\n*/g, '\n');
  return cleaned.trim();
}

/**
 * 智能解析 Tag Block（同时支持新旧格式）
 */
export function parseTagBlockSmart(
  text: string,
  fields: { key: string; label: string }[]
): Record<string, string> {
  // 先尝试新格式
  let result = parseNeoBrutalTagBlock(text, fields);
  if (Object.keys(result).length > 0) {
    return result;
  }

  // 再尝试旧格式
  return parseLegacyTagBlock(text, fields);
}

/**
 * 智能移除 Tag Block（同时支持新旧格式）
 */
export function removeTagBlockSmart(text: string): string {
  let result = removeNeoBrutalTagBlock(text);
  result = removeLegacyTagBlock(result);
  return result;
}
