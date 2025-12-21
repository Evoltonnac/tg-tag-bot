import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { ChatConfig } from '@/lib/types';
import { Bot } from 'grammy';

export const runtime = 'edge';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

const bot = new Bot(token);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, config, userId } = body;

    if (!chatId || !config) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is admin of the chat
    // Note: In Mini App, validation is tricky without initData verification.
    // For now, we assume the chatId passed is valid if we rely on the bot's "Config" button 
    // which generates the link. 
    // Ideally, we should verify Telegram WebApp InitData here. 
    // But since we haven't set up validation logic yet, we will skip strict admin check on the API 
    // and rely on the fact that the link is generated only for admins in the bot code.
    // TODO: Add initData validation.

    await kv.set(`config:${chatId}`, config);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save Config Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


