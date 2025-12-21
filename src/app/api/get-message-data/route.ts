import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { ChatConfig } from '@/lib/types';

export const runtime = 'edge';

/**
 * 简化后的 API：只获取 config
 * 标签解析已经在 bot webhook 中完成，通过 URL 参数传入
 */
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
