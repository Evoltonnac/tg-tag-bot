'use client';

import { useState } from 'react';

// 快捷链接卡片组件
function LinkCard({
  title,
  description,
  href,
  icon,
  color = 'bg-neo-bg-alt',
  external = false,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  color?: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={`
        block p-5 border-4 border-neo-border ${color}
        shadow-[6px_6px_0px_0px_var(--color-neo-shadow)]
        hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-neo-shadow)]
        transition-all duration-200
        active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
      `}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <h3 className="font-black text-lg uppercase tracking-tight text-neo-fg">{title}</h3>
          <p className="mt-1 text-sm font-bold text-neo-fg-muted">{description}</p>
        </div>
      </div>
    </a>
  );
}

// 功能特性卡片
function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="p-5 border-4 border-neo-border bg-neo-bg-alt shadow-[4px_4px_0px_0px_var(--color-neo-shadow)]">
      <div className="w-12 h-12 flex items-center justify-center border-4 border-neo-border bg-neo-secondary font-black text-2xl mb-3 text-neo-fg">
        {icon}
      </div>
      <h3 className="font-black text-base uppercase tracking-tight text-neo-fg">{title}</h3>
      <p className="mt-2 text-sm font-bold text-neo-fg-muted leading-relaxed">{description}</p>
    </div>
  );
}

// Webhook 设置模态框
function WebhookModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [secret, setSecret] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSetWebhook = async () => {
    setStatus('loading');
    try {
      const params = new URLSearchParams({ webhook: 'set' });
      if (secret) params.append('secret', secret);
      
      const res = await fetch(`/api/bot?${params.toString()}`);
      const text = await res.text();
      
      if (res.ok) {
        setStatus('success');
        setMessage(text);
      } else {
        setStatus('error');
        setMessage(text || '设置失败');
      }
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : '网络错误');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md border-4 border-neo-border bg-neo-bg shadow-[12px_12px_0px_0px_var(--color-neo-shadow)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-neo-accent border-b-4 border-neo-border">
          <h2 className="font-black text-xl uppercase tracking-tight text-neo-fg">设置 Webhook</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-4 border-neo-border bg-neo-bg-alt font-black hover:bg-neo-secondary transition-colors text-neo-fg"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm font-bold text-neo-fg-muted">
            点击按钮将当前域名设置为 Telegram Bot 的 Webhook 地址。
            如果开启了 Vercel 保护，需要填入 bypass secret。
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-neo-fg-muted mb-1">
              Bypass Secret (可选)
            </label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="VERCEL_AUTOMATION_BYPASS_SECRET"
              className="w-full px-3 py-3 border-4 border-neo-border font-bold text-sm bg-neo-bg-alt text-neo-fg
                placeholder:text-neo-fg-muted
                focus:bg-neo-secondary focus:shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] focus:outline-none"
            />
          </div>

          {status !== 'idle' && (
            <div
              className={`p-3 border-4 border-neo-border font-bold text-sm text-neo-fg ${
                status === 'success'
                  ? 'bg-neo-success'
                  : status === 'error'
                  ? 'bg-neo-accent'
                  : 'bg-neo-secondary'
              }`}
            >
              {status === 'loading' ? '设置中...' : message}
            </div>
          )}

          <button
            onClick={handleSetWebhook}
            disabled={status === 'loading'}
            className="w-full py-4 border-4 border-neo-border bg-neo-muted font-black text-base uppercase text-neo-fg
              shadow-[4px_4px_0px_0px_var(--color-neo-shadow)]
              hover:bg-neo-muted-hover transition-all duration-100
              active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              disabled:opacity-50"
          >
            {status === 'loading' ? '请稍候...' : '🔗 设置 Webhook'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neo-bg neo-halftone">
      {/* Hero Section */}
      <header className="relative overflow-hidden border-b-4 border-neo-border bg-neo-secondary">
        {/* 装饰元素 */}
        <div className="absolute top-4 right-4 w-16 h-16 border-4 border-neo-border bg-neo-accent rotate-12 hidden sm:block" />
        <div className="absolute bottom-8 right-20 w-10 h-10 border-4 border-neo-border bg-neo-muted -rotate-6 hidden sm:block" />
        
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
          <div className="inline-block px-4 py-2 border-4 border-neo-border bg-neo-fg text-neo-bg font-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--color-neo-accent)] rotate-1 mb-6">
            Telegram Bot
          </div>
          
          <h1 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter leading-none text-neo-fg">
            <span className="block">Tag</span>
            <span className="block text-neo-accent" style={{ WebkitTextStroke: '3px var(--color-neo-border)' }}>
              Bot
            </span>
          </h1>
          
          <p className="mt-6 max-w-lg text-lg sm:text-xl font-bold leading-relaxed text-neo-fg">
            为 Telegram 频道/群组消息自动添加标签的机器人。
            支持自定义字段、多选标签、可视化配置。
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => setWebhookModalOpen(true)}
              className="px-6 py-4 border-4 border-neo-border bg-neo-accent font-black text-base uppercase text-neo-fg
                shadow-[6px_6px_0px_0px_var(--color-neo-shadow)]
                hover:bg-neo-accent-hover transition-all duration-100
                active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              ⚡ 快速设置
            </button>
            <a
              href={`https://t.me/${process.env.BOT_USERNAME || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-4 border-4 border-neo-border bg-neo-bg-alt font-black text-base uppercase text-neo-fg
                shadow-[6px_6px_0px_0px_var(--color-neo-shadow)]
                hover:bg-neo-muted transition-all duration-100
                active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              📱 私聊 Bot
            </a>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="inline-block px-4 py-2 border-4 border-neo-border bg-neo-fg text-neo-bg font-black text-lg uppercase tracking-tight shadow-[4px_4px_0px_0px_var(--color-neo-muted)] -rotate-1 mb-8">
          功能特性
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            icon="🏷️"
            title="自动打标"
            description="频道发布消息后自动添加打标按钮，点击即可快速添加标签"
          />
          <FeatureCard
            icon="⚙️"
            title="可视化配置"
            description="通过 Web App 界面配置字段类型、选项列表，无需手写 JSON"
          />
          <FeatureCard
            icon="📝"
            title="多字段类型"
            description="支持文本、单选、多选等字段类型，满足各种分类需求"
          />
          <FeatureCard
            icon="🔄"
            title="转发打标"
            description="转发频道消息到私聊，直接在私聊中完成打标操作"
          />
          <FeatureCard
            icon="☁️"
            title="Serverless"
            description="基于 Vercel Edge Functions，无需服务器，开箱即用"
          />
          <FeatureCard
            icon="🎨"
            title="保留原文"
            description="打标时保留原始 Caption，标签追加在末尾"
          />
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="inline-block px-4 py-2 border-4 border-neo-border bg-neo-accent font-black text-lg uppercase tracking-tight text-neo-fg shadow-[4px_4px_0px_0px_var(--color-neo-shadow)] rotate-1 mb-8">
          快捷链接
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div
            onClick={() => setWebhookModalOpen(true)}
            className="cursor-pointer block p-5 border-4 border-neo-border bg-neo-muted
              shadow-[6px_6px_0px_0px_var(--color-neo-shadow)]
              hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-neo-shadow)]
              transition-all duration-200
              active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">🔗</span>
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight text-neo-fg">设置 Webhook</h3>
                <p className="mt-1 text-sm font-bold text-neo-fg-muted">将当前域名注册为 Bot 的 Webhook</p>
              </div>
            </div>
          </div>

          <LinkCard
            icon="🤖"
            title="Bot API"
            description="检查 Bot 运行状态"
            href="/api/bot"
            color="bg-neo-bg-alt"
          />

          <LinkCard
            icon="📖"
            title="使用指南"
            description="完整的使用说明和 API 文档"
            href="https://core.telegram.org/bots/api"
            color="bg-neo-secondary"
            external
          />

          <LinkCard
            icon="💻"
            title="GitHub"
            description="查看源代码和提交 Issue"
            href="https://github.com"
            color="bg-neo-bg-alt"
            external
          />
        </div>
      </section>

      {/* How to Use Section */}
      <section className="border-t-4 border-neo-border bg-neo-fg">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="inline-block px-4 py-2 border-4 border-neo-bg bg-neo-secondary text-neo-fg font-black text-lg uppercase tracking-tight shadow-[4px_4px_0px_0px_var(--color-neo-accent)] -rotate-1 mb-8">
            快速开始
          </h2>

          <div className="space-y-6">
            {[
              { step: '1', title: '部署 Bot', desc: '将项目部署到 Vercel，设置环境变量 TELEGRAM_BOT_TOKEN' },
              { step: '2', title: '设置 Webhook', desc: '访问首页点击"快速设置"按钮配置 Webhook' },
              { step: '3', title: '添加到频道', desc: '将 Bot 添加到频道并设为管理员' },
              { step: '4', title: '初始化配置', desc: '在频道中发送 /config 命令，按提示配置标签字段' },
              { step: '5', title: '开始使用', desc: '发布消息后点击按钮进行打标，或转发消息到私聊打标' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <span className="shrink-0 w-10 h-10 flex items-center justify-center border-4 border-neo-bg bg-neo-accent font-black text-lg text-neo-fg">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-black text-base uppercase text-neo-bg">{item.title}</h3>
                  <p className="mt-1 text-sm font-bold text-neo-bg/70">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-neo-border bg-neo-secondary py-6">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="font-black text-sm uppercase tracking-wide text-neo-fg">
            Built with Next.js + grammY + Vercel KV
          </p>
        </div>
      </footer>

      {/* Modal */}
      <WebhookModal isOpen={webhookModalOpen} onClose={() => setWebhookModalOpen(false)} />
    </div>
  );
}
