import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { ChatConfig } from '@/lib/types';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chat_id');

  if (!chatId) {
    return NextResponse.json({ error: 'Missing chat_id' }, { status: 400 });
  }

  try {
    const config = await kv.get<ChatConfig>(`config:${chatId}`);
    if (!config) {
      return NextResponse.json({ error: 'Config not found for this chat' }, { status: 404 });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Failed to get config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

