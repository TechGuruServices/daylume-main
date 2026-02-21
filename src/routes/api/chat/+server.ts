import type { RequestHandler } from '@sveltejs/kit';

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
	systemPrompt?: string;
};

export const POST: RequestHandler = async ({ request }) => {
	// 1) Parse JSON body
	let body: ChatRequestBody;
	try {
		body = (await request.json()) as ChatRequestBody;
	} catch (e) {
		console.error('[Ollama] Invalid JSON body:', e);
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const model = body.model || 'llama3.2';
	const OLLAMA_BASE_URL = 'http://localhost:11434/v1';

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
		// 3) Call Ollama's OpenAI-compatible endpoint
		const routerUrl = `${OLLAMA_BASE_URL}/chat/completions`;

		console.log('[Ollama Server] Calling:', routerUrl);
		console.log('[Ollama Server] Model:', model);

		const aiResponse = await fetch(routerUrl, {
			method: 'POST',
			headers: {
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
				'[Ollama Server] error',
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
				'Ollama request failed';

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
		console.error('[Ollama Server] network/unknown error:', err);

		const isConnectionError = String(err).includes('ECONNREFUSED') || String(err).includes('fetch failed');
		const errorMsg = isConnectionError
			? 'Cannot connect to Ollama. Make sure Ollama is running (ollama serve) on http://localhost:11434'
			: 'Failed to contact Ollama server';

		return new Response(
			JSON.stringify({
				error: errorMsg,
				details: String(err)
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
