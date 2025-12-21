import { Bot, webhookCallback, InlineKeyboard } from 'grammy';
import { kv } from '@vercel/kv';
import { ChatConfig } from '@/lib/types';
import { parseTagBlock } from '@/lib/tag-utils';

export const runtime = 'edge';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

const bot = new Bot(token);

// Utility: Build Web App URL
function getWebAppUrl(path: string, params: Record<string, string | number>) {
  const host = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-domain.vercel.app');
  const baseUrl = host.startsWith('http') ? host : `https://${host}`;
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
  
  const keyboard = new InlineKeyboard().url('🛠️ 去私聊配置 / Configure', deepLinkUrl);
  
  await ctx.reply('请点击下方按钮前往私聊进行配置：', { reply_markup: keyboard });
});

// Config command in groups (not channels)
bot.command('config', async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('请在您想要配置的频道或群组中使用此命令。');
  }

  // Check admin for groups
  const author = await ctx.getAuthor();
  if (author.status !== 'administrator' && author.status !== 'creator') {
    return ctx.reply('只有管理员可以配置。');
  }

  const botUsername = ctx.me.username;
  const deepLinkPayload = `config_${ctx.chat.id}`;
  const deepLinkUrl = `https://t.me/${botUsername}?start=${deepLinkPayload}`;
  
  const keyboard = new InlineKeyboard().url('🛠️ 去私聊配置 / Configure', deepLinkUrl);
  
  await ctx.reply('请点击下方按钮前往私聊进行配置：', { reply_markup: keyboard });
});

// 2. Start Command (Deep Linking)
bot.command('start', async (ctx) => {
  const payload = ctx.match;
  if (!payload) {
    return ctx.reply('欢迎使用 Tag Bot！\n\n1. 将我加入频道并设为管理员\n2. 在频道中发送 /config 初始化配置\n3. 转发消息给我或直接在频道发布即可开始打标');
  }

  // Handle Config Deep Link: config_-100123456
  const configMatch = payload.match(/^config_(-?\d+)$/);
  if (configMatch) {
    const [, channelId] = configMatch;
    
    try {
      const member = await ctx.api.getChatMember(channelId, ctx.from!.id);
      if (member.status !== 'administrator' && member.status !== 'creator') {
        return ctx.reply('您不是该频道的管理员，无法配置。');
      }

      const appUrl = getWebAppUrl('config-form', { chat_id: channelId });
      const keyboard = new InlineKeyboard().webApp('🛠️ 打开配置页面 / Open Config', appUrl);
      
      return ctx.reply(`正在配置频道 (ID: ${channelId})，请点击下方按钮：`, { reply_markup: keyboard });
    } catch (e) {
      console.error('Check admin error:', e);
      return ctx.reply('无法验证您的管理员身份。请确保 Bot 在该频道中也是管理员。');
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
      
      const replyMsg = await ctx.reply('正在准备打标...');

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
      const keyboard = new InlineKeyboard().webApp('🏷️ 开始打标 / Start Tagging', appUrl);
      
      await ctx.api.editMessageText(ctx.chat.id, replyMsg.message_id, '请点击下方按钮对该消息进行打标：', { reply_markup: keyboard });
    } catch (error) {
      console.error('Deep link handling error:', error);
      await ctx.reply('无法获取原消息。可能是消息已被删除，或者 Bot 不是该频道的管理员。');
    }
    return;
  }

  await ctx.reply('无效的参数。');
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
            const parsedTags = parseTagBlock(caption, config.fields);

            // Trigger tagging flow
            // First reply to get the bot message ID (context for deletion later)
            const replyMsg = await ctx.reply('检测到来自已配置频道的消息。正在准备...');
            
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
            const keyboard = new InlineKeyboard().webApp('🏷️ 开始打标 / Start Tagging', appUrl);
            
            // Edit the message to add the button
            return ctx.api.editMessageText(ctx.chat.id, replyMsg.message_id, '检测到来自已配置频道的消息。点击下方按钮开始打标：', { reply_markup: keyboard });
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

  const keyboard = new InlineKeyboard().url('✍️ 去私聊打标 / Edit Tags', deepLinkUrl);
  
  try {
    await ctx.api.editMessageReplyMarkup(chat.id, messageId, {
      reply_markup: keyboard,
    });
  } catch (e) {
    console.error('Failed to add button to channel post:', e);
  }
});

export const POST = webhookCallback(bot, 'std/http');

export async function GET(req: Request) {
    const url = new URL(req.url);
    if (url.searchParams.get('webhook') === 'set') {
      let webhookUrl = `${url.origin}/api/bot`;
      const secret = url.searchParams.get('secret') || process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      if (secret) {
        webhookUrl += `?x-vercel-protection-bypass=${secret}`;
      }
      await bot.api.setWebhook(webhookUrl);
      return new Response(`Webhook set to ${webhookUrl}`, { status: 200 });
    }
    return new Response('Bot is running', { status: 200 });
}
