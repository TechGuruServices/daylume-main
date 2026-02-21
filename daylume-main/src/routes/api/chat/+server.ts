import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Disable prerendering for API routes
export const prerender = false;

type HistoryItem = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

type ChatRequestBody = {
	message: string;
	history?: HistoryItem[];
	model?: string;
	apiKey?: string; // User-provided API key (optional, falls back to env)
	systemPrompt?: string;
};

export const POST: RequestHandler = async ({ request }) => {
	// 1) Parse JSON body first to get potential user API key
	let body: ChatRequestBody;
	try {
		body = (await request.json()) as ChatRequestBody;
	} catch (e) {
		console.error('[HF] Invalid JSON body:', e);
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Get API key - prefer user-provided, fall back to environment
	const apiKey = body.apiKey || env.OLLAMA_TOKEN || env.HF_TOKEN || ''; // Ollama usually doesn't need a token
	const model = body.model || env.OLLAMA_MODEL || env.HF_MODEL || 'llama3.2';
	const AI_BASE_URL = env.OLLAMA_BASE_URL || env.HF_BASE_URL || 'http://localhost:11434/v1';

	// Validate API key only if using an external provider like Hugging Face
	if (!apiKey && AI_BASE_URL.includes('huggingface.co')) {
		console.error('[AI] No API key provided for Hugging Face');
		return new Response(
			JSON.stringify({
				error: 'No API key configured. Please add your API key in Settings.'
			}),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	if (!body.message || typeof body.message !== 'string') {
		return new Response(
			JSON.stringify({ error: 'Missing "message" string field in request body' }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const { message, history = [], systemPrompt } = body;

	// 2) Build OpenAI-style messages payload
	const messagesPayload = [
		...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
		...history.map((h) => ({
			role: h.role,
			content: h.content
		})),
		{
			role: 'user' as const,
			content: message
		}
	];

	try {
		// 3) Call AI Inference Provider
		const routerUrl = `${AI_BASE_URL}/chat/completions`;

		console.log('[AI Server] Calling:', routerUrl);
		console.log('[AI Server] Model:', model);
		if (apiKey) console.log('[AI Server] API Key prefix:', apiKey.substring(0, 5) + '...');

		const aiResponse = await fetch(routerUrl, {
			method: 'POST',
			headers: {
				...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: model,
				messages: messagesPayload,
				stream: false,
				max_tokens: 1024,
				temperature: 0.7
			})
		});

		const rawText = await aiResponse.text();
		let data: any;
		try {
			data = JSON.parse(rawText);
		} catch {
			data = rawText;
		}

		// 4) Non-OK status → surface error
		if (!aiResponse.ok) {
			console.error(
				'[AI Server Router] error',
				aiResponse.status,
				aiResponse.statusText,
				'payload:',
				data
			);

			const errorMessage =
				(typeof data === 'object' &&
					data !== null &&
					(data.error?.message || data.error)) ||
				rawText ||
				'AI Router request failed';

			return new Response(
				JSON.stringify({
					error: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
					status: aiResponse.status
				}),
				{
					status: 502,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// 5) Extract reply from OpenAI-like response
		let reply = '';

		if (
			data &&
			Array.isArray(data.choices) &&
			data.choices[0]?.message?.content
		) {
			reply = data.choices[0].message.content as string;
		} else if (typeof data === 'string') {
			reply = data;
		} else {
			reply = JSON.stringify(data);
		}

		return new Response(JSON.stringify({ reply }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('[HF Router] network/unknown error:', err);
		return new Response(
			JSON.stringify({
				error: 'Failed to contact Hugging Face Router',
				details: String(err)
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
