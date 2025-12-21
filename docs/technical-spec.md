# 技术方案文档 (Technical Specification)

本文档详细说明了 Telegram 频道媒体打标机器人的底层实现细节、架构设计及 API 规范，供后续开发人员和 AI 阅读。

---

## 1. 技术架构

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel Platform                       │
├─────────────────────────────────────────────────────────────┤
│  Next.js 16 (App Router, Edge Runtime)                       │
│  ├── /api/bot      → Telegram Webhook 处理                  │
│  ├── /api/config   → 配置读取 API                           │
│  ├── /api/submit   → 表单提交 API                           │
│  └── /tag-form     → Web App 前端页面                       │
├─────────────────────────────────────────────────────────────┤
│  Vercel KV (Redis)                                           │
│  └── 存储 chat 配置与临时 caption 数据                       │
├─────────────────────────────────────────────────────────────┤
│  grammY                                                      │
│  └── Telegram Bot Framework                                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心组件说明

- ** grammY**: 负责处理 Telegram 协议层，采用 webhook 模式运行在 Vercel Edge Functions 上，确保极速响应。
- **Vercel KV**: 无服务器 Redis，用于持久化存储频道配置（`config:{chat_id}`）和短期存储消息原始内容（`caption:{chat_id}:{message_id}`）。
- **Telegram Web App**: 在 Telegram 客户端内弹出的 Web 页面，提供比普通按钮更复杂的交互。

---

## 2. 数据结构

### 2.1 KV 存储设计

| Key 模式 | Value 类型 | TTL | 说明 |
|----------|------------|-----|------|
| `config:{chat_id}` | `ChatConfig` JSON | 永久 | 频道的字段配置 |
| `caption:{chat_id}:{message_id}` | `string` | 24h | 原始 Caption 缓存，防止打标时丢失原有说明 |

### 2.2 TypeScript 类型定义

```typescript
// src/lib/types.ts

interface FieldConfig {
  key: string;           // 字段唯一标识
  label: string;         // 显示标签
  type: 'text' | 'select' | 'multi_select';
  options?: string[];    // select 类型的选项列表
  allow_new?: boolean;   // 是否允许新增选项
  required?: boolean;    // 是否必填
}

interface ChatConfig {
  fields: FieldConfig[];
  dynamic_options?: Record<string, string[]>; // 动态选项存储
}
```

---

## 3. API 设计

### 3.1 POST /api/bot (Webhook)
处理 Telegram 事件：
1. `/config`：管理员在频道/群组中发送，触发 deep link 跳转到私聊，再打开 Web App 配置页面。
2. `/start <payload>`：处理 deep link 参数，支持 `config_<chat_id>` 打开配置页和 `tag_<chat_id>_<message_id>` 打开打标页。
3. `channel_post`：监听到消息时，检查 KV 中是否存在配置，若存在则添加 deep link 按钮引导用户私聊打标。
4. `forward_origin`：在私聊中监听转发消息，检测是否来自已配置频道并自动解析标签。

### 3.2 GET /api/config
由 Web App 调用。参数 `chat_id`。
返回该频道的表单字段定义，用于动态渲染 UI。

### 3.3 POST /api/submit
由 Web App 在用户点击"提交"后调用。
**Payload**: `{ chatId, messageId, tags: Record<string, string>, userId, privateChatId?, userMsgId?, botMsgId?, channelUsername? }`
**逻辑**: 
- 通过 `forwardMessage` 获取最新消息内容。
- 使用 `removeTagBlock` 清理旧标签，使用 `generateTagBlock` 生成新标签块。
- 执行 `editMessageCaption` 更新 Telegram 消息内容。
- 清理私聊中的临时消息并发送成功通知。

---

## 4. 业务流程 (Sequence Diagram)

### 4.1 自动打标全流程

```
管理员         Telegram          Bot API           Web App         /api/submit
  │               │                 │                 │                 │
  │ 发送媒体       │                 │                 │                 │
  │──────────────>│ webhook         │                 │                 │
  │               │────────────────>│                 │                 │
  │               │                 │ 检测有配置       │                 │
  │               │                 │ 缓存原 caption   │                 │
  │               │                 │ 添加 WebApp 按钮 │                 │
  │               │<────────────────│                 │                 │
  │               │                 │                 │                 │
  │ 点击按钮       │                 │                 │                 │
  │──────────────>│ 打开 WebApp     │                 │                 │
  │               │────────────────────────────────>│                 │
  │               │                 │                 │ GET /api/config │
  │               │                 │                 │────────────────>│
  │               │                 │                 │<────────────────│
  │               │                 │                 │ 渲染表单         │
  │               │                 │                 │                 │
  │ 填写并提交     │                 │                 │ POST tags       │
  │──────────────>│                 │                 │────────────────>│
  │               │                 │                 │                 │
  │               │                 │ editCaption     │                 │
  │               │<────────────────────────────────────────────────────│
  │               │                 │ removeMarkup    │                 │
  │               │<────────────────────────────────────────────────────│
  │               │                 │                 │                 │
  │               │ WebApp.close()  │                 │                 │
  │<──────────────│                 │                 │                 │
```

---

## 5. 前端实现细节 (Web App)

### 5.1 标签转换引擎
在 `src/app/tag-form/page.tsx` 中实现的转换规则：
- **Normal Text/Select**: 自动检查是否有重复 prefix，若无则根据配置补齐。
- **Tags Type**: 支持空格、逗号分割输入，自动拆分为多个独立标签。

---

## 6. 扩展方向 (Roadmap)
- ✅ **配置 UI**: 已实现 `/config-form` 页面，管理员可通过可视化界面配置字段。
- ✅ **消息自毁**: 打标完成后自动清理私聊中的临时消息，并发送带源消息链接的成功通知。
- **多语言支持**: 表单支持根据用户客户端语言显示。
- **媒体集支持**: 处理 Telegram 的 Media Group（图组）。

