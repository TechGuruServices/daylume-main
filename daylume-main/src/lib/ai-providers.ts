/**
 * Ollama-only AI provider integration
 * Uses OpenAI-compatible API format provided by Ollama's local server
 * All models run locally via Ollama — no API keys required
 */

import type { AISettings } from './types';
import { buildContextualSystemPrompt } from './ai-context';

export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AIResponse {
    message: string;
    error?: string;
}

const OLLAMA_ENDPOINT = 'http://localhost:11434/v1/chat/completions';

/**
 * All available Ollama models
 * Users must have the desired model pulled locally via: ollama pull <model>
 */
export const AI_MODELS = [
    // General Purpose — Popular
    { id: 'llama3.2', name: 'Llama 3.2 (3B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'llama3.2:1b', name: 'Llama 3.2 (1B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'llama3.1', name: 'Llama 3.1 (8B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'llama3.1:70b', name: 'Llama 3.1 (70B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'llama3', name: 'Llama 3 (8B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'llama2', name: 'Llama 2 (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },

    // Mistral Family
    { id: 'mistral', name: 'Mistral (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'mistral-nemo', name: 'Mistral Nemo (12B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'mixtral', name: 'Mixtral 8x7B', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'mistral-small', name: 'Mistral Small (22B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },

    // Microsoft Phi
    { id: 'phi3', name: 'Phi-3 (3.8B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'phi3:medium', name: 'Phi-3 Medium (14B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'phi', name: 'Phi-2 (2.7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },

    // Google Gemma
    { id: 'gemma2', name: 'Gemma 2 (9B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'gemma2:2b', name: 'Gemma 2 (2B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'gemma', name: 'Gemma (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },

    // Alibaba Qwen
    { id: 'qwen2.5', name: 'Qwen 2.5 (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'qwen2.5:14b', name: 'Qwen 2.5 (14B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'qwen2.5:32b', name: 'Qwen 2.5 (32B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'qwen2.5:72b', name: 'Qwen 2.5 (72B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'qwen2', name: 'Qwen 2 (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },

    // DeepSeek
    { id: 'deepseek-r1', name: 'DeepSeek R1 (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Reasoning' },
    { id: 'deepseek-r1:14b', name: 'DeepSeek R1 (14B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Reasoning' },
    { id: 'deepseek-r1:32b', name: 'DeepSeek R1 (32B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Reasoning' },
    { id: 'deepseek-r1:70b', name: 'DeepSeek R1 (70B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Reasoning' },
    { id: 'deepseek-v2.5', name: 'DeepSeek V2.5', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },

    // Coding Models
    { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Coding' },
    { id: 'codellama', name: 'Code Llama (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Coding' },
    { id: 'codellama:13b', name: 'Code Llama (13B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Coding' },
    { id: 'codellama:34b', name: 'Code Llama (34B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Coding' },
    { id: 'codegemma', name: 'CodeGemma (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Coding' },
    { id: 'starcoder2', name: 'StarCoder 2 (3B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Coding' },
    { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Coding' },
    { id: 'qwen2.5-coder:14b', name: 'Qwen 2.5 Coder (14B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Coding' },

    // Cohere Command R
    { id: 'command-r', name: 'Command R (35B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'command-r-plus', name: 'Command R+ (104B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },

    // Vision Models
    { id: 'llava', name: 'LLaVA (7B) — Vision', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Vision' },
    { id: 'llava:13b', name: 'LLaVA (13B) — Vision', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Vision' },
    { id: 'bakllava', name: 'BakLLaVA — Vision', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Vision' },
    { id: 'llama3.2-vision', name: 'Llama 3.2 Vision (11B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Vision' },

    // Small / Lightweight
    { id: 'tinyllama', name: 'TinyLlama (1.1B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Small' },
    { id: 'tinydolphin', name: 'TinyDolphin (1.1B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Small' },
    { id: 'orca-mini', name: 'Orca Mini (3B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Small' },

    // Other Notable Models
    { id: 'vicuna', name: 'Vicuna (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'neural-chat', name: 'Neural Chat (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'solar', name: 'Solar (10.7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'nous-hermes2', name: 'Nous Hermes 2 (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'openchat', name: 'OpenChat 3.5 (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'zephyr', name: 'Zephyr (7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'yi', name: 'Yi (6B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },
    { id: 'dolphin-mixtral', name: 'Dolphin Mixtral (8x7B)', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'General' },

    // Embeddings
    { id: 'nomic-embed-text', name: 'Nomic Embed Text', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Embeddings' },
    { id: 'mxbai-embed-large', name: 'MxBAI Embed Large', provider: 'Ollama', endpoint: OLLAMA_ENDPOINT, category: 'Embeddings' },
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
 * Call Ollama's OpenAI-compatible endpoint directly
 */
async function callOllama(
    messages: AIMessage[],
    model: string,
    endpoint: string
): Promise<AIResponse> {
    try {
        console.log('[AI-Ollama] Calling endpoint:', endpoint);
        console.log('[AI-Ollama] Model:', model);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: toChatMessages(messages),
                max_tokens: 1024
            })
        });

        const data = await response.json().catch(() => ({} as any));

        console.log('[AI-Ollama] Response status:', response.status);

        if (!response.ok) {
            console.error('Ollama API error:', data);
            const errorMsg = data?.error?.message || data?.error || data?.message || `Ollama error (status ${response.status})`;
            return {
                message: '',
                error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)
            };
        }

        const text =
            data?.choices?.[0]?.message?.content?.toString().trim() ?? 'No response generated';
        return { message: text };
    } catch (error) {
        console.error('[AI-Ollama] Request failed:', error);
        const isConnectionError = String(error).includes('fetch') || String(error).includes('ECONNREFUSED') || String(error).includes('Failed to fetch');
        if (isConnectionError) {
            return {
                message: '',
                error: 'Cannot connect to Ollama. Make sure Ollama is running on http://localhost:11434. Start it with: ollama serve'
            };
        }
        return { message: '', error: `AI request failed: ${error}` };
    }
}

/**
 * Main entrypoint used by AIChat.svelte
 *
 * - `userMessage`      - current input
 * - `settings`         - AppSettings.ai (model)
 * - `conversationHistory` - recent ChatMessage[] mapped into AIMessage[]
 * - `includeContext`   - whether to include user context in system prompt
 */
export async function sendAIMessage(
    userMessage: string,
    settings: AISettings,
    conversationHistory: AIMessage[] = [],
    includeContext: boolean = true
): Promise<AIResponse> {
    if (!settings) {
        return {
            message: '',
            error: 'AI settings not configured. Please select a model in Settings.'
        };
    }

    // Build contextual system prompt
    let systemPrompt: string | null = null;
    try {
        systemPrompt = includeContext ? buildContextualSystemPrompt() : null;
    } catch (e) {
        console.error('Error building context:', e);
    }

    const messages: AIMessage[] = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...conversationHistory,
        {
            role: 'user',
            content: userMessage
        }
    ];

    const modelConfig = getModelConfig(settings.model || 'llama3.2');

    return callOllama(messages, settings.model || modelConfig.id, modelConfig.endpoint);
}

/**
 * Generate AI content with a specific purpose (summaries, suggestions, etc.)
 */
export async function generateAIContent(
    prompt: string,
    settings: AISettings,
    systemInstruction?: string
): Promise<AIResponse> {
    if (!settings) {
        return {
            message: '',
            error: 'AI settings not configured. Please select a model in Settings.'
        };
    }

    const messages: AIMessage[] = [
        ...(systemInstruction ? [{ role: 'system' as const, content: systemInstruction }] : []),
        { role: 'user', content: prompt }
    ];

    const modelConfig = getModelConfig(settings.model || 'llama3.2');

    return callOllama(messages, settings.model || modelConfig.id, modelConfig.endpoint);
}
