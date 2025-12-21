import { Bot, webhookCallback, InlineKeyboard } from 'grammy';
import { kv } from '@vercel/kv';
import { ChatConfig } from '@/lib/types';
import { parseTagBlockSmart } from '@/lib/messages';
import {
  MSG_WELCOME,
  MSG_CONFIG_PROMPT,
  msgConfigEntry,
  MSG_TAG_PREPARING,
  MSG_TAG_READY,
  MSG_FORWARD_DETECTED,
  MSG_ERR_NOT_ADMIN,
  MSG_ERR_VERIFY_FAILED,
  MSG_ERR_MESSAGE_NOT_FOUND,
  MSG_ERR_INVALID_PARAM,
  MSG_ERR_WRONG_CHAT,
} from '@/lib/messages';

export const runtime = 'edge';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

const bot = new Bot(token);

// 存储当前请求的 origin（用于在同一请求中被 bot handler 访问）
let currentRequestOrigin = '';

// Utility: Build Web App URL
function getWebAppUrl(path: string, params: Record<string, string | number>) {
  // 优先使用请求中的 origin，然后是环境变量
  const baseUrl = currentRequestOrigin || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://localhost:3000');
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => searchParams.append(key, String(value)));
  return `${baseUrl}/${path}?${searchParams.toString()}`;
}

// 1. Config Command (Triggered in Channel via channel_post)
// Note: bot.command() only handles messages, not channel_posts
bot.on('channel_post:text', async (ctx, next) => {
  const text = ctx.msg.text || '';
  if (!text.startsWith('/config')) {
    return next();
  }

  // In channels, only admins can post, so no need to check admin status
  const botUsername = ctx.me.username;
  const deepLinkPayload = `config_${ctx.chat.id}`;
  const deepLinkUrl = `https://t.me/${botUsername}?start=${deepLinkPayload}`;
  
  const keyboard = new InlineKeyboard().url('⚙️ CONFIGURE', deepLinkUrl);
  
  await ctx.reply(MSG_CONFIG_PROMPT, { reply_markup: keyboard, parse_mode: 'HTML' });
});

// Config command in groups (not channels)
bot.command('config', async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply(MSG_ERR_WRONG_CHAT, { parse_mode: 'HTML' });
  }

  // Check admin for groups
  const author = await ctx.getAuthor();
  if (author.status !== 'administrator' && author.status !== 'creator') {
    return ctx.reply(MSG_ERR_NOT_ADMIN, { parse_mode: 'HTML' });
  }

  const botUsername = ctx.me.username;
  const deepLinkPayload = `config_${ctx.chat.id}`;
  const deepLinkUrl = `https://t.me/${botUsername}?start=${deepLinkPayload}`;
  
  const keyboard = new InlineKeyboard().url('⚙️ CONFIGURE', deepLinkUrl);
  
  await ctx.reply(MSG_CONFIG_PROMPT, { reply_markup: keyboard, parse_mode: 'HTML' });
});

// 2. Start Command (Deep Linking)
bot.command('start', async (ctx) => {
  const payload = ctx.match;
  if (!payload) {
    return ctx.reply(MSG_WELCOME, { parse_mode: 'HTML' });
  }

  // Handle Config Deep Link: config_-100123456
  const configMatch = payload.match(/^config_(-?\d+)$/);
  if (configMatch) {
    const [, channelId] = configMatch;
    
    try {
      const member = await ctx.api.getChatMember(channelId, ctx.from!.id);
      if (member.status !== 'administrator' && member.status !== 'creator') {
        return ctx.reply(MSG_ERR_NOT_ADMIN, { parse_mode: 'HTML' });
      }

      const appUrl = getWebAppUrl('config-form', { chat_id: channelId });
      const keyboard = new InlineKeyboard().webApp('⚙️ OPEN CONFIG', appUrl);
      
      return ctx.reply(msgConfigEntry(channelId), { reply_markup: keyboard, parse_mode: 'HTML' });
    } catch (e) {
      console.error('Check admin error:', e);
      return ctx.reply(MSG_ERR_VERIFY_FAILED, { parse_mode: 'HTML' });
    }
  }

  // Handle Tag Deep Link: tag_-100123456_123
  const tagMatch = payload.match(/^tag_(-?\d+)_(\d+)$/);
  if (tagMatch) {
    const [, channelId, messageId] = tagMatch;
    
    try {
      // Use copyMessage instead of forwardMessage to avoid copying the InlineKeyboard buttons
      // copyMessage sends a clean copy without reply_markup
      const copyMsg = await ctx.api.copyMessage(ctx.chat.id, channelId, parseInt(messageId));
      
      const replyMsg = await ctx.reply(MSG_TAG_PREPARING, { parse_mode: 'HTML' });

      const appUrlParams: Record<string, string | number> = { 
        chat_id: channelId, 
        message_id: messageId,
        private_chat_id: ctx.chat.id,
        user_msg_id: copyMsg.message_id,
        bot_msg_id: replyMsg.message_id
      };

      // Try to get channel username for better link
      try {
        const chat = await ctx.api.getChat(channelId);
        if ('username' in chat && chat.username) {
            appUrlParams.channel_username = chat.username;
        }
      } catch (e) {
        console.warn('Failed to get chat info for username:', e);
      }

      const appUrl = getWebAppUrl('tag-form', appUrlParams);
      const keyboard = new InlineKeyboard().webApp('🏷️ START TAGGING', appUrl);
      
      await ctx.api.editMessageText(ctx.chat.id, replyMsg.message_id, MSG_TAG_READY, { reply_markup: keyboard, parse_mode: 'HTML' });
    } catch (error) {
      console.error('Deep link handling error:', error);
      await ctx.reply(MSG_ERR_MESSAGE_NOT_FOUND, { parse_mode: 'HTML' });
    }
    return;
  }

  await ctx.reply(MSG_ERR_INVALID_PARAM, { parse_mode: 'HTML' });
});

// 3. Handle Forwarded Messages (User forwards channel post to Bot)
bot.on('message', async (ctx) => {
    // Only handle private chats
    if (ctx.chat.type !== 'private') return;

    // Check if forwarded
    const origin = ctx.msg.forward_origin;
    if (origin && origin.type === 'channel') {
        const channelId = origin.chat.id;
        const messageId = origin.message_id;

        // Check if we have config for this channel
        const config = await kv.get<ChatConfig>(`config:${channelId}`);
        if (config) {
            // 获取转发消息的内容并解析标签
            const caption = ctx.msg.caption || ctx.msg.text || '';
            const parsedTags = parseTagBlockSmart(caption, config.fields);

            // Trigger tagging flow
            // First reply to get the bot message ID (context for deletion later)
            const replyMsg = await ctx.reply(MSG_TAG_PREPARING, { parse_mode: 'HTML' });
            
            const appUrlParams: Record<string, string | number> = { 
              chat_id: channelId, 
              message_id: messageId,
              private_chat_id: ctx.chat.id,
              user_msg_id: ctx.msg.message_id,
              bot_msg_id: replyMsg.message_id,
              tags: encodeURIComponent(JSON.stringify(parsedTags))
            };
            
            if ('username' in origin.chat && origin.chat.username) {
              appUrlParams.channel_username = origin.chat.username;
            }

            const appUrl = getWebAppUrl('tag-form', appUrlParams);
            const keyboard = new InlineKeyboard().webApp('🏷️ START TAGGING', appUrl);
            
            // Edit the message to add the button
            return ctx.api.editMessageText(ctx.chat.id, replyMsg.message_id, MSG_FORWARD_DETECTED, { reply_markup: keyboard, parse_mode: 'HTML' });
        }
    }
});

// 4. Channel Post Handler (Auto-tagging prompt in channel)
bot.on(['channel_post:photo', 'channel_post:video', 'channel_post:document', 'channel_post:text'], async (ctx) => {
  const chat = ctx.chat;
  const messageId = ctx.msg.message_id;

  const config = await kv.get<ChatConfig>(`config:${chat.id}`);
  if (!config) return;

  // 构建 deep link
  const botUsername = ctx.me.username;
  const deepLinkPayload = `tag_${chat.id}_${messageId}`;
  const deepLinkUrl = `https://t.me/${botUsername}?start=${deepLinkPayload}`;

  const keyboard = new InlineKeyboard().url('🏷️ EDIT TAGS', deepLinkUrl);
  
  try {
    await ctx.api.editMessageReplyMarkup(chat.id, messageId, {
      reply_markup: keyboard,
    });
  } catch (e) {
    console.error('Failed to add button to channel post:', e);
  }
});

// 包装 webhookCallback 以在处理前设置当前请求的 origin
const handleWebhook = webhookCallback(bot, 'std/http');

export async function POST(req: Request) {
  // 从请求中获取 origin 并设置，供 getWebAppUrl 使用
  const url = new URL(req.url);
  currentRequestOrigin = url.origin;
  
  return handleWebhook(req);
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    if (url.searchParams.get('webhook') === 'set') {
      let webhookUrl = `${url.origin}/api/bot`;
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
      // 生产环境只使用用户显式提供的 secret，避免泄漏
      // 非生产环境可以自动读取环境变量
      const secret = isProduction 
        ? url.searchParams.get('secret') 
        : (url.searchParams.get('secret') || process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
      if (secret) {
        webhookUrl += `?x-vercel-protection-bypass=${secret}`;
      }
      await bot.api.setWebhook(webhookUrl);
      // 不在响应中暴露完整 URL，避免泄漏 secret
      return new Response(`Webhook set to ${url.origin}/api/bot${secret ? ' (with bypass secret)' : ''}`, { status: 200 });
    }
    return new Response('Bot is running', { status: 200 });
}
