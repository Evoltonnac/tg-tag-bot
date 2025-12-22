'use client';

import { useEffect, useState, Suspense, useRef, KeyboardEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatConfig, FieldConfig } from '@/lib/types';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        colorScheme: 'light' | 'dark';
        MainButton: unknown;
        themeParams: Record<string, unknown>;
        initDataUnsafe: {
            user?: {
                id: number;
                username?: string;
            };
        };
      };
    };
  }
}

// AI Fill Modal
function AiFillModal({
  isOpen,
  onClose,
  onApply,
  config,
  currentData,
  rawText,
  chatId
}: {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: Record<string, string | string[]>) => void;
  config: ChatConfig;
  currentData: Record<string, string | string[]>;
  rawText: string;
  chatId: string;
}) {
    const [userQuery, setUserQuery] = useState('');
    const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    const [currentStep, setCurrentStep] = useState('');
    const [result, setResult] = useState<Record<string, unknown> | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [descExpanded, setDescExpanded] = useState(false);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setUserQuery('');
            setStatus('idle');
            setCurrentStep('');
            setResult(null);
            setErrorMsg('');
            setDescExpanded(false);
        }
    }, [isOpen, config]);

    const handleRun = async () => {
        setStatus('running');
        setCurrentStep('正在连接 AI...');
        setResult(null);
        setErrorMsg('');

        try {
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId,
                    query: userQuery,
                    rawData: rawText
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'AI 请求失败');
            }

            // 处理 SSE 流式响应
            const reader = res.body?.getReader();
            if (!reader) throw new Error('无法读取响应');

            const decoder = new TextDecoder();
            let buffer = '';
            let streamDone = false; // 使用局部变量追踪完成状态

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'thought') {
                            // 显示当前步骤
                            let stepText = '';
                            if (data.tool) {
                                stepText = `🔧 调用工具: ${data.tool}`;
                            } else if (data.thought) {
                                stepText = `💭 ${data.thought.slice(0, 100)}${data.thought.length > 100 ? '...' : ''}`;
                            }
                            if (stepText) setCurrentStep(stepText);
                        } else if (data.type === 'done') {
                            if (data.data) {
                                setResult(data.data);
                                setCurrentStep('✓ 分析完成');
                                setStatus('done');
                                streamDone = true; // 标记完成
                            } else {
                                throw new Error('AI 返回数据解析失败: ' + (data.raw || '').slice(0, 200));
                            }
                        } else if (data.type === 'error') {
                            throw new Error(data.error || 'AI 处理出错');
                        }
                    } catch (e) {
                        if (e instanceof SyntaxError) continue; // JSON 解析错误忽略
                        throw e;
                    }
                }
            }

            // 如果循环结束还没有 done，可能是流被截断
            if (!streamDone) {
                setStatus('error');
                setErrorMsg('AI 响应不完整');
            }

        } catch (e: unknown) {
            setStatus('error');
            setErrorMsg(e instanceof Error ? e.message : String(e));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-bg/90 backdrop-blur-sm">
            <div className="bg-neo-bg-alt border-4 border-neo-border shadow-[8px_8px_0px_0px_var(--color-neo-shadow)] w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col neo-animate-pop-in">
                {/* Header with slide animation */}
                <div className="flex justify-between items-center p-4 border-b-4 border-neo-border bg-neo-accent neo-animate-slide-in-left">
                    <h2 className="font-black text-xl uppercase text-neo-fg flex items-center gap-2">
                        <span className="inline-block animate-pulse">✨</span> AI Auto-fill
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="font-black text-xl w-8 h-8 flex items-center justify-center border-2 border-neo-border bg-neo-bg-alt hover:bg-neo-fg hover:text-neo-bg transition-all duration-150 hover:rotate-90"
                    >
                        ×
                    </button>
                </div>
                
                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {status === 'running' ? (
                        <div className="space-y-4 neo-animate-slide-up">
                            <div className="bg-neo-secondary/50 p-4 border-4 border-neo-border">
                                <div className="flex items-center gap-3">
                                    {/* Custom brutal spinner */}
                                    <div className="w-6 h-6 border-4 border-neo-fg bg-neo-accent relative overflow-hidden">
                                        <div className="absolute inset-0 bg-neo-fg animate-[neo-spin-brutal_0.8s_steps(4)_infinite] origin-center" 
                                             style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                                    </div>
                                    <span className="font-bold text-neo-fg">
                                        AI 正在分析
                                        <span className="neo-typing-dots inline-flex ml-1">
                                            <span className="w-1.5 h-1.5 bg-neo-fg rounded-full mx-0.5"></span>
                                            <span className="w-1.5 h-1.5 bg-neo-fg rounded-full mx-0.5"></span>
                                            <span className="w-1.5 h-1.5 bg-neo-fg rounded-full mx-0.5"></span>
                                        </span>
                                    </span>
                                </div>
                                {currentStep && (
                                    <div className="mt-3 p-3 bg-neo-bg border-2 border-neo-border font-mono text-sm text-neo-fg-muted neo-animate-slide-in-left">
                                        {currentStep}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : !result ? (
                        <div className="neo-animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
                             {config.ai_config?.description && (
                                <div className="bg-neo-secondary/50 p-3 border-2 border-neo-border text-sm text-neo-fg mb-4 relative group">
                                    <span className="font-bold">系统描述：</span>
                                    <span className={descExpanded ? '' : 'line-clamp-3'}>
                                        {config.ai_config.description}
                                    </span>
                                    {config.ai_config.description.length > 100 && (
                                        <button 
                                            onClick={() => setDescExpanded(!descExpanded)}
                                            className="text-neo-fg-muted text-xs font-bold mt-1 hover:text-neo-fg transition-colors block"
                                        >
                                            {descExpanded ? '▲ 收起' : '▼ 展开'}
                                        </button>
                                    )}
                                </div>
                             )}
                             <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-neo-fg-muted mb-2">
                                    补充说明（可选）
                                </label>
                                <textarea 
                                    value={userQuery}
                                    onChange={e => setUserQuery(e.target.value)}
                                    placeholder="输入额外的说明或要求..."
                                    className="w-full h-28 p-3 border-4 border-neo-border font-bold bg-neo-bg text-neo-fg resize-none focus:outline-none focus:shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] transition-shadow duration-150"
                                />
                            </div>
                            
                            {status === 'error' && errorMsg && (
                                <div className="bg-neo-accent/20 p-3 border-4 border-neo-accent text-neo-fg font-mono text-xs break-all mt-4 neo-animate-shake">
                                    错误: {errorMsg}
                                </div>
                            )}
                        </div>
                    ) : (
                         <div className="space-y-4 neo-animate-slide-up">
                            <div className="bg-neo-secondary p-4 border-4 border-neo-border neo-animate-bounce-shadow">
                                <h3 className="font-black text-lg mb-2 text-neo-fg flex items-center gap-2">
                                    <span className="inline-block text-neo-success">✓</span> 预览结果
                                </h3>
                                <pre className="text-xs font-mono overflow-auto max-h-[300px] bg-neo-bg p-2 border-2 border-neo-border whitespace-pre-wrap">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </div>
                         </div>
                    )}
                </div>

                <div className="p-4 border-t-4 border-neo-border bg-neo-bg-alt">
                    {status !== 'done' ? (
                        <button 
                            onClick={handleRun}
                            disabled={status === 'running'}
                            className={`
                                w-full py-3 bg-neo-fg text-neo-bg font-black uppercase text-lg border-4 border-neo-border 
                                shadow-[4px_4px_0px_0px_var(--color-neo-accent)] 
                                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none 
                                disabled:opacity-50 transition-all duration-150 
                                hover:bg-neo-fg/90 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-neo-accent)]
                            `}
                        >
                            {status === 'running' ? '生成中...' : status === 'error' ? '🔄 重试' : '⚡ 开始生成'}
                        </button>
                    ) : (
                         <div className="flex gap-3">
                            <button 
                                onClick={() => { setStatus('idle'); setResult(null); setCurrentStep(''); }}
                                className="flex-1 py-3 bg-neo-bg text-neo-fg font-black uppercase border-4 border-neo-border shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] hover:bg-neo-secondary hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-neo-shadow)] transition-all duration-150"
                            >
                                🔄 重试
                            </button>
                            <button 
                                onClick={() => onApply(result as Record<string, string | string[]>)}
                                className="flex-1 py-3 bg-neo-success text-neo-fg font-black uppercase border-4 border-neo-border shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-neo-shadow)] transition-all duration-150 neo-animate-bounce-shadow"
                            >
                                ✓ 应用结果
                            </button>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// 步骤指示器组件
function StepIndicator({ 
  fields, 
  currentStep, 
  formData, 
  onStepClick 
}: { 
  fields: FieldConfig[];
  currentStep: number;
  formData: Record<string, string | string[]>;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {fields.map((field, index) => {
        const isActive = index === currentStep;
        const hasValue = field.type === 'multi_select' 
          ? Array.isArray(formData[field.key]) && (formData[field.key] as string[]).length > 0
          : !!formData[field.key];
        
        return (
          <button
            key={field.key}
            onClick={() => onStepClick(index)}
            className={`
              shrink-0 px-4 py-2 border-4 border-neo-border font-bold text-sm uppercase tracking-wide text-neo-fg
              transition-all duration-100
              ${isActive 
                ? 'bg-neo-accent shadow-[4px_4px_0px_0px_var(--color-neo-shadow)]' 
                : hasValue 
                  ? 'bg-neo-secondary shadow-[2px_2px_0px_0px_var(--color-neo-shadow)]' 
                  : 'bg-neo-bg-alt shadow-[2px_2px_0px_0px_var(--color-neo-shadow)]'
              }
              active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
            `}
          >
            {index + 1}. {field.label}
          </button>
        );
      })}
    </div>
  );
}

// 单个选项标签组件
function OptionTag({ 
  label, 
  selected, 
  onClick,
  onRemove,
  onEdit,
  isCustom = false
}: { 
  label: string;
  selected: boolean;
  onClick: () => void;
  onRemove?: () => void;
  onEdit?: () => void;
  isCustom?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-4 py-3 border-4 border-neo-border font-bold text-base text-neo-fg
        transition-all duration-100
        ${selected 
          ? 'bg-neo-accent shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] -translate-y-1' 
          : 'bg-neo-bg-alt shadow-[2px_2px_0px_0px_var(--color-neo-shadow)] hover:bg-neo-secondary'
        }
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
        ${isCustom ? 'pr-14' : ''}
      `}
    >
      {label}
      {isCustom && (
        <span className="absolute -top-2 -right-2 flex gap-0.5">
          {onEdit && (
            <span 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-6 h-6 bg-neo-secondary text-neo-fg flex items-center justify-center text-xs font-black border-2 border-neo-border hover:bg-neo-muted"
              title="编辑"
            >
              ✎
            </span>
          )}
          {onRemove && (
            <span 
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="w-6 h-6 bg-neo-fg text-neo-bg flex items-center justify-center text-xs font-black border-2 border-neo-border hover:bg-neo-accent"
              title="删除"
            >
              ×
            </span>
          )}
        </span>
      )}
    </button>
  );
}

// 添加新标签输入组件
function AddNewTagInput({ 
  onAdd 
}: { 
  onAdd: (value: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAdd(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex gap-2 mt-4">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入新标签..."
        className="flex-1 px-4 py-3 border-4 border-neo-border font-bold text-base bg-neo-bg-alt text-neo-fg
          placeholder:text-neo-fg-muted
          focus:bg-neo-secondary focus:shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] focus:outline-none"
      />
      <button
        onClick={handleAdd}
        disabled={!inputValue.trim()}
        className="px-6 py-3 border-4 border-neo-border font-black text-base uppercase text-neo-fg
          bg-neo-muted shadow-[4px_4px_0px_0px_var(--color-neo-shadow)]
          hover:bg-neo-secondary transition-all duration-100
          active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + 添加
      </button>
    </div>
  );
}

// 编辑自定义选项弹窗（内部组件，由 key 控制重新挂载）
function EditCustomOptionModalInner({
  currentValue,
  onClose,
  onSave
}: {
  currentValue: string;
  onClose: () => void;
  onSave: (newValue: string) => void;
}) {
  const [editValue, setEditValue] = useState(currentValue);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== currentValue) {
      onSave(trimmed);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-bg/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neo-bg-alt border-4 border-neo-border shadow-[8px_8px_0px_0px_var(--color-neo-shadow)] w-full max-w-sm">
        <div className="p-4 border-b-4 border-neo-border bg-neo-secondary">
          <h3 className="font-black text-lg uppercase text-neo-fg">编辑标签</h3>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className="w-full px-4 py-3 border-4 border-neo-border font-bold text-base bg-neo-bg text-neo-fg
              focus:bg-neo-secondary focus:shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] focus:outline-none"
          />
        </div>
        <div className="p-4 border-t-4 border-neo-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-4 border-neo-border bg-neo-bg font-black uppercase text-neo-fg
              shadow-[2px_2px_0px_0px_var(--color-neo-shadow)] hover:bg-neo-secondary transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!editValue.trim()}
            className="flex-1 py-3 border-4 border-neo-border bg-neo-accent font-black uppercase text-neo-fg
              shadow-[2px_2px_0px_0px_var(--color-neo-shadow)] hover:brightness-110 transition-all
              disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// 编辑自定义选项弹窗（包装组件）
function EditCustomOptionModal({
  isOpen,
  currentValue,
  onClose,
  onSave
}: {
  isOpen: boolean;
  currentValue: string;
  onClose: () => void;
  onSave: (newValue: string) => void;
}) {
  if (!isOpen) return null;
  // 使用 key 强制在每次打开时重新挂载内部组件，确保 state 重置
  return (
    <EditCustomOptionModalInner
      key={currentValue}
      currentValue={currentValue}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

// 字段编辑器组件
function FieldEditor({
  field,
  value,
  customOptions,
  onChange,
  onAddCustom,
  onRemoveCustom,
  onEditCustom
}: {
  field: FieldConfig;
  value: string | string[];
  customOptions: string[];
  onChange: (value: string | string[]) => void;
  onAddCustom: (value: string) => void;
  onRemoveCustom: (value: string) => void;
  onEditCustom: (oldValue: string, newValue: string) => void;
}) {
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const allOptions = [...(field.options || []), ...customOptions];

  // 纯文本输入（支持折行）
  if (field.type === 'text') {
    return (
      <div className="space-y-4">
        <textarea
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`输入 ${field.label}...`}
          rows={3}
          className="w-full px-4 py-4 border-4 border-neo-border font-bold text-lg bg-neo-bg-alt text-neo-fg
            placeholder:text-neo-fg-muted resize-y min-h-[60px]
            focus:bg-neo-secondary focus:shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] focus:outline-none"
        />
      </div>
    );
  }

  // 单选
  if (field.type === 'select') {
    const selectedValue = value as string;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {allOptions.map((opt) => (
            <OptionTag
              key={opt}
              label={opt}
              selected={selectedValue === opt}
              onClick={() => onChange(selectedValue === opt ? '' : opt)}
              isCustom={customOptions.includes(opt)}
              onRemove={customOptions.includes(opt) ? () => onRemoveCustom(opt) : undefined}
              onEdit={customOptions.includes(opt) ? () => setEditingOption(opt) : undefined}
            />
          ))}
        </div>
        {field.allow_new && (
          <AddNewTagInput onAdd={onAddCustom} />
        )}
        <EditCustomOptionModal
          isOpen={editingOption !== null}
          currentValue={editingOption || ''}
          onClose={() => setEditingOption(null)}
          onSave={(newValue) => {
            if (editingOption) {
              onEditCustom(editingOption, newValue);
              // 如果当前选中的是被编辑的选项，更新选中值
              if (selectedValue === editingOption) {
                onChange(newValue);
              }
            }
            setEditingOption(null);
          }}
        />
      </div>
    );
  }

  // 多选
  if (field.type === 'multi_select') {
    const selectedValues = Array.isArray(value) ? value : [];
    
    const toggleOption = (opt: string) => {
      if (selectedValues.includes(opt)) {
        onChange(selectedValues.filter(v => v !== opt));
      } else {
        onChange([...selectedValues, opt]);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {allOptions.map((opt) => (
            <OptionTag
              key={opt}
              label={opt}
              selected={selectedValues.includes(opt)}
              onClick={() => toggleOption(opt)}
              isCustom={customOptions.includes(opt)}
              onRemove={customOptions.includes(opt) ? () => {
                onRemoveCustom(opt);
                if (selectedValues.includes(opt)) {
                  onChange(selectedValues.filter(v => v !== opt));
                }
              } : undefined}
              onEdit={customOptions.includes(opt) ? () => setEditingOption(opt) : undefined}
            />
          ))}
        </div>
        {selectedValues.length > 0 && (
          <div className="pt-2 border-t-4 border-neo-border/20">
            <span className="font-bold text-sm text-neo-fg-muted uppercase tracking-wide">
              已选: {selectedValues.join(', ')}
            </span>
          </div>
        )}
        {field.allow_new && (
          <AddNewTagInput onAdd={onAddCustom} />
        )}
        <EditCustomOptionModal
          isOpen={editingOption !== null}
          currentValue={editingOption || ''}
          onClose={() => setEditingOption(null)}
          onSave={(newValue) => {
            if (editingOption) {
              onEditCustom(editingOption, newValue);
              // 如果当前选中的是被编辑的选项，更新选中值
              if (selectedValues.includes(editingOption)) {
                onChange(selectedValues.map(v => v === editingOption ? newValue : v));
              }
            }
            setEditingOption(null);
          }}
        />
      </div>
    );
  }

  return null;
}

function FormContent() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chat_id');
  const messageId = searchParams.get('message_id');
  const privateChatId = searchParams.get('private_chat_id');
  const userMsgId = searchParams.get('user_msg_id');
  const botMsgId = searchParams.get('bot_msg_id');
  const channelUsername = searchParams.get('channel_username');
  const tagsParam = searchParams.get('tags');
  const rawDataParam = searchParams.get('raw_data');
  
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'success' | 'error'>('loading');
  const [statusMsg, setStatusMsg] = useState('Loading...');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // AI States
  const [rawText, setRawText] = useState('');
  const [isAiOpen, setIsAiOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    if (!chatId || !messageId) {
      setStatus('error');
      setStatusMsg('Missing parameters');
      return;
    }

    const parsedTags: Record<string, string | string[]> = {};
    if (tagsParam) {
      try {
        const raw = JSON.parse(decodeURIComponent(tagsParam));
        // 转换格式：确保 multi_select 是数组
        Object.keys(raw).forEach(key => {
          parsedTags[key] = raw[key];
        });
      } catch (e) {
        console.warn('Failed to parse tags from URL:', e);
      }
    }

    fetch(`/api/get-config?chat_id=${chatId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        
        setConfig(data.config);
        setRawText(rawDataParam || '');
        
        // 初始化 formData，确保 multi_select 类型是数组
        const initialData: Record<string, string | string[]> = {};
        data.config.fields.forEach((field: FieldConfig) => {
          if (field.type === 'multi_select') {
            const parsed = parsedTags[field.key];
            initialData[field.key] = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } else {
            initialData[field.key] = parsedTags[field.key] || '';
          }
        });
        
        setFormData(initialData);
        setStatus('ready');
      })
      .catch(err => {
        console.error(err);
        setStatus('error');
        setStatusMsg(err.message || 'Failed to load config');
      });

  }, [chatId, messageId, tagsParam]);

  const handleAiApply = (data: any) => {
    const newFormData = { ...formData };
    
    if (config) {
        config.fields.forEach(field => {
            if (data[field.key]) {
                const val = data[field.key];
                if (field.type === 'multi_select') {
                    // Ensure unique values and proper array
                    const currentArr = Array.isArray(newFormData[field.key]) ? newFormData[field.key] as string[] : [];
                    const newArr = Array.isArray(val) ? val : [val];
                    // We can either replace or merge. Let's replace as it's "Auto-fill" but maybe user wants merge?
                    // User prompt implies "filling", usually replacement or smart merge.
                    // Given the UI allows review, replacement seems cleaner for the specific field, 
                    // but we should probably keep existing tags if they aren't in the new list? 
                    // Actually, simple replacement is less confusing.
                    newFormData[field.key] = newArr;
                } else {
                    newFormData[field.key] = Array.isArray(val) ? val.join(', ') : String(val);
                }
            }
        });
    }
    
    setFormData(newFormData);
    setIsAiOpen(false);
  };

  const handleFieldChange = (key: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleAddCustomOption = (fieldKey: string, value: string) => {
    const field = config?.fields.find(f => f.key === fieldKey);
    const existingOptions = field?.options || [];
    const existingCustom = customOptions[fieldKey] || [];
    
    if (!existingOptions.includes(value) && !existingCustom.includes(value)) {
      setCustomOptions(prev => ({
        ...prev,
        [fieldKey]: [...(prev[fieldKey] || []), value]
      }));
      
      // 自动选中新添加的选项
      if (field?.type === 'multi_select') {
        const current = formData[fieldKey];
        const arr = Array.isArray(current) ? current : [];
        setFormData(prev => ({ ...prev, [fieldKey]: [...arr, value] }));
      } else {
        setFormData(prev => ({ ...prev, [fieldKey]: value }));
      }
    }
  };

  const handleRemoveCustomOption = (fieldKey: string, value: string) => {
    setCustomOptions(prev => ({
      ...prev,
      [fieldKey]: (prev[fieldKey] || []).filter(v => v !== value)
    }));
  };

  const handleEditCustomOption = (fieldKey: string, oldValue: string, newValue: string) => {
    // 更新自定义选项列表
    setCustomOptions(prev => ({
      ...prev,
      [fieldKey]: (prev[fieldKey] || []).map(v => v === oldValue ? newValue : v)
    }));
  };

  const goToNextStep = () => {
    if (config && currentStep < config.fields.length - 1) {
      setCurrentStep(prev => prev + 1);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!config || !chatId || !messageId) return;
    setStatus('submitting');
    
    const tagsMap: Record<string, string> = {};
    config.fields.forEach(field => {
      const val = formData[field.key];
      if (val) {
        if (Array.isArray(val) && val.length > 0) {
          tagsMap[field.key] = val.join(', ');
        } else if (typeof val === 'string' && val) {
          tagsMap[field.key] = val;
        }
      }
    });

    try {
      const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      const effectiveUserId = userId ? String(userId) : privateChatId;
      
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            chatId, 
            messageId, 
            tags: tagsMap, 
            userId: effectiveUserId || undefined,
            privateChatId,
            userMsgId,
            botMsgId,
            channelUsername
        }),
      });
      
      if (!res.ok) throw new Error('Submit failed');
      
      setStatus('success');
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        window.Telegram.WebApp.close();
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
      setStatusMsg('Failed to submit tags');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-bg">
        <div className="px-8 py-4 border-4 border-neo-border bg-neo-secondary shadow-[8px_8px_0px_0px_var(--color-neo-shadow)] font-black text-xl uppercase animate-pulse text-neo-fg">
          Loading...
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-bg">
        <div className="px-8 py-4 border-4 border-neo-border bg-neo-accent shadow-[8px_8px_0px_0px_var(--color-neo-shadow)] font-black text-xl text-neo-fg">
          {statusMsg}
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-bg">
        <div className="px-8 py-4 border-4 border-neo-border bg-neo-success shadow-[8px_8px_0px_0px_var(--color-neo-shadow)] font-black text-2xl uppercase text-neo-fg">
          ✓ 成功！
        </div>
      </div>
    );
  }

  const currentField = config?.fields[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = config ? currentStep === config.fields.length - 1 : true;

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-neo-bg p-4 pb-32 overflow-y-auto neo-halftone-sm"
    >
      {/* 标题 */}
      <div className="mb-6 flex justify-between items-start">
        <h1 className="inline-block px-4 py-2 border-4 border-neo-border bg-neo-fg text-neo-bg font-black text-xl uppercase tracking-tight shadow-[4px_4px_0px_0px_var(--color-neo-accent)] -rotate-1">
          标签管理
        </h1>
        
        {config?.ai_config?.enabled && (
             <button
                onClick={() => setIsAiOpen(true)}
                className="neo-animate-pop-in neo-animate-pulse-ring group px-3 py-2 border-4 border-neo-border bg-neo-accent font-black text-sm uppercase text-neo-fg shadow-[3px_3px_0px_0px_var(--color-neo-shadow)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_var(--color-neo-shadow)]"
             >
                <span className="inline-block group-hover:animate-pulse">✨</span> AI Auto-fill
             </button>
        )}
      </div>

      {/* 步骤指示器 */}
      {config && (
        <StepIndicator
          fields={config.fields}
          currentStep={currentStep}
          formData={formData}
          onStepClick={setCurrentStep}
        />
      )}

      {/* 当前字段编辑器 */}
      {currentField && (
        <div className="bg-neo-bg-alt border-4 border-neo-border shadow-[8px_8px_0px_0px_var(--color-neo-shadow)] p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 flex items-center justify-center border-4 border-neo-border bg-neo-secondary font-black text-lg text-neo-fg">
              {currentStep + 1}
            </span>
            <h2 className="font-black text-xl uppercase tracking-tight text-neo-fg">
              {currentField.label}
              {currentField.required && (
                <span className="text-neo-accent ml-1">*</span>
              )}
            </h2>
            {currentField.type === 'multi_select' && (
              <span className="px-2 py-1 border-2 border-neo-border bg-neo-muted text-xs font-bold uppercase text-neo-fg">
                多选
              </span>
            )}
          </div>

          <FieldEditor
            field={currentField}
            value={formData[currentField.key]}
            customOptions={customOptions[currentField.key] || []}
            onChange={(val) => handleFieldChange(currentField.key, val)}
            onAddCustom={(val) => handleAddCustomOption(currentField.key, val)}
            onRemoveCustom={(val) => handleRemoveCustomOption(currentField.key, val)}
            onEditCustom={(oldVal, newVal) => handleEditCustomOption(currentField.key, oldVal, newVal)}
          />
        </div>
      )}

      {/* 底部导航 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-neo-bg border-t-4 border-neo-border">
        <div className="max-w-md mx-auto flex gap-3">
          {!isFirstStep && (
            <button
              onClick={goToPrevStep}
              className="flex-1 py-4 border-4 border-neo-border bg-neo-bg-alt font-black text-base uppercase text-neo-fg
                shadow-[4px_4px_0px_0px_var(--color-neo-shadow)]
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                transition-all duration-100"
            >
              ← 上一步
            </button>
          )}
          
          {!isLastStep ? (
            <button
              onClick={goToNextStep}
              className="flex-1 py-4 border-4 border-neo-border bg-neo-secondary font-black text-base uppercase text-neo-fg
                shadow-[4px_4px_0px_0px_var(--color-neo-shadow)]
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                transition-all duration-100"
            >
              下一步 →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={status === 'submitting'}
              className="flex-1 py-4 border-4 border-neo-border bg-neo-accent font-black text-base uppercase text-neo-fg
                shadow-[4px_4px_0px_0px_var(--color-neo-shadow)]
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                transition-all duration-100
                disabled:opacity-50"
            >
              {status === 'submitting' ? '提交中...' : '✓ 完成提交'}
            </button>
          )}
        </div>
      </div>

      {config && (
        <AiFillModal
            isOpen={isAiOpen}
            onClose={() => setIsAiOpen(false)}
            onApply={handleAiApply}
            config={config}
            currentData={formData}
            rawText={rawText}
            chatId={chatId || ''}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-neo-bg">
        <div className="px-8 py-4 border-4 border-neo-border bg-neo-secondary shadow-[8px_8px_0px_0px_var(--color-neo-shadow)] font-black text-xl uppercase text-neo-fg">
          Loading...
        </div>
      </div>
    }>
      <FormContent />
    </Suspense>
  );
}
