import { kv } from '@vercel/kv';
import { NextRequest } from 'next/server';
import { ChatConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30; // 停止请求应该很快完成

export async function POST(req: NextRequest) {
    const { chatId, taskId } = await req.json();
    
    if (!chatId || !taskId) {
        return new Response(JSON.stringify({ error: 'Missing chatId or taskId' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    const config = await kv.get<ChatConfig>(`config:${chatId}`);
    if (!config || !config.ai_config || !config.ai_config.enabled || !config.ai_config.dify_api_key) {
        return new Response(JSON.stringify({ error: 'AI not configured' }), { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    const aiConfig = config.ai_config;
    const baseUrl = (aiConfig.dify_base_url || 'https://api.dify.ai/v1').replace(/\/$/, '');

    try {
        // 调用 Dify 停止API
        const response = await fetch(`${baseUrl}/chat-messages/${taskId}/stop`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${aiConfig.dify_api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user: `tg-bot-${chatId}`,
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Dify Stop Error:', err);
            return new Response(JSON.stringify({ error: 'Dify Stop API Error: ' + err }), { 
                status: response.status, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        console.error('Stop request error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}

