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

// 类型选择按钮
function TypeButton({ 
  label, 
  selected, 
  onClick 
}: { 
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-3 border-4 border-neo-border font-bold text-sm uppercase text-neo-fg
        transition-all duration-100
        ${selected 
          ? 'bg-neo-accent shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] -translate-y-0.5' 
          : 'bg-neo-bg-alt shadow-[2px_2px_0px_0px_var(--color-neo-shadow)] hover:bg-neo-secondary'
        }
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
      `}
    >
      {label}
    </button>
  );
}

// 选项标签组件
function OptionTag({ 
  label, 
  onRemove 
}: { 
  label: string;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 border-4 border-neo-border bg-neo-muted font-bold text-sm shadow-[2px_2px_0px_0px_var(--color-neo-shadow)] text-neo-fg">
      {label}
      <button 
        onClick={onRemove}
        className="w-5 h-5 flex items-center justify-center bg-neo-fg text-neo-bg font-black text-xs hover:bg-neo-accent transition-colors"
      >
        ×
      </button>
    </div>
  );
}

// 添加选项输入
function AddOptionInput({ 
  onAdd 
}: { 
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入新选项..."
        className="flex-1 px-3 py-2 border-4 border-neo-border font-bold text-sm bg-neo-bg-alt text-neo-fg
          placeholder:text-neo-fg-muted
          focus:bg-neo-secondary focus:shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] focus:outline-none"
      />
      <button
        onClick={handleAdd}
        disabled={!value.trim()}
        className="px-4 py-2 border-4 border-neo-border font-black text-sm uppercase text-neo-fg
          bg-neo-secondary shadow-[2px_2px_0px_0px_var(--color-neo-shadow)]
          hover:bg-neo-accent transition-all duration-100
          active:translate-x-px active:translate-y-px active:shadow-none
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

// 字段编辑卡片
function FieldCard({
  field,
  index,
  onUpdate,
  onRemove,
  isExpanded,
  onToggle
}: {
  field: FieldConfig;
  index: number;
  onUpdate: (updates: Partial<FieldConfig>) => void;
  onRemove: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const addOption = (opt: string) => {
    const existing = field.options || [];
    if (!existing.includes(opt)) {
      onUpdate({ options: [...existing, opt] });
    }
  };

  const removeOption = (opt: string) => {
    onUpdate({ options: (field.options || []).filter(o => o !== opt) });
  };

  return (
    <div className="bg-neo-bg-alt border-4 border-neo-border shadow-[6px_6px_0px_0px_var(--color-neo-shadow)]">
      {/* 卡片头部 - 可点击展开/收起 */}
      <div 
        onClick={onToggle}
        className="flex items-center justify-between p-4 bg-neo-secondary border-b-4 border-neo-border cursor-pointer hover:bg-neo-secondary-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 flex items-center justify-center border-4 border-neo-border bg-neo-bg-alt font-black text-base text-neo-fg">
            {index + 1}
          </span>
          <div>
            <h3 className="font-black text-lg uppercase tracking-tight text-neo-fg">{field.label || 'New Field'}</h3>
            <span className="text-xs font-bold text-neo-fg-muted uppercase">
              {field.type === 'text' ? '文本' : field.type === 'select' ? '单选' : '多选'}
              {field.required && ' • 必填'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black text-xl text-neo-fg">{isExpanded ? '−' : '+'}</span>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-neo-fg-muted mb-1">
                显示名称
              </label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="w-full px-3 py-2 border-4 border-neo-border font-bold text-base bg-neo-bg-alt text-neo-fg
                  focus:bg-neo-secondary focus:shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-neo-fg-muted mb-1">
                字段键名
              </label>
              <input
                type="text"
                value={field.key}
                onChange={(e) => onUpdate({ key: e.target.value })}
                className="w-full px-3 py-2 border-4 border-neo-border font-bold text-base bg-neo-bg-alt text-neo-fg
                  focus:bg-neo-secondary focus:shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] focus:outline-none"
              />
            </div>
          </div>

          {/* 类型选择 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-neo-fg-muted mb-2">
              字段类型
            </label>
            <div className="flex flex-wrap gap-2">
              <TypeButton
                label="文本"
                selected={field.type === 'text'}
                onClick={() => onUpdate({ type: 'text' })}
              />
              <TypeButton
                label="单选"
                selected={field.type === 'select'}
                onClick={() => onUpdate({ type: 'select' })}
              />
              <TypeButton
                label="多选"
                selected={field.type === 'multi_select'}
                onClick={() => onUpdate({ type: 'multi_select' })}
              />
            </div>
          </div>

          {/* 必填选项 */}
          <div>
            <button
              onClick={() => onUpdate({ required: !field.required })}
              className={`
                flex items-center gap-3 px-4 py-3 border-4 border-neo-border font-bold text-sm uppercase text-neo-fg
                transition-all duration-100
                ${field.required 
                  ? 'bg-neo-accent shadow-[4px_4px_0px_0px_var(--color-neo-shadow)]' 
                  : 'bg-neo-bg-alt shadow-[2px_2px_0px_0px_var(--color-neo-shadow)] hover:bg-neo-muted'
                }
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              `}
            >
              <span className="w-5 h-5 border-4 border-neo-border flex items-center justify-center bg-neo-bg-alt">
                {field.required && <span className="font-black text-sm text-neo-fg">✓</span>}
              </span>
              必填字段
            </button>
          </div>

          {/* 选项管理 - 仅 select 和 multi_select */}
          {(field.type === 'select' || field.type === 'multi_select') && (
            <div className="pt-4 border-t-4 border-neo-border/20">
              <label className="block text-xs font-bold uppercase tracking-wide text-neo-fg-muted mb-2">
                可选项
              </label>
              
              {/* 已有选项 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {(field.options || []).map((opt) => (
                  <OptionTag
                    key={opt}
                    label={opt}
                    onRemove={() => removeOption(opt)}
                  />
                ))}
                {(!field.options || field.options.length === 0) && (
                  <span className="text-sm text-neo-fg-muted font-bold">暂无选项</span>
                )}
              </div>

              {/* 添加新选项 */}
              <AddOptionInput onAdd={addOption} />

              {/* 允许新增选项 */}
              <div className="mt-3">
                <button
                  onClick={() => onUpdate({ allow_new: !field.allow_new })}
                  className={`
                    flex items-center gap-3 px-4 py-2 border-4 border-neo-border font-bold text-xs uppercase text-neo-fg
                    transition-all duration-100
                    ${field.allow_new 
                      ? 'bg-neo-muted shadow-[3px_3px_0px_0px_var(--color-neo-shadow)]' 
                      : 'bg-neo-bg-alt shadow-[2px_2px_0px_0px_var(--color-neo-shadow)] hover:bg-neo-secondary'
                    }
                    active:translate-x-px active:translate-y-px active:shadow-none
                  `}
                >
                  <span className="w-4 h-4 border-3 border-neo-border flex items-center justify-center bg-neo-bg-alt">
                    {field.allow_new && <span className="font-black text-xs text-neo-fg">✓</span>}
                  </span>
                  允许用户创建新选项
                </button>
              </div>
            </div>
          )}

          {/* 删除按钮 */}
          <div className="pt-4 border-t-4 border-neo-border/20">
            <button
              onClick={onRemove}
              className="px-4 py-2 border-4 border-neo-border bg-neo-bg-alt font-bold text-sm uppercase text-neo-accent
                shadow-[2px_2px_0px_0px_var(--color-neo-shadow)]
                hover:bg-neo-accent hover:text-neo-fg transition-all duration-100
                active:translate-x-px active:translate-y-px active:shadow-none"
            >
              🗑 删除此字段
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigEditor() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chat_id');
  
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    if (chatId) {
      fetch(`/api/config?chat_id=${chatId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.fields) {
            setFields(data.fields);
          } else {
            // 默认初始配置
            setFields([
              { key: 'category', label: '分类', type: 'multi_select', options: ['动作', '剧情', '喜剧'], allow_new: true },
              { key: 'region', label: '地区', type: 'select', options: ['中国', '美国', '日本', '欧洲'] }
            ]);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [chatId]);

  const addField = () => {
    const newField: FieldConfig = { 
      key: `field_${Date.now()}`, 
      label: '新字段', 
      type: 'text',
      required: false 
    };
    setFields([...fields, newField]);
    setExpandedIndex(fields.length);
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const updateField = (index: number, updates: Partial<FieldConfig>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!chatId) return;
    setSaving(true);
    
    try {
      const config: ChatConfig = { fields };
      const res = await fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, config })
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      setSaveSuccess(true);
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          window.Telegram.WebApp.close();
        }
      }, 1000);
    } catch {
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-bg">
        <div className="px-8 py-4 border-4 border-neo-border bg-neo-secondary shadow-[8px_8px_0px_0px_var(--color-neo-shadow)] font-black text-xl uppercase animate-pulse text-neo-fg">
          Loading...
        </div>
      </div>
    );
  }

  if (saveSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-bg">
        <div className="px-8 py-4 border-4 border-neo-border bg-neo-success shadow-[8px_8px_0px_0px_var(--color-neo-shadow)] font-black text-2xl uppercase text-neo-fg">
          ✓ 已保存！
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-bg p-4 pb-28 neo-halftone-sm">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="inline-block px-4 py-2 border-4 border-neo-border bg-neo-fg text-neo-bg font-black text-xl uppercase tracking-tight shadow-[4px_4px_0px_0px_var(--color-neo-accent)] rotate-1">
          配置管理
        </h1>
        <p className="mt-3 font-bold text-sm text-neo-fg-muted">
          设置标签表单的字段和选项
        </p>
      </div>
      
      {/* 字段列表 */}
      <div className="space-y-4">
        {fields.map((field, idx) => (
          <FieldCard
            key={field.key}
            field={field}
            index={idx}
            onUpdate={(updates) => updateField(idx, updates)}
            onRemove={() => removeField(idx)}
            isExpanded={expandedIndex === idx}
            onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
          />
        ))}
        
        {/* 添加字段按钮 */}
        <button 
          onClick={addField}
          className="w-full py-4 border-4 border-dashed border-neo-border bg-neo-bg-alt font-black text-base uppercase text-neo-fg
            hover:bg-neo-muted hover:border-solid transition-all duration-100
            active:translate-y-[2px]"
        >
          + 添加新字段
        </button>
      </div>

      {/* 底部保存按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-neo-bg border-t-4 border-neo-border">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 border-4 border-neo-border bg-neo-accent font-black text-lg uppercase text-neo-fg
              shadow-[6px_6px_0px_0px_var(--color-neo-shadow)]
              hover:bg-neo-accent-hover transition-all duration-100
              active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
              disabled:opacity-50"
          >
            {saving ? '保存中...' : '💾 保存配置'}
          </button>
        </div>
      </div>
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
      <ConfigEditor />
    </Suspense>
  );
}
