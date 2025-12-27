import { kv } from '@vercel/kv';
import { NextRequest } from 'next/server';
import { ChatConfig } from '@/lib/types';
import { mockSseData, MOCK_SSE_DELAY } from '@/lib/mock-sse-data';

export const runtime = 'nodejs';
// Node.js Runtime 支持300秒超时（Vercel Serverless Function）
export const maxDuration = 300; // 5 分钟

// 通过环境变量或请求参数启用 mock 模式
const MOCK_SSE_ENABLED = process.env.MOCK_SSE === 'true';


export async function POST(req: NextRequest) {
    const { chatId, query, rawData, mock } = await req.json();
    
    // 如果启用了 mock 模式（环境变量或请求参数）
    if (MOCK_SSE_ENABLED || mock) {
        return createMockSseResponse();
    }

    if (!chatId) {
        return new Response(JSON.stringify({ error: 'Missing chatId' }), { 
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
    
    // Prepare Schema
    const schema = config.fields.map(f => ({
        key: f.key,
        label: f.label,
        type: f.type,
        options: f.options
    }));

    const inputs = {
        description: aiConfig.description || '',
        form_schema: JSON.stringify(schema),
        raw_data: rawData || ''
    };

    // 调用 Dify API
    const response = await fetch(`${baseUrl}/chat-messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${aiConfig.dify_api_key}`,
            'Content-Type': 'application/json'
        },
        signal: req.signal, // 添加AbortSignal支持
        body: JSON.stringify({
            inputs,
            query: query || 'auto-fill',
            response_mode: 'streaming',
            user: `tg-bot-${chatId}`,
        })
    });

    if (!response.ok) {
        // 检查是否是中断错误
        if (req.signal.aborted) {
            return new Response(JSON.stringify({ error: 'Request aborted by user' }), { 
                status: 499, // Client Closed Request
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        const err = await response.text();
        console.error('Dify Error:', err);
        return new Response(JSON.stringify({ error: 'Dify API Error: ' + err }), { 
            status: response.status, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 创建 TransformStream 转发 SSE 给前端，并添加心跳机制
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    let fullAnswer = '';
    let buffer = '';
    let isFinished = false;
    
    const transformStream = new TransformStream({
        async transform(chunk, controller) {
            // 检查请求是否已被中断
            if (req.signal.aborted) {
                controller.terminate();
                return;
            }
            
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留不完整的最后一行
            
            for (const line of lines) {
                // 处理注释行（心跳）- 直接转发，保持连接活跃
                if (line.startsWith(':')) {
                    controller.enqueue(encoder.encode(line + '\n\n'));
                    continue;
                }
                
                if (!line.startsWith('data: ')) continue;
                
                try {
                    const data = JSON.parse(line.slice(6));
                    const event = data.event;

                    // --- 提取task_id用于停止功能 ---
                    // Dify的task_id可能在message_start、workflow_started事件中，字段名可能是task_id、id或conversation_id
                    if (event === 'message_start' || event === 'workflow_started' || event === 'message') {
                        const taskId = data.task_id || data.id || data.conversation_id || data.message_id;
                        if (taskId) {
                            // 将task_id发送给前端
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'task_id', task_id: taskId })}\n\n`));
                        }
                    }

                    // --- 新增：Chatflow 节点步骤解析 ---
                    if (event === 'node_started') {
                        const nodeData = data.data;
                        const targetTypes = ['code', 'tool', 'llm', 'http-request']; // 支持这四种类型

                        if (nodeData && targetTypes.includes(nodeData.node_type)) {
                            // 提取步骤信息
                            const step = {
                                type: 'workflow_step',        // 前端通过这个 type 识别并在 UI 上展示"正在执行..."
                                node_type: nodeData.node_type,
                                title: nodeData.title,        // 节点名称
                                // 尝试获取图标，Dify 有时放在 extras 里，有时没有，建议前端根据 node_type 只有默认图标兜底
                                icon: nodeData.extras?.icon || nodeData.icon || '' 
                            };
                            
                            // 推送给前端
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`));
                        }
                    }

                    // --- 原有逻辑兼容调整 ---
                    else if (event === 'agent_thought') {
                        // Agent 模式的思考
                        const step = {
                            type: 'thought',
                            thought: data.thought || '',
                            tool: data.tool || '',
                            tool_input: data.tool_input || ''
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`));
                    } 
                    else if (event === 'agent_message') {
                        fullAnswer += data.answer || '';
                    } 
                    else if (event === 'message') {
                        fullAnswer += data.answer || '';
                    } 
                    // 【关键补充】Chatflow 模式下，文本经常通过 text_chunk 返回，不加这个可能拿不到回答
                    else if (event === 'text_chunk') {
                        fullAnswer += data.data.text || '';
                    }
                    else if (event === 'message_end' || event === 'workflow_finished') {
                        // 兼容 workflow_finished 作为结束标志
                        isFinished = true;
                        const result = parseJsonFromAnswer(fullAnswer);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', data: result, raw: fullAnswer })}\n\n`));
                    } 
                    else if (event === 'error') {
                        isFinished = true;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: data.message || 'Unknown error' })}\n\n`));
                    }
                } catch {
                    // 忽略解析错误
                }
            }
        },
        async flush(controller) {
            // 处理剩余 buffer
            if (buffer.startsWith('data: ')) {
                try {
                    const data = JSON.parse(buffer.slice(6));
                    if (data.event === 'message_end') {
                        const result = parseJsonFromAnswer(fullAnswer);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', data: result, raw: fullAnswer })}\n\n`));
                    }
                } catch {
                    // 忽略
                }
            }
            // 如果没收到 message_end，也尝试解析
            if (fullAnswer && !buffer.includes('message_end') && !isFinished) {
                const result = parseJsonFromAnswer(fullAnswer);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', data: result, raw: fullAnswer })}\n\n`));
            }
        }
    });

    // 直接返回 transform 后的流
    // 注意：Edge Runtime 有超时限制（通常 60 秒），对于长时间运行的请求可能需要切换到 Node.js runtime
    // Dify 的 SSE 流应该会定期发送数据或心跳，保持连接活跃
    return new Response(response.body?.pipeThrough(transformStream), {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            // 添加 X-Accel-Buffering: no 防止代理缓冲
            'X-Accel-Buffering': 'no',
        },
    });
}

function parseJsonFromAnswer(answerText: string): object | null {
    let jsonStr = answerText.trim();
    
    // 处理 markdown code block
    if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1]?.split('```')[0]?.trim() || jsonStr;
    } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1]?.split('```')[0]?.trim() || jsonStr;
    }
    
    // 提取 JSON 对象
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    try {
        return JSON.parse(jsonStr);
    } catch {
        return null;
    }
}

/**
 * 创建 Mock SSE 响应，用于调试
 */
function createMockSseResponse(): Response {
    const encoder = new TextEncoder();
    const lines = mockSseData.split('\n\n').filter(line => line.trim());
    
    const stream = new ReadableStream({
        async start(controller) {
            for (const line of lines) {
                // 延迟发送，模拟真实的流式响应
                await new Promise(resolve => setTimeout(resolve, MOCK_SSE_DELAY));
                controller.enqueue(encoder.encode(line + '\n\n'));
            }
            controller.close();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
