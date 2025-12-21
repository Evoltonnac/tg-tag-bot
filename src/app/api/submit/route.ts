import { Bot } from 'grammy';
import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { ChatConfig } from '@/lib/types';
import { generateNeoBrutalTagBlock, removeTagBlockSmart, msgTagSuccess } from '@/lib/messages';

export const runtime = 'edge';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

const bot = new Bot(token);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, messageId, tags, privateChatId, userMsgId, botMsgId, channelUsername } = body; 
    // tags is Record<string, string> (Key -> Value)

    if (!chatId || !messageId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Get Config
    const config = await kv.get<ChatConfig>(`config:${chatId}`);
    if (!config) {
        return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    // 2. Fetch Original Message (via Copy/Forward trick) to get current caption
    // We need the *latest* caption to preserve it.
    // Since we don't have it, we use the same trick as Get Message Data:
    // Forward to a temp location (User Private Chat if available, or just blind update?)
    // If we blind update, we lose the original text if we don't know it.
    // WE MUST KNOW IT.
    
    // However, if we assume the `tag-form` page *already* fetched it to show the form,
    // maybe we should have passed the `originalCaption` from the client?
    // The client fetched it in `get-message-data`.
    // Let's rely on the client passing the *clean* caption back? 
    // OR we just fetch it again here to be safe/secure.
    
    // If we rely on client, it's faster but less secure (client could tamper text).
    // But since this is a utility bot, tampering text isn't a huge security risk (just messes up the channel post).
    // Let's try to fetch it again using the `privateChatId` if available (from previous logic) or just fail?
    // Actually, we can just use `copyMessage` to a dummy chat ID? No.
    
    // Better approach:
    // We assume the Bot is Admin in the Channel.
    // Does `editMessageCaption` allow us to *read* the old caption? No.
    
    // We WILL rely on the CLIENT to pass the `original_caption` (or we fetch it if we can).
    // BUT since we just implemented `get-message-data` which forwards to user, we can do that again here?
    // Or just ask client to send it.
    // Let's ask client to send `originalCaption` (snapshot when form opened).
    // It's not perfect (race condition if edited in between), but acceptable for this tool.
    
    // Wait, the User Query said: "编辑时按照文本-实例-文本的流程来".
    // "Text - Instance - Text"?
    // "Text - Entity - Text"?
    // Probably means: Read Text -> Parse Entity -> Edit Text.
    
    // Let's assume for now we need to fetch it.
    // We can use the same forward trick if we have a target.
    // The client should send `userId` (from initData).
    
    // Refined:
    // 1. Client sends `userId`.
    // 2. Server forwards message to `userId` to read caption.
    // 3. Server edits message.
    // 4. Server deletes forward.
    
    // Let's use `body.userId` (which we should add to client submit).
    
    let currentCaption = '';
    
    // TEMPORARY: If client sends caption, use it? 
    // No, let's fetch it to be robust against huge text payloads or truncation.
    // We need a userId to forward to.
    
    // If we don't have userId, we are stuck.
    // But wait, `editMessageCaption` keeps the media.
    // If we only send `caption` field, it replaces the old one.
    
    // Let's try to get it via forward.
    // We need a destination.
    // We can use the `privateChatId` if passed (legacy logic?), or just require `userId`.
    
    // Let's modify client to pass `userId` (it already has it from initData).
    const userId = body.userId || privateChatId; // Fallback
    
    if (userId) {
        try {
            const forwarded = await bot.api.forwardMessage(userId, chatId, parseInt(messageId));
            currentCaption = forwarded.caption || forwarded.text || '';
            await bot.api.deleteMessage(userId, forwarded.message_id).catch(() => {});
        } catch (e) {
            console.error('Failed to fetch original message', e);
            // If fetch fails, we might be in trouble. 
            // Return error? Or try to use client provided caption if we add it?
            return NextResponse.json({ error: 'Failed to fetch original message' }, { status: 500 });
        }
    } else {
         // Without userId, we can't fetch.
         return NextResponse.json({ error: 'Missing userId for verification' }, { status: 400 });
    }

    // 3. Clean and Rebuild
    const cleanCaption = removeTagBlockSmart(currentCaption);
    
    // Update Dynamic Options
    let configUpdated = false;
    for (const field of config.fields) {
        if (field.allow_new && field.options && tags[field.key]) {
             const val = tags[field.key];
             // Simple check: if not in options, add it
             // Note: Split if multi-select/tags? 
             // For now assume exact match or simple string
             if (!field.options.includes(val)) {
                 field.options.push(val);
                 configUpdated = true;
             }
        }
    }
    if (configUpdated) await kv.set(`config:${chatId}`, config);

    // Generate Block
    const tagBlock = generateNeoBrutalTagBlock(tags, config.fields);
    const newCaption = `${cleanCaption}${tagBlock}`;

    // 4. Update Telegram Message
    try {
        await bot.api.editMessageCaption(chatId, parseInt(messageId), {
            caption: newCaption,
        });
    } catch (e) {
        console.error('Failed to edit caption:', e);
        return NextResponse.json({ error: 'Failed to update caption' }, { status: 500 });
    }
    
    // 5. Cleanup Private Chat (if initiated from there)
    if (privateChatId && userMsgId && botMsgId) {
        try {
            // Delete User's Forward
            await bot.api.deleteMessage(privateChatId, parseInt(userMsgId)).catch(e => console.error('Delete user msg failed:', e));
            // Delete Bot's Reply
            await bot.api.deleteMessage(privateChatId, parseInt(botMsgId)).catch(e => console.error('Delete bot msg failed:', e));

            // Send Summary
            // Link construction
            let sourceLink = '';
            if (channelUsername) {
                sourceLink = `https://t.me/${channelUsername}/${messageId}`;
            } else {
                // Private channel ID logic: -100123 -> 123
                const cleanId = String(chatId).replace(/^-100/, '');
                sourceLink = `https://t.me/c/${cleanId}/${messageId}`;
            }

            // Summary Text
            const summaryText = cleanCaption || '';
            const notification = msgTagSuccess(summaryText);
            
            const summaryKeyboard = {
                inline_keyboard: [[
                    { text: '🔗 VIEW', url: sourceLink }
                ]]
            };

            await bot.api.sendMessage(privateChatId, notification, {
                parse_mode: 'HTML',
                reply_markup: summaryKeyboard
            });

        } catch (cleanupError) {
            console.error('Cleanup Error:', cleanupError);
            // Don't fail the request if cleanup fails
        }
    }

    // 6. Update Markup (Button) - Optional if we want to change it back
    // ...
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
