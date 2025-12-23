'use client';

import { useState } from 'react';
import { 
  parseTagBlockSmart, 
  removeTagBlockSmart,
  TAG_BLOCK_HEADER,
  TAG_BLOCK_FOOTER 
} from '@/lib/messages';
import { Play, Trash2, Copy, Check, Zap } from 'lucide-react';

// 默认字段配置
const DEFAULT_FIELDS = [
  { key: 'title', label: '片名' },
  { key: 'studio', label: '厂牌' },
  { key: 'actors', label: '演员' },
  { key: 'tags', label: '标签' }
];

// 示例消息
const SAMPLE_MESSAGE = `这是一个测试消息

${TAG_BLOCK_HEADER}
▸ 片名: 测试影片标题
▸ 厂牌: ABC Studio
▸ 演员: #张三 #李四
▸ 标签: #剧情 #动作 #冒险
${TAG_BLOCK_FOOTER}

更多内容...`;

export default function PlaygroundPage() {
  const [messageText, setMessageText] = useState('');
  const [fieldsJson, setFieldsJson] = useState(JSON.stringify(DEFAULT_FIELDS, null, 2));
  const [parseResult, setParseResult] = useState<Record<string, string | string[]> | null>(null);
  const [cleanedText, setCleanedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleParse = () => {
    setError(null);
    setParseResult(null);
    setCleanedText(null);

    try {
      const fields = JSON.parse(fieldsJson);
      if (!Array.isArray(fields)) {
        throw new Error('字段配置必须是数组');
      }

      const result = parseTagBlockSmart(messageText, fields);
      const cleaned = removeTagBlockSmart(messageText);
      
      setParseResult(result);
      setCleanedText(cleaned);
    } catch (e) {
      setError(e instanceof Error ? e.message : '解析失败');
    }
  };

  const handleClear = () => {
    setMessageText('');
    setParseResult(null);
    setCleanedText(null);
    setError(null);
  };

  const handleLoadSample = () => {
    setMessageText(SAMPLE_MESSAGE);
    setFieldsJson(JSON.stringify(DEFAULT_FIELDS, null, 2));
    setParseResult(null);
    setCleanedText(null);
    setError(null);
  };

  const handleCopyResult = async () => {
    if (parseResult) {
      await navigator.clipboard.writeText(JSON.stringify(parseResult, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg neo-halftone p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="border-4 border-neo-border bg-neo-bg-alt neo-shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-neo-secondary border-4 border-neo-border p-2">
              <Zap className="w-6 h-6 stroke-[3px]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                Message Parser Playground
              </h1>
              <p className="text-sm text-neo-fg-muted font-bold">
                测试 Tag Block 解析功能
              </p>
            </div>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            {/* Message Input */}
            <div className="border-4 border-neo-border bg-neo-bg-alt neo-shadow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-black uppercase tracking-wide text-sm">
                  消息文本
                </label>
                <button
                  onClick={handleLoadSample}
                  className="text-xs font-bold uppercase tracking-wide px-2 py-1 border-2 border-neo-border bg-neo-muted hover:bg-neo-muted-hover transition-colors duration-100"
                >
                  加载示例
                </button>
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="粘贴包含 Tag Block 的消息..."
                className="w-full h-48 p-3 border-4 border-neo-border bg-neo-bg font-mono text-sm resize-none focus:bg-neo-secondary focus:outline-none transition-colors duration-100"
              />
            </div>

            {/* Fields Config */}
            <div className="border-4 border-neo-border bg-neo-bg-alt neo-shadow p-4 space-y-3">
              <label className="font-black uppercase tracking-wide text-sm block">
                字段配置 (JSON)
              </label>
              <textarea
                value={fieldsJson}
                onChange={(e) => setFieldsJson(e.target.value)}
                className="w-full h-32 p-3 border-4 border-neo-border bg-neo-bg font-mono text-xs resize-none focus:bg-neo-secondary focus:outline-none transition-colors duration-100"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleParse}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-4 border-neo-border bg-neo-accent font-black uppercase tracking-wide neo-shadow-sm hover:bg-neo-accent-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              >
                <Play className="w-5 h-5 stroke-[3px]" />
                解析
              </button>
              <button
                onClick={handleClear}
                className="flex items-center justify-center gap-2 px-4 py-3 border-4 border-neo-border bg-neo-bg-alt font-black uppercase tracking-wide neo-shadow-sm hover:bg-neo-secondary active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              >
                <Trash2 className="w-5 h-5 stroke-[3px]" />
              </button>
            </div>
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            {/* Parse Result */}
            <div className="border-4 border-neo-border bg-neo-bg-alt neo-shadow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-black uppercase tracking-wide text-sm">
                  解析结果
                </label>
                {parseResult && (
                  <button
                    onClick={handleCopyResult}
                    className="text-xs font-bold uppercase tracking-wide px-2 py-1 border-2 border-neo-border bg-neo-success hover:bg-neo-success/80 transition-colors duration-100 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 stroke-[3px]" /> : <Copy className="w-3 h-3 stroke-[3px]" />}
                    {copied ? '已复制' : '复制'}
                  </button>
                )}
              </div>
              
              {error ? (
                <div className="p-3 border-4 border-neo-border bg-neo-accent/20 text-neo-accent font-bold">
                  ⚠️ {error}
                </div>
              ) : parseResult ? (
                <pre className="p-3 border-4 border-neo-border bg-neo-bg font-mono text-xs overflow-auto max-h-48">
                  {JSON.stringify(parseResult, null, 2)}
                </pre>
              ) : (
                <div className="p-3 border-4 border-neo-border bg-neo-bg/50 text-neo-fg-muted text-center font-bold text-sm">
                  点击「解析」查看结果
                </div>
              )}
            </div>

            {/* Cleaned Text */}
            <div className="border-4 border-neo-border bg-neo-bg-alt neo-shadow p-4 space-y-3">
              <label className="font-black uppercase tracking-wide text-sm block">
                移除 Tag Block 后的文本
              </label>
              {cleanedText !== null ? (
                <pre className="p-3 border-4 border-neo-border bg-neo-bg font-mono text-xs whitespace-pre-wrap overflow-auto max-h-40">
                  {cleanedText || '(空)'}
                </pre>
              ) : (
                <div className="p-3 border-4 border-neo-border bg-neo-bg/50 text-neo-fg-muted text-center font-bold text-sm">
                  解析后显示
                </div>
              )}
            </div>

            {/* Field Info */}
            {parseResult && Object.keys(parseResult).length > 0 && (
              <div className="border-4 border-neo-border bg-neo-secondary/30 neo-shadow-sm p-4 space-y-2">
                <label className="font-black uppercase tracking-wide text-sm block">
                  字段详情
                </label>
                <div className="space-y-2">
                  {Object.entries(parseResult).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <span className="font-black bg-neo-fg text-neo-bg px-2 py-0.5 text-xs uppercase">
                        {key}
                      </span>
                      <span className="font-bold flex-1">
                        {Array.isArray(value) ? (
                          <span className="flex flex-wrap gap-1">
                            {value.map((v, i) => (
                              <span key={i} className="px-2 py-0.5 bg-neo-muted/50 border-2 border-neo-border text-xs">
                                {v}
                              </span>
                            ))}
                          </span>
                        ) : (
                          value
                        )}
                      </span>
                      <span className="text-xs text-neo-fg-muted uppercase">
                        {Array.isArray(value) ? 'array' : 'string'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-neo-fg-muted font-bold uppercase tracking-wide py-4 border-t-4 border-neo-border">
          Tag Block Parser • Neo-brutalism Style
        </footer>
      </div>
    </div>
  );
}

