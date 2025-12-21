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
              shrink-0 px-4 py-2 border-4 border-black font-bold text-sm uppercase tracking-wide
              transition-all duration-100
              ${isActive 
                ? 'bg-[#FF6B6B] text-black shadow-[4px_4px_0px_0px_#000]' 
                : hasValue 
                  ? 'bg-[#FFD93D] text-black shadow-[2px_2px_0px_0px_#000]' 
                  : 'bg-white text-black shadow-[2px_2px_0px_0px_#000]'
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
  isCustom = false
}: { 
  label: string;
  selected: boolean;
  onClick: () => void;
  onRemove?: () => void;
  isCustom?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-4 py-3 border-4 border-black font-bold text-base
        transition-all duration-100
        ${selected 
          ? 'bg-[#FF6B6B] text-black shadow-[4px_4px_0px_0px_#000] -translate-y-1' 
          : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFD93D]'
        }
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
      `}
    >
      {label}
      {isCustom && onRemove && (
        <span 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-black border-2 border-black"
        >
          ×
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
        className="flex-1 px-4 py-3 border-4 border-black font-bold text-base bg-white
          placeholder:text-black/60
          focus:bg-[#FFD93D] focus:shadow-[4px_4px_0px_0px_#000] focus:outline-none"
      />
      <button
        onClick={handleAdd}
        disabled={!inputValue.trim()}
        className="px-6 py-3 border-4 border-black font-black text-base uppercase
          bg-[#C4B5FD] shadow-[4px_4px_0px_0px_#000]
          hover:bg-[#FFD93D] transition-all duration-100
          active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + 添加
      </button>
    </div>
  );
}

// 字段编辑器组件
function FieldEditor({
  field,
  value,
  customOptions,
  onChange,
  onAddCustom,
  onRemoveCustom
}: {
  field: FieldConfig;
  value: string | string[];
  customOptions: string[];
  onChange: (value: string | string[]) => void;
  onAddCustom: (value: string) => void;
  onRemoveCustom: (value: string) => void;
}) {
  const allOptions = [...(field.options || []), ...customOptions];

  // 纯文本输入
  if (field.type === 'text') {
    return (
      <div className="space-y-4">
        <input
          type="text"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`输入 ${field.label}...`}
          className="w-full px-4 py-4 border-4 border-black font-bold text-lg bg-white
            placeholder:text-black/60
            focus:bg-[#FFD93D] focus:shadow-[4px_4px_0px_0px_#000] focus:outline-none"
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
            />
          ))}
        </div>
        {field.allow_new && (
          <AddNewTagInput onAdd={onAddCustom} />
        )}
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
            />
          ))}
        </div>
        {selectedValues.length > 0 && (
          <div className="pt-2 border-t-4 border-black/20">
            <span className="font-bold text-sm text-black/80 uppercase tracking-wide">
              已选: {selectedValues.join(', ')}
            </span>
          </div>
        )}
        {field.allow_new && (
          <AddNewTagInput onAdd={onAddCustom} />
        )}
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
  
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'success' | 'error'>('loading');
  const [statusMsg, setStatusMsg] = useState('Loading...');
  const containerRef = useRef<HTMLDivElement>(null);

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

    fetch(`/api/get-message-data?chat_id=${chatId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        
        setConfig(data.config);
        
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
      <div className="flex items-center justify-center min-h-screen bg-[#FFFDF5]">
        <div className="px-8 py-4 border-4 border-black bg-[#FFD93D] shadow-[8px_8px_0px_0px_#000] font-black text-xl uppercase animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFFDF5]">
        <div className="px-8 py-4 border-4 border-black bg-[#FF6B6B] shadow-[8px_8px_0px_0px_#000] font-black text-xl">
          {statusMsg}
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFFDF5]">
        <div className="px-8 py-4 border-4 border-black bg-[#4ADE80] shadow-[8px_8px_0px_0px_#000] font-black text-2xl uppercase">
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
      className="min-h-screen bg-[#FFFDF5] p-4 pb-32 overflow-y-auto"
      style={{
        backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
    >
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="inline-block px-4 py-2 border-4 border-black bg-black text-white font-black text-xl uppercase tracking-tight shadow-[4px_4px_0px_0px_#FF6B6B] -rotate-1">
          标签管理
        </h1>
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
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 flex items-center justify-center border-4 border-black bg-[#FFD93D] font-black text-lg">
              {currentStep + 1}
            </span>
            <h2 className="font-black text-xl uppercase tracking-tight">
              {currentField.label}
              {currentField.required && (
                <span className="text-[#FF6B6B] ml-1">*</span>
              )}
            </h2>
            {currentField.type === 'multi_select' && (
              <span className="px-2 py-1 border-2 border-black bg-[#C4B5FD] text-xs font-bold uppercase">
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
          />
        </div>
      )}

      {/* 底部导航 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#FFFDF5] border-t-4 border-black">
        <div className="max-w-md mx-auto flex gap-3">
          {!isFirstStep && (
            <button
              onClick={goToPrevStep}
              className="flex-1 py-4 border-4 border-black bg-white font-black text-base uppercase
                shadow-[4px_4px_0px_0px_#000]
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                transition-all duration-100"
            >
              ← 上一步
            </button>
          )}
          
          {!isLastStep ? (
            <button
              onClick={goToNextStep}
              className="flex-1 py-4 border-4 border-black bg-[#FFD93D] font-black text-base uppercase
                shadow-[4px_4px_0px_0px_#000]
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                transition-all duration-100"
            >
              下一步 →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={status === 'submitting'}
              className="flex-1 py-4 border-4 border-black bg-[#FF6B6B] font-black text-base uppercase
                shadow-[4px_4px_0px_0px_#000]
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                transition-all duration-100
                disabled:opacity-50"
            >
              {status === 'submitting' ? '提交中...' : '✓ 完成提交'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#FFFDF5]">
        <div className="px-8 py-4 border-4 border-black bg-[#FFD93D] shadow-[8px_8px_0px_0px_#000] font-black text-xl uppercase">
          Loading...
        </div>
      </div>
    }>
      <FormContent />
    </Suspense>
  );
}
