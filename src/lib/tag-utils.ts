import { FieldConfig } from './types';

export const TAG_BLOCK_START = '==============\n🏷️ Tags';
export const TAG_BLOCK_END = '==============';

// Regex to capture the entire block including markers
// Matches:
// 1. Start Marker
// 2. Content (lazy match until End Marker)
// 3. End Marker
// 4. Optional newline
export const TAG_BLOCK_REGEX = /==============\n🏷️ Tags\n([\s\S]*?)\n==============\n?/;

/**
 * Parses existing tag block from text into a Key-Value map.
 * Needs config to map Labels back to Keys.
 */
export function parseTagBlock(text: string, fields: FieldConfig[]): Record<string, string> {
  const data: Record<string, string> = {};
  const match = text.match(TAG_BLOCK_REGEX);

  if (match && match[1]) {
    const content = match[1];
    const lines = content.split('\n');
    
    // Create Label -> Key mapping
    const labelToKey: Record<string, string> = {};
    fields.forEach(f => {
        labelToKey[f.label] = f.key;
    });

    lines.forEach(line => {
      // Line format: "🔹 Label: Value" or "🔸 Label: Value"
      // Use alternation for emoji instead of character class (multi-byte issue)
      const lineMatch = line.match(/(?:🔹|🔸)\s*(.*?):\s*(.*)/);
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
 * Removes the tag block from the text to get the original caption.
 * Also cleans up extra newlines around the removed block.
 */
export function removeTagBlock(text: string): string {
  // First remove the block, including surrounding newlines
  const cleaned = text.replace(/\n*==============\n🏷️ Tags\n[\s\S]*?\n==============\n*/g, '\n');
  return cleaned.trim();
}

/**
 * Generates a new tag block string based on form data and config.
 * - text: 直接输出文本
 * - select: 输出为 #tag 格式
 * - multi_select: 输出为 #tag1 #tag2 格式（多个标签用空格分隔）
 */
export function generateTagBlock(data: Record<string, string>, fields: FieldConfig[]): string {
    const tagLines: string[] = [];

    for (const field of fields) {
        const value = data[field.key];
        if (value) {
            let displayValue = value.trim();
            
            if (field.type === 'select' || field.type === 'multi_select') {
                // select/multi_select: 格式化为 #tag 格式
                const parts = displayValue.split(/[\s,]+/).filter(Boolean);
                displayValue = parts.map(p => p.startsWith('#') ? p : `#${p}`).join(' ');
            }
            // text 类型直接使用原始值

            const marker = '🔸';
            tagLines.push(`${marker} ${field.label}: ${displayValue}`);
        }
    }

    if (tagLines.length === 0) return '';
    
    return `\n\n${TAG_BLOCK_START}\n\n${tagLines.join('\n')}\n${TAG_BLOCK_END}`;
}

