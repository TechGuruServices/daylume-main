/**
 * Universal AI provider integration
 * Uses OpenAI-compatible API format which works with OpenAI, OpenRouter, and many other providers
 */

import type { AISettings } from './types';
import { decrypt } from './encryption';
import { buildContextualSystemPrompt } from './ai-context';

export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AIResponse {
    message: string;
    error?: string;
}

/**
 * Model configurations with their API endpoints
 */
export const AI_MODELS = [
    // Local Ollama Models (Free/Private)
    { id: 'llama3.2', name: 'Llama 3.2 (Local Ollama)', provider: 'Ollama', endpoint: 'http://localhost:11434/v1/chat/completions' },
    { id: 'llama3.1', name: 'Llama 3.1 (Local Ollama)', provider: 'Ollama', endpoint: 'http://localhost:11434/v1/chat/completions' },
    { id: 'phi3', name: 'Phi 3 (Local Ollama)', provider: 'Ollama', endpoint: 'http://localhost:11434/v1/chat/completions' },
    { id: 'mistral', name: 'Mistral (Local Ollama)', provider: 'Ollama', endpoint: 'http://localhost:11434/v1/chat/completions' },
    // OpenAI Models
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions' },
    // OpenRouter Models
    { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
    { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
    // Hugging Face Models (Router API)
    { id: 'meta-llama/Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B (HF)', provider: 'HuggingFace', endpoint: 'https://router.huggingface.co/v1/chat/completions' },
    { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B (HF)', provider: 'HuggingFace', endpoint: 'https://router.huggingface.co/v1/chat/completions' },
    { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B (HF)', provider: 'HuggingFace', endpoint: 'https://router.huggingface.co/v1/chat/completions' },
    { id: 'mistralai/Mistral-Nemo-Instruct-2407', name: 'Mistral Nemo (HF)', provider: 'HuggingFace', endpoint: 'https://router.huggingface.co/v1/chat/completions' },
    { id: 'microsoft/Phi-3.5-mini-instruct', name: 'Phi-3.5 Mini (HF)', provider: 'HuggingFace', endpoint: 'https://router.huggingface.co/v1/chat/completions' },
] as const;

export type AIModelId = typeof AI_MODELS[number]['id'];

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string) {
    return AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
}

/**
 * Helper: normalize messages into OpenAI chat format
 */
function toChatMessages(messages: AIMessage[]) {
    return messages.map((m) => ({
        role: m.role,
        content: m.content
    }));
}

/**
 * Call HuggingFace via server-side proxy (avoids CORS)
 */
async function callHuggingFaceViaServer(
    messages: AIMessage[],
    apiKey: string,
    model: string,
    systemPrompt?: string
): Promise<AIResponse> {
    try {
        console.log('[AI-HF] Calling via server proxy');
        console.log('[AI-HF] Model:', model);

        // Get the last user message
        const userMessages = messages.filter(m => m.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';

        // Build history (exclude last user message and system messages)
        const history = messages
            .filter(m => m.role !== 'system')
            .slice(0, -1)
            .map(m => ({ role: m.role, content: m.content }));

        // Get system prompt from messages if exists
        const sysPrompt = systemPrompt || messages.find(m => m.role === 'system')?.content;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: lastUserMessage,
                history,
                model,
                apiKey,
                systemPrompt: sysPrompt
            })
        });

        const data = await response.json().catch(() => ({} as any));

        console.log('[AI-HF] Response status:', response.status);
        console.log('[AI-HF] Response:', JSON.stringify(data).substring(0, 300));

        if (!response.ok) {
            console.error('AI API error:', data);
            return {
                message: '',
                error: data?.error || `API error (status ${response.status})`
            };
        }

        return { message: data.reply || 'No response generated' };
    } catch (error) {
        console.error('[AI-HF] Request failed:', error);
        return { message: '', error: `AI request failed: ${error}` };
    }
}

/**
 * Universal API call - works with any OpenAI-compatible endpoint
 * Routes HuggingFace through server to avoid CORS
 */
async function callAI(
    messages: AIMessage[],
    apiKey: string,
    model: string,
    endpoint: string,
    provider?: string
): Promise<AIResponse> {
    // Route HuggingFace through server-side proxy to avoid CORS
    if (provider === 'HuggingFace' || endpoint.includes('huggingface.co')) {
        return callHuggingFaceViaServer(messages, apiKey, model);
    }

    try {
        console.log('[AI] Calling endpoint:', endpoint);
        console.log('[AI] Model:', model);
        console.log('[AI] API Key prefix:', apiKey.substring(0, 10) + '...');

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: toChatMessages(messages),
                max_tokens: 1024
            })
        });

        const data = await response.json().catch(() => ({} as any));

        console.log('[AI] Response status:', response.status);
        console.log('[AI] Response data:', JSON.stringify(data).substring(0, 500));

        if (!response.ok) {
            console.error('AI API error:', data);
            const errorMsg = data?.error?.message || data?.error || data?.message || `API error (status ${response.status})`;
            return {
                message: '',
                error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)
            };
        }

        const text =
            data?.choices?.[0]?.message?.content?.toString().trim() ?? 'No response generated';
        return { message: text };
    } catch (error) {
        console.error('[AI] Request failed:', error);
        return { message: '', error: `AI request failed: ${error}` };
    }
}

/**
 * Main entrypoint used by AIChat.svelte
 *
 * - `userMessage`      - current input
 * - `settings`         - AppSettings.ai (model, apiKey)
 * - `conversationHistory` - recent ChatMessage[] mapped into AIMessage[]
 * - `includeContext`   - whether to include user context in system prompt
 */
export async function sendAIMessage(
    userMessage: string,
    settings: AISettings,
    conversationHistory: AIMessage[] = [],
    includeContext: boolean = true
): Promise<AIResponse> {
    // Validate settings
    if (!settings) {
        return {
            message: '',
            error: 'AI settings not configured. Please check your settings.'
        };
    }

    // Build contextual system prompt
    let systemPrompt: string | null = null;
    try {
        systemPrompt = includeContext ? buildContextualSystemPrompt() : null;
    } catch (e) {
        console.error('Error building context:', e);
        // Continue without context if it fails
    }

    const messages: AIMessage[] = [
        // Add system prompt with full user context
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...conversationHistory,
        {
            role: 'user',
            content: userMessage
        }
    ];

    // Decrypt stored key (Ollama doesn't require keys, defaults to allowed)
    let apiKey = '';
    const modelConfig = getModelConfig(settings.model || 'llama3.2');

    // Auto-fill a dummy API key if the provider is Ollama (since it doesn't need one)
    if (modelConfig.provider === 'Ollama') {
        apiKey = 'ollama-local';
    } else {
        try {
            apiKey = settings.apiKey ? await decrypt(settings.apiKey) : '';
        } catch (e) {
            console.error('Error decrypting API key:', e);
            return {
                message: '',
                error: 'Failed to decrypt API key. Please re-enter your API key in Settings.'
            };
        }

        if (!apiKey) {
            return {
                message: '',
                error: 'API key not configured. Please add your API key in Settings.'
            };
        }
    }

    return callAI(messages, apiKey, settings.model || modelConfig.id, modelConfig.endpoint, modelConfig.provider);
}

/**
 * Generate AI content with a specific purpose (summaries, suggestions, etc.)
 */
export async function generateAIContent(
    prompt: string,
    settings: AISettings,
    systemInstruction?: string
): Promise<AIResponse> {
    // Validate settings
    if (!settings) {
        return {
            message: '',
            error: 'AI settings not configured. Please check your settings.'
        };
    }

    const messages: AIMessage[] = [
        ...(systemInstruction ? [{ role: 'system' as const, content: systemInstruction }] : []),
        { role: 'user', content: prompt }
    ];

    let apiKey = '';
    const modelConfig = getModelConfig(settings.model || 'llama3.2');

    // Auto-fill a dummy API key if the provider is Ollama
    if (modelConfig.provider === 'Ollama') {
        apiKey = 'ollama-local';
    } else {
        try {
            apiKey = settings.apiKey ? await decrypt(settings.apiKey) : '';
        } catch (e) {
            console.error('Error decrypting API key:', e);
            return {
                message: '',
                error: 'Failed to decrypt API key. Please re-enter your API key in Settings.'
            };
        }

        if (!apiKey) {
            return {
                message: '',
                error: 'API key not configured. Please add your API key in Settings.'
            };
        }
    }

    return callAI(messages, apiKey, settings.model || modelConfig.id, modelConfig.endpoint, modelConfig.provider);
}
