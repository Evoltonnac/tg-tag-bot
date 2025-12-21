# Telegram 频道媒体打标机器人 (tg-tag-bot)

一个极简、无状态的 Telegram 频道媒体打标机器人。利用 Vercel KV 存储配置，Telegram Web App 进行交互，直接修改频道消息实现 Hashtag 管理。

> [!IMPORTANT]
> **开发人员/AI 请阅读**: [技术方案文档 (Technical Specification)](docs/technical-spec.md) 查看架构设计、API 定义及流程细节。

---

## 1. 简介

### 1.1 核心特性
- **无状态**: 不存储用户数据，仅存储群组配置。
- **动态表单**: 管理员通过 JSON 自定义表单字段，支持文本、单选、多标签。
- **无感更新**: 直接编辑原消息 Caption，不发送多余的消息，保持频道整洁。
- **零维护成本**: 运行在 Vercel Edge Runtime，按需触发。

---

## 2. 快速开始

### 2.1 配置频道

在频道/群组中将机器人设为管理员，并发送配置命令：

```text
/config
```

机器人会发送一个按钮，点击后跳转到私聊并打开可视化配置页面。

### 2.2 使用流程
1. 在频道发布图片、视频或文件。
2. 消息下方会出现「✍️ 去私聊打标」按钮。
3. 点击按钮跳转到私聊，再点击打开表单填写信息。
4. 提交后，标签将自动追加到消息底部，私聊中会显示成功通知及源消息链接。

**提示**: 也可以直接将频道消息转发给机器人，机器人会自动识别并提供打标入口。

---

## 3. 部署方案

### 3.1 环境变量
在 Vercel 或 `.env` 中配置以下变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `TELEGRAM_BOT_TOKEN` | Bot Token | `12345:ABC...` |
| `NEXT_PUBLIC_APP_URL` | 应用 URL | `https://your-app.vercel.app` |
| `KV_REST_API_URL` | Vercel KV URL | (自动注入) |
| `KV_REST_API_TOKEN` | Vercel KV Token | (自动注入) |

### 3.2 步骤
1. **创建 Bot**: 通过 [@BotFather](https://t.me/botfather) 创建并获取 Token。
2. **部署到 Vercel**: 关联 GitHub 仓库并添加 `Vercel KV` 存储。
3. **设置 Webhook**:
   ```bash
   curl "https://<YOUR_DOMAIN>/api/bot?webhook=set"
   ```

---

## 4. 常见问题 (FAQ)

**Q: 为什么按钮没有出现？**
A: 请确保：1. Bot 是该频道的管理员；2. 你已经发送过 `/config` 并完成配置；3. 发送的消息包含媒体（图片/视频/文件/文本）。

**Q: 原有的 Caption 会丢失吗？**
A: 不会。机器人会缓存原始文字并在打标时将其保留。

---

## License
MIT
