'use client';

import { useState } from 'react';

// 快捷链接卡片组件
function LinkCard({
  title,
  description,
  href,
  icon,
  color = 'bg-white',
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
        block p-5 border-4 border-black ${color}
        shadow-[6px_6px_0px_0px_#000]
        hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000]
        transition-all duration-200
        active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
      `}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <h3 className="font-black text-lg uppercase tracking-tight">{title}</h3>
          <p className="mt-1 text-sm font-bold text-black/70">{description}</p>
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
    <div className="p-5 border-4 border-black bg-white shadow-[4px_4px_0px_0px_#000]">
      <div className="w-12 h-12 flex items-center justify-center border-4 border-black bg-[#FFD93D] font-black text-2xl mb-3">
        {icon}
      </div>
      <h3 className="font-black text-base uppercase tracking-tight">{title}</h3>
      <p className="mt-2 text-sm font-bold text-black/70 leading-relaxed">{description}</p>
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
      <div className="w-full max-w-md border-4 border-black bg-[#FFFDF5] shadow-[12px_12px_0px_0px_#000]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#FF6B6B] border-b-4 border-black">
          <h2 className="font-black text-xl uppercase tracking-tight">设置 Webhook</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-4 border-black bg-white font-black hover:bg-[#FFD93D] transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm font-bold text-black/80">
            点击按钮将当前域名设置为 Telegram Bot 的 Webhook 地址。
            如果开启了 Vercel 保护，需要填入 bypass secret。
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-black/80 mb-1">
              Bypass Secret (可选)
            </label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="VERCEL_AUTOMATION_BYPASS_SECRET"
              className="w-full px-3 py-3 border-4 border-black font-bold text-sm bg-white
                placeholder:text-black/40
                focus:bg-[#FFD93D] focus:shadow-[4px_4px_0px_0px_#000] focus:outline-none"
            />
          </div>

          {status !== 'idle' && (
            <div
              className={`p-3 border-4 border-black font-bold text-sm ${
                status === 'success'
                  ? 'bg-[#4ADE80]'
                  : status === 'error'
                  ? 'bg-[#FF6B6B]'
                  : 'bg-[#FFD93D]'
              }`}
            >
              {status === 'loading' ? '设置中...' : message}
            </div>
          )}

          <button
            onClick={handleSetWebhook}
            disabled={status === 'loading'}
            className="w-full py-4 border-4 border-black bg-[#C4B5FD] font-black text-base uppercase
              shadow-[4px_4px_0px_0px_#000]
              hover:bg-[#A78BFA] transition-all duration-100
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
    <div
      className="min-h-screen bg-[#FFFDF5]"
      style={{
        backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Hero Section */}
      <header className="relative overflow-hidden border-b-4 border-black bg-[#FFD93D]">
        {/* 装饰元素 */}
        <div className="absolute top-4 right-4 w-16 h-16 border-4 border-black bg-[#FF6B6B] rotate-12 hidden sm:block" />
        <div className="absolute bottom-8 right-20 w-10 h-10 border-4 border-black bg-[#C4B5FD] -rotate-6 hidden sm:block" />
        
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
          <div className="inline-block px-4 py-2 border-4 border-black bg-black text-white font-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_#FF6B6B] rotate-1 mb-6">
            Telegram Bot
          </div>
          
          <h1 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter leading-none">
            <span className="block">Tag</span>
            <span className="block text-[#FF6B6B]" style={{ WebkitTextStroke: '3px black', WebkitTextFillColor: '#FF6B6B' }}>
              Bot
            </span>
          </h1>
          
          <p className="mt-6 max-w-lg text-lg sm:text-xl font-bold leading-relaxed">
            为 Telegram 频道/群组消息自动添加标签的机器人。
            支持自定义字段、多选标签、可视化配置。
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => setWebhookModalOpen(true)}
              className="px-6 py-4 border-4 border-black bg-[#FF6B6B] font-black text-base uppercase
                shadow-[6px_6px_0px_0px_#000]
                hover:bg-[#FF8080] transition-all duration-100
                active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              ⚡ 快速设置
            </button>
            <a
              href="https://t.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-4 border-4 border-black bg-white font-black text-base uppercase
                shadow-[6px_6px_0px_0px_#000]
                hover:bg-[#C4B5FD] transition-all duration-100
                active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              📱 打开 Telegram
            </a>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="inline-block px-4 py-2 border-4 border-black bg-black text-white font-black text-lg uppercase tracking-tight shadow-[4px_4px_0px_0px_#C4B5FD] -rotate-1 mb-8">
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
        <h2 className="inline-block px-4 py-2 border-4 border-black bg-[#FF6B6B] font-black text-lg uppercase tracking-tight shadow-[4px_4px_0px_0px_#000] rotate-1 mb-8">
          快捷链接
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div
            onClick={() => setWebhookModalOpen(true)}
            className="cursor-pointer block p-5 border-4 border-black bg-[#C4B5FD]
              shadow-[6px_6px_0px_0px_#000]
              hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000]
              transition-all duration-200
              active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">🔗</span>
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight">设置 Webhook</h3>
                <p className="mt-1 text-sm font-bold text-black/70">将当前域名注册为 Bot 的 Webhook</p>
              </div>
            </div>
          </div>

          <LinkCard
            icon="🤖"
            title="Bot API"
            description="检查 Bot 运行状态"
            href="/api/bot"
            color="bg-white"
          />

          <LinkCard
            icon="📖"
            title="使用指南"
            description="完整的使用说明和 API 文档"
            href="https://core.telegram.org/bots/api"
            color="bg-[#FFD93D]"
            external
          />

          <LinkCard
            icon="💻"
            title="GitHub"
            description="查看源代码和提交 Issue"
            href="https://github.com"
            color="bg-white"
            external
          />
        </div>
      </section>

      {/* How to Use Section */}
      <section className="border-t-4 border-black bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="inline-block px-4 py-2 border-4 border-white bg-[#FFD93D] text-black font-black text-lg uppercase tracking-tight shadow-[4px_4px_0px_0px_#FF6B6B] -rotate-1 mb-8">
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
                <span className="flex-shrink-0 w-10 h-10 flex items-center justify-center border-4 border-white bg-[#FF6B6B] font-black text-lg text-black">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-black text-base uppercase">{item.title}</h3>
                  <p className="mt-1 text-sm font-bold text-white/70">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-[#FFD93D] py-6">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="font-black text-sm uppercase tracking-wide">
            Built with Next.js + grammY + Vercel KV
          </p>
        </div>
      </footer>

      {/* Modal */}
      <WebhookModal isOpen={webhookModalOpen} onClose={() => setWebhookModalOpen(false)} />
    </div>
  );
}
