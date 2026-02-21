<script lang="ts">
	import { onMount, tick } from "svelte";
	import { fly, fade, scale } from "svelte/transition";
	import { showToast } from "$lib/toast";
	import { getSettings } from "$lib/storage";
	import { sendAIMessage, type AIMessage } from "$lib/ai-providers";
	import {
		getSuggestions,
		getJournalPrompts,
		getSmartSchedulingSuggestions,
		type Suggestion,
		type JournalPrompt,
		type SchedulingSuggestion,
	} from "$lib/ai-context";
	import { hapticFeedback } from "$lib/haptics";

	// Types
	interface Message {
		role: "user" | "assistant";
		content: string;
		timestamp?: string;
	}

	// State
	let isOpen = false;
	let showHalo = false;
	let spinDirection = 1; // 1 for clockwise, -1 for counter-clockwise
	let spinInterval: ReturnType<typeof setInterval>;
	let activeTab: "chat" | "suggestions" | "journal" | "schedule" = "chat";

	// Suggestions state
	let suggestions: Suggestion[] = [];
	let journalPrompts: JournalPrompt[] = [];
	let scheduleSuggestions: SchedulingSuggestion[] = [];
	let loadingSuggestions = false;

	// Voice input state
	let isListening = false;
	let speechRecognition: any = null;
	let voiceSupported = false;

	// Randomly change spin direction
	onMount(() => {
		spinInterval = setInterval(
			() => {
				spinDirection = Math.random() > 0.5 ? 1 : -1;
			},
			4000 + Math.random() * 3000,
		); // Random interval between 4-7 seconds

		// Check for speech recognition support
		if (typeof window !== "undefined") {
			const SpeechRecognition =
				(window as any).SpeechRecognition ||
				(window as any).webkitSpeechRecognition;
			if (SpeechRecognition) {
				voiceSupported = true;
				speechRecognition = new SpeechRecognition();
				speechRecognition.continuous = false;
				speechRecognition.interimResults = true;
				speechRecognition.lang = "en-US";

				speechRecognition.onresult = (event: any) => {
					const transcript = Array.from(event.results)
						.map((result: any) => result[0].transcript)
						.join("");
					inputValue = transcript;
				};

				speechRecognition.onend = () => {
					isListening = false;
					if (inputValue.trim()) {
						hapticFeedback.success();
					}
				};

				speechRecognition.onerror = (event: any) => {
					console.error("Speech recognition error:", event.error);
					isListening = false;
					if (event.error !== "no-speech") {
						showToast(
							"error",
							"Voice input failed. Please try again.",
						);
					}
				};
			}
		}

		return () => clearInterval(spinInterval);
	});
	let messages: Message[] = [];
	let inputValue = "";
	let isLoading = false;
	let chatContainer: HTMLDivElement | null = null;
	let inputElement: HTMLInputElement | null = null;

	// Load history from localStorage on mount
	onMount(() => {
		const saved = localStorage.getItem("daylume_chat_history");
		if (saved) {
			try {
				messages = JSON.parse(saved);
			} catch (e) {
				console.error("Failed to parse chat history", e);
			}
		}
	});

	// Save history whenever it changes
	$: {
		if (typeof window !== "undefined") {
			localStorage.setItem(
				"daylume_chat_history",
				JSON.stringify(messages),
			);
		}
	}

	// Load contextual suggestions when switching tabs
	async function loadSuggestions() {
		if (suggestions.length > 0) return; // Already loaded
		loadingSuggestions = true;
		suggestions = getSuggestions();
		loadingSuggestions = false;
	}

	async function loadJournalPrompts() {
		if (journalPrompts.length > 0) return;
		loadingSuggestions = true;
		journalPrompts = getJournalPrompts();
		loadingSuggestions = false;
	}

	async function loadScheduleSuggestions() {
		if (scheduleSuggestions.length > 0) return;
		loadingSuggestions = true;
		scheduleSuggestions = getSmartSchedulingSuggestions();
		loadingSuggestions = false;
	}

	function switchTab(tab: typeof activeTab) {
		activeTab = tab;
		hapticFeedback.tap();

		if (tab === "suggestions") loadSuggestions();
		else if (tab === "journal") loadJournalPrompts();
		else if (tab === "schedule") loadScheduleSuggestions();
	}

	async function scrollToBottom() {
		await tick();
		if (chatContainer) {
			chatContainer.scrollTo({
				top: chatContainer.scrollHeight,
				behavior: "smooth",
			});
		}
	}

	function toggleChat() {
		// Trigger halo animation
		showHalo = true;
		setTimeout(() => (showHalo = false), 800);
		hapticFeedback.press();

		isOpen = !isOpen;
		if (isOpen) {
			scrollToBottom();
			setTimeout(() => inputElement?.focus(), 300);
		}
	}

	function clearChat() {
		messages = [];
		hapticFeedback.tap();
		showToast("success", "Chat history cleared");
	}

	function toggleVoiceInput() {
		if (!voiceSupported || !speechRecognition) {
			showToast("error", "Voice input not supported in this browser");
			return;
		}

		if (isListening) {
			speechRecognition.stop();
			isListening = false;
		} else {
			speechRecognition.start();
			isListening = true;
			hapticFeedback.press();
			showToast("info", "Listening...");
		}
	}

	function useSuggestion(text: string) {
		inputValue = text;
		activeTab = "chat";
		hapticFeedback.tap();
		setTimeout(() => inputElement?.focus(), 100);
	}

	function useJournalPrompt(prompt: JournalPrompt) {
		// Navigate to journal with the prompt
		const url = `/journal?prompt=${encodeURIComponent(prompt.prompt)}`;
		window.location.href = url;
	}

	async function handleSend() {
		const text = inputValue.trim();
		if (!text || isLoading) return;

		hapticFeedback.tap();

		// Add user message
		const userMsg: Message = {
			role: "user",
			content: text,
			timestamp: new Date().toISOString(),
		};
		messages = [...messages, userMsg];
		inputValue = "";
		isLoading = true;
		scrollToBottom();

		try {
			// Get settings with safe defaults
			const settings = getSettings();
			const aiSettings = settings?.ai || { model: "llama3.2" };

			// Prepare history for API (last 10 messages)
			const history: AIMessage[] = messages.slice(-11, -1).map((m) => ({
				role: m.role,
				content: m.content,
			}));

			// Use client-side AI provider with context
			const response = await sendAIMessage(
				text,
				aiSettings,
				history,
				true,
			);

			if (response.error) {
				throw new Error(response.error);
			}

			hapticFeedback.success();

			// Add assistant message
			const aiMsg: Message = {
				role: "assistant",
				content: response.message,
				timestamp: new Date().toISOString(),
			};
			messages = [...messages, aiMsg];
			scrollToBottom();
		} catch (error) {
			console.error("Chat error:", error);
			hapticFeedback.error();
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			showToast(
				"error",
				errorMessage.includes("API key")
					? "Please configure your API key in Settings"
					: "Sorry, I couldn't reach the assistant. Please try again.",
			);
			// Add a visible error message in chat
			messages = [
				...messages,
				{
					role: "assistant",
					content: errorMessage.includes("API key")
						? "⚠️ Please add your API key in Settings to use the AI assistant."
						: `⚠️ ${errorMessage}`,
					timestamp: new Date().toISOString(),
				},
			];
		} finally {
			isLoading = false;
			scrollToBottom();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	// Icon mapping for suggestion categories
	function getCategoryIcon(category: string): string {
		const icons: Record<string, string> = {
			productivity: "mdi-rocket-launch",
			wellness: "mdi-spa",
			task: "mdi-checkbox-marked-circle",
			habit: "mdi-repeat",
			goal: "mdi-flag",
			schedule: "mdi-calendar-clock",
			reflection: "mdi-thought-bubble",
			morning: "mdi-weather-sunset-up",
			afternoon: "mdi-weather-sunny",
			evening: "mdi-weather-night",
			gratitude: "mdi-heart",
			growth: "mdi-trending-up",
		};
		return icons[category] || "mdi-lightbulb";
	}

	function getPriorityColor(priority: string): string {
		const colors: Record<string, string> = {
			high: "text-red-400 bg-red-500/10 border-red-500/20",
			medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
			low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
		};
		return (
			colors[priority] ||
			"text-gray-400 bg-gray-500/10 border-gray-500/20"
		);
	}
</script>

<!-- Floating Orb Trigger -->
{#if !isOpen}
	<button
		on:click={toggleChat}
		class="fixed bottom-6 right-6 z-[60] group outline-none rounded-full chat-btn-float"
		aria-label="Open AI Assistant"
	>
		<!-- Premium Animated Logo Button -->
		<div class="relative w-14 h-14">
			<!-- Halo Ring Animation (on click) -->
			{#if showHalo}
				<div
					class="absolute -inset-3 rounded-full border-2 border-primary/60 chat-halo-ring"
					in:scale={{ duration: 400, start: 0.8 }}
					out:fade={{ duration: 400 }}
				></div>
				<div
					class="absolute -inset-5 rounded-full border border-secondary/40 chat-halo-ring-outer"
					in:scale={{ duration: 500, start: 0.7, delay: 100 }}
					out:fade={{ duration: 300 }}
				></div>
			{/if}

			<!-- Ambient glow -->
			<div
				class="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/30 via-secondary/20 to-pink-500/30 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 chat-glow-pulse"
			></div>

			<!-- Logo Image with spin animation -->
			<img
				src="/assets/logo.png"
				alt="Daylume Assistant"
				class="relative w-full h-full object-contain rounded-full transform transition-transform duration-300 group-hover:scale-110 group-active:scale-95 drop-shadow-2xl"
				class:chat-spin-cw={spinDirection === 1}
				class:chat-spin-ccw={spinDirection === -1}
			/>
		</div>
	</button>
{/if}

<!-- Chat Modal -->
{#if isOpen}
	<!-- Backdrop (Mobile only) -->
	<div
		class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 sm:hidden"
		on:click={toggleChat}
		on:keydown={() => {}}
		role="button"
		tabindex="-1"
		transition:fade={{ duration: 200 }}
	></div>

	<!-- Modal Container -->
	<div
		class="fixed bottom-0 sm:bottom-24 right-0 sm:right-6 z-50 w-full sm:w-[420px] flex flex-col"
		style="max-height: min(600px, calc(100vh - 120px));"
		role="dialog"
		aria-modal="true"
		transition:fly={{ y: 20, duration: 300, opacity: 0 }}
	>
		<div
			class="relative w-full flex flex-col glass-panel rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10"
			style="height: 100%; max-height: min(600px, calc(100vh - 120px));"
		>
			<!-- Header -->
			<header
				class="flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/5 backdrop-blur-md flex-shrink-0"
			>
				<div class="flex items-center gap-3">
					<!-- Logo Avatar -->
					<div class="relative w-10 h-10">
						<div
							class="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 blur-sm opacity-40"
						></div>
						<div
							class="relative w-full h-full rounded-full bg-[#0a1628] border border-white/20 flex items-center justify-center overflow-hidden p-1"
						>
							<img
								src="/assets/logo.png"
								alt="Daylume"
								class="w-full h-full object-contain"
							/>
						</div>
					</div>
					<div>
						<h2 class="text-sm font-bold text-white tracking-wide">
							Daylume AI
						</h2>
						<div class="flex items-center gap-1.5">
							<span
								class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]"
							></span>
							<span class="text-[10px] font-medium text-gray-400"
								>Context-Aware</span
							>
						</div>
					</div>
				</div>

				<div class="flex items-center gap-1">
					<a
						href="/settings"
						class="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
						title="Settings"
					>
						<span class="mdi mdi-cog text-lg"></span>
					</a>
					<button
						on:click={clearChat}
						class="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
						title="Clear Chat"
					>
						<span class="mdi mdi-delete-outline text-lg"></span>
					</button>
					<button
						on:click={toggleChat}
						class="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
						title="Close"
					>
						<span class="mdi mdi-close text-lg"></span>
					</button>
				</div>
			</header>

			<!-- Tab Navigation -->
			<nav
				class="flex items-center gap-1 px-3 py-2 bg-white/5 border-b border-white/5 flex-shrink-0 overflow-x-auto no-scrollbar"
			>
				<button
					on:click={() => switchTab("chat")}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
						{activeTab === 'chat'
						? 'bg-primary/20 text-primary border border-primary/30'
						: 'text-gray-400 hover:text-white hover:bg-white/5'}"
				>
					<span class="mdi mdi-chat text-sm"></span>
					Chat
				</button>
				<button
					on:click={() => switchTab("suggestions")}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
						{activeTab === 'suggestions'
						? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
						: 'text-gray-400 hover:text-white hover:bg-white/5'}"
				>
					<span class="mdi mdi-lightbulb text-sm"></span>
					Ideas
				</button>
				<button
					on:click={() => switchTab("journal")}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
						{activeTab === 'journal'
						? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
						: 'text-gray-400 hover:text-white hover:bg-white/5'}"
				>
					<span class="mdi mdi-book-edit text-sm"></span>
					Journal
				</button>
				<button
					on:click={() => switchTab("schedule")}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
						{activeTab === 'schedule'
						? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
						: 'text-gray-400 hover:text-white hover:bg-white/5'}"
				>
					<span class="mdi mdi-calendar-clock text-sm"></span>
					Schedule
				</button>
			</nav>

			<!-- Content Area -->
			<div
				bind:this={chatContainer}
				class="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar scroll-smooth"
			>
				<!-- Chat Tab -->
				{#if activeTab === "chat"}
					{#if messages.length === 0}
						<div
							class="h-full flex flex-col items-center justify-center text-center opacity-0 animate-fade-in"
							style="animation-fill-mode: forwards;"
						>
							<div
								class="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300/20 to-indigo-500/20 flex items-center justify-center mb-4 animate-float"
							>
								<span
									class="mdi mdi-robot-excited-outline text-3xl text-white/80"
								></span>
							</div>
							<p class="text-white font-medium mb-1">
								Hello! I'm your AI assistant.
							</p>
							<p class="text-sm text-gray-400 max-w-[260px] mb-4">
								I know about your tasks, habits, and schedule.
								Ask me anything!
							</p>
							<!-- Quick Actions -->
							<div
								class="flex flex-wrap gap-2 justify-center max-w-[300px]"
							>
								<button
									on:click={() =>
										useSuggestion(
											"What should I focus on today?",
										)}
									class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-all"
								>
									Today's focus?
								</button>
								<button
									on:click={() =>
										useSuggestion(
											"Summarize my week so far",
										)}
									class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-all"
								>
									Weekly summary
								</button>
								<button
									on:click={() =>
										useSuggestion("Help me plan tomorrow")}
									class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-all"
								>
									Plan tomorrow
								</button>
							</div>
						</div>
					{/if}

					{#each messages as msg}
						<div
							class="flex w-full gap-2 {msg.role === 'user'
								? 'justify-end'
								: 'justify-start'}"
							in:fly={{ y: 10, duration: 300 }}
						>
							{#if msg.role === "assistant"}
								<div
									class="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-300/20 to-indigo-500/20 p-0.5 shadow-lg mt-1"
								>
									<img
										src="/assets/logo.png"
										alt="Daylume"
										class="w-full h-full rounded-full object-cover"
									/>
								</div>
							{/if}
							<div
								class="max-w-[80%] rounded-2xl px-4 py-3 shadow-sm relative group
								{msg.role === 'user'
									? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-sm'
									: 'bg-white/10 border border-white/5 text-gray-100 rounded-tl-sm backdrop-blur-md'}"
							>
								<div
									class="text-sm leading-relaxed whitespace-pre-wrap"
								>
									{msg.content}
								</div>
								{#if msg.timestamp}
									<div
										class="text-[10px] opacity-40 mt-1 text-right font-mono"
									>
										{new Date(
											msg.timestamp,
										).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</div>
								{/if}
							</div>
						</div>
					{/each}

					<!-- Typing Indicator -->
					{#if isLoading}
						<div class="flex justify-start gap-2" in:fade>
							<div
								class="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-300/20 to-indigo-500/20 p-0.5 shadow-lg mt-1"
							>
								<img
									src="/assets/logo.png"
									alt="Daylume"
									class="w-full h-full rounded-full object-cover"
								/>
							</div>
							<div
								class="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 backdrop-blur-md flex items-center gap-1.5"
							>
								<div
									class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
									style="animation-delay: 0ms"
								></div>
								<div
									class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
									style="animation-delay: 150ms"
								></div>
								<div
									class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
									style="animation-delay: 300ms"
								></div>
							</div>
						</div>
					{/if}
				{/if}

				<!-- Suggestions Tab -->
				{#if activeTab === "suggestions"}
					<div class="space-y-3">
						<div class="flex items-center gap-2 mb-4">
							<span class="mdi mdi-lightbulb-on text-amber-400"
							></span>
							<h3 class="text-sm font-semibold text-white">
								Smart Suggestions
							</h3>
						</div>

						{#if loadingSuggestions}
							<div class="flex items-center justify-center py-8">
								<span
									class="mdi mdi-loading mdi-spin text-2xl text-gray-400"
								></span>
							</div>
						{:else if suggestions.length === 0}
							<div class="text-center py-8 text-gray-400">
								<span
									class="mdi mdi-lightbulb-off-outline text-3xl block mb-2"
								></span>
								<p class="text-sm">
									No suggestions right now. Add some tasks or
									habits to get personalized ideas!
								</p>
							</div>
						{:else}
							{#each suggestions as suggestion}
								<button
									on:click={() =>
										useSuggestion(suggestion.action)}
									class="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/30 transition-all group"
									in:fly={{ y: 10, duration: 200 }}
								>
									<div class="flex items-start gap-3">
										<div
											class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0"
										>
											<span
												class="mdi {getCategoryIcon(
													suggestion.category,
												)} text-lg text-amber-400"
											></span>
										</div>
										<div class="flex-1 min-w-0">
											<p
												class="text-sm font-medium text-white group-hover:text-amber-300 transition-colors"
											>
												{suggestion.title}
											</p>
											<p
												class="text-xs text-gray-400 mt-0.5 line-clamp-2"
											>
												{suggestion.description}
											</p>
											<div
												class="flex items-center gap-2 mt-2"
											>
												<span
													class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
												>
													{suggestion.category}
												</span>
											</div>
										</div>
										<span
											class="mdi mdi-arrow-right text-gray-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all"
										></span>
									</div>
								</button>
							{/each}
						{/if}
					</div>
				{/if}

				<!-- Journal Prompts Tab -->
				{#if activeTab === "journal"}
					<div class="space-y-3">
						<div class="flex items-center gap-2 mb-4">
							<span class="mdi mdi-book-edit text-purple-400"
							></span>
							<h3 class="text-sm font-semibold text-white">
								Journal Prompts
							</h3>
						</div>

						{#if loadingSuggestions}
							<div class="flex items-center justify-center py-8">
								<span
									class="mdi mdi-loading mdi-spin text-2xl text-gray-400"
								></span>
							</div>
						{:else if journalPrompts.length === 0}
							<div class="text-center py-8 text-gray-400">
								<span
									class="mdi mdi-book-off-outline text-3xl block mb-2"
								></span>
								<p class="text-sm">
									Start journaling to get personalized
									prompts!
								</p>
							</div>
						{:else}
							{#each journalPrompts as prompt}
								<button
									on:click={() => useJournalPrompt(prompt)}
									class="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all group"
									in:fly={{ y: 10, duration: 200 }}
								>
									<div class="flex items-start gap-3">
										<div
											class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0"
										>
											<span
												class="mdi {getCategoryIcon(
													prompt.category,
												)} text-lg text-purple-400"
											></span>
										</div>
										<div class="flex-1 min-w-0">
											<p
												class="text-sm font-medium text-white group-hover:text-purple-300 transition-colors"
											>
												{prompt.prompt}
											</p>
											{#if prompt.context}
												<p
													class="text-xs text-gray-500 mt-1 italic"
												>
													{prompt.context}
												</p>
											{/if}
											<div
												class="flex items-center gap-2 mt-2"
											>
												<span
													class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20"
												>
													{prompt.category}
												</span>
											</div>
										</div>
										<span
											class="mdi mdi-pencil text-gray-500 group-hover:text-purple-400 transition-all"
										></span>
									</div>
								</button>
							{/each}
						{/if}
					</div>
				{/if}

				<!-- Smart Schedule Tab -->
				{#if activeTab === "schedule"}
					<div class="space-y-3">
						<div class="flex items-center gap-2 mb-4">
							<span class="mdi mdi-calendar-clock text-cyan-400"
							></span>
							<h3 class="text-sm font-semibold text-white">
								Smart Scheduling
							</h3>
						</div>

						{#if loadingSuggestions}
							<div class="flex items-center justify-center py-8">
								<span
									class="mdi mdi-loading mdi-spin text-2xl text-gray-400"
								></span>
							</div>
						{:else if scheduleSuggestions.length === 0}
							<div class="text-center py-8 text-gray-400">
								<span
									class="mdi mdi-calendar-blank text-3xl block mb-2"
								></span>
								<p class="text-sm">
									Add tasks and events to get scheduling
									insights!
								</p>
							</div>
						{:else}
							{#each scheduleSuggestions as suggestion}
								<div
									class="p-4 rounded-xl bg-white/5 border border-white/10 {getPriorityColor(
										suggestion.priority,
									)}"
									in:fly={{ y: 10, duration: 200 }}
								>
									<div class="flex items-start gap-3">
										<div
											class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0"
										>
											<span
												class="mdi mdi-clock-outline text-lg text-cyan-400"
											></span>
										</div>
										<div class="flex-1 min-w-0">
											<p
												class="text-sm font-medium text-white"
											>
												{suggestion.suggestion}
											</p>
											<p
												class="text-xs text-gray-400 mt-1"
											>
												{suggestion.reason}
											</p>
											{#if suggestion.timeSlot}
												<div
													class="flex items-center gap-2 mt-2"
												>
													<span
														class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
													>
														<span
															class="mdi mdi-clock-outline text-[10px]"
														></span>
														{suggestion.timeSlot}
													</span>
													<span
														class="text-[10px] px-2 py-0.5 rounded-full {getPriorityColor(
															suggestion.priority,
														)} border"
													>
														{suggestion.priority} priority
													</span>
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>

			<!-- Input Area (only show for chat tab) -->
			{#if activeTab === "chat"}
				<div
					class="p-4 bg-white/5 backdrop-blur-xl border-t border-white/5 flex-shrink-0"
				>
					<div class="relative flex items-center gap-2">
						<!-- Voice Input Button -->
						{#if voiceSupported}
							<button
								on:click={toggleVoiceInput}
								class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all
									{isListening
									? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
									: 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}"
								title={isListening
									? "Stop listening"
									: "Voice input"}
							>
								<span
									class="mdi {isListening
										? 'mdi-microphone'
										: 'mdi-microphone-outline'} text-lg"
								></span>
							</button>
						{/if}

						<input
							bind:this={inputElement}
							bind:value={inputValue}
							on:keydown={handleKeydown}
							type="text"
							placeholder={isListening
								? "Listening..."
								: "Ask me anything..."}
							class="w-full bg-black/20 border border-white/10 rounded-full pl-5 pr-12 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:bg-black/40 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
							disabled={isLoading || isListening}
						/>
						<button
							on:click={handleSend}
							disabled={!inputValue.trim() || isLoading}
							class="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-400 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200"
							title="Send"
						>
							{#if isLoading}
								<span class="mdi mdi-loading mdi-spin text-lg"
								></span>
							{:else}
								<span class="mdi mdi-arrow-up text-lg"></span>
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for chat */
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Hide scrollbar for tabs */
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	/* Line clamp utility */
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Floating animation */
	.chat-btn-float {
		animation: chatFloat 3s ease-in-out infinite;
	}

	@keyframes chatFloat {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	/* Clockwise spin */
	.chat-spin-cw {
		animation: chatSpinCW 20s linear infinite;
	}

	@keyframes chatSpinCW {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Counter-clockwise spin */
	.chat-spin-ccw {
		animation: chatSpinCCW 20s linear infinite;
	}

	@keyframes chatSpinCCW {
		from {
			transform: rotate(360deg);
		}
		to {
			transform: rotate(0deg);
		}
	}

	/* Glow pulse */
	.chat-glow-pulse {
		animation: glowPulse 2s ease-in-out infinite;
	}

	@keyframes glowPulse {
		0%,
		100% {
			opacity: 0.4;
			transform: scale(1);
		}
		50% {
			opacity: 0.7;
			transform: scale(1.1);
		}
	}

	/* Halo ring animations */
	.chat-halo-ring {
		animation: haloExpand 0.8s ease-out forwards;
	}

	.chat-halo-ring-outer {
		animation: haloExpandOuter 0.9s ease-out forwards;
	}

	@keyframes haloExpand {
		0% {
			transform: scale(0.8);
			opacity: 0.8;
		}
		100% {
			transform: scale(1.5);
			opacity: 0;
		}
	}

	@keyframes haloExpandOuter {
		0% {
			transform: scale(0.7);
			opacity: 0.6;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}
</style>
