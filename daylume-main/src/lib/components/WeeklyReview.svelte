<script lang="ts">
	import { onMount } from "svelte";
	import type { WeeklyReview, Habit, HabitLog, JournalEntry } from "$lib/types";
	import { 
		getTasks, 
		getHabits, 
		getHabitLogs,
		getGoals,
		getWeeklyReviews,
		addWeeklyReview,
		updateWeeklyReview,
		getWeekBounds,
		getJournalEntries,
		getSettings
	} from "$lib/storage";
	import { generateWeeklySummary } from "$lib/ai-context";
	import { showToast } from "$lib/toast";
	import { hapticFeedback } from "$lib/haptics";
	import Modal from "./Modal.svelte";

	export let show = false;

	let review: WeeklyReview | null = null;
	let isEditing = false;
	let isGeneratingAI = false;
	let aiSummary = "";
	let weekStats = {
		tasksCompleted: 0,
		tasksTotal: 0,
		habitsCompletionRate: 0,
		journalEntries: 0,
		goalsProgress: [] as { title: string; progress: number; color: string }[],
		topHabits: [] as { title: string; streak: number; icon: string }[],
		moodBreakdown: {} as Record<string, number>,
	};

	let reviewForm = {
		wentWell: "",
		toImprove: "",
		focusNextWeek: "",
		productivityScore: 5,
	};

	let weekBounds = getWeekBounds(new Date());

	onMount(() => {
		loadWeekData();
	});

	$: if (show) {
		loadWeekData();
	}

	function loadWeekData() {
		weekBounds = getWeekBounds(new Date());
		
		// Load existing review for this week
		const reviews = getWeeklyReviews();
		review = reviews.find(r => r.weekStart === weekBounds.start) || null;
		
		if (review) {
			reviewForm = {
				wentWell: review.wentWell || "",
				toImprove: review.toImprove || "",
				focusNextWeek: review.focusNextWeek || "",
				productivityScore: review.productivityScore || 5,
			};
		} else {
			reviewForm = {
				wentWell: "",
				toImprove: "",
				focusNextWeek: "",
				productivityScore: 5,
			};
		}
		
		calculateStats();
	}

	function calculateStats() {
		const tasks = getTasks();
		const habits = getHabits();
		const habitLogs = getHabitLogs();
		const goals = getGoals();
		const journal = getJournalEntries();
		
		// Filter to current week
		const weekTasks = tasks.filter(t => {
			const created = new Date(t.createdAt).toISOString().split("T")[0];
			return created >= weekBounds.start && created <= weekBounds.end;
		});
		
		const weekLogs = habitLogs.filter(l => {
			return l.date >= weekBounds.start && l.date <= weekBounds.end;
		});
		
		const weekJournals = journal.filter((j: JournalEntry) => {
			return j.date >= weekBounds.start && j.date <= weekBounds.end;
		});
		
		// Tasks stats
		weekStats.tasksCompleted = weekTasks.filter(t => t.status === 'completed').length;
		weekStats.tasksTotal = weekTasks.length;
		
		// Habits stats
		const daysInWeek = 7;
		let totalPossible = habits.length * daysInWeek;
		let totalCompleted = 0;
		
		habits.forEach(habit => {
			const logs = weekLogs.filter(l => l.habitId === habit.id && l.count >= habit.targetCount);
			totalCompleted += logs.length;
		});
		
		weekStats.habitsCompletionRate = totalPossible > 0 
			? Math.round((totalCompleted / totalPossible) * 100) 
			: 0;
		
		// Top habits by current streak
		weekStats.topHabits = habits
			.map(h => ({
				title: h.title,
				streak: getHabitStreak(h.id, habitLogs, h.targetCount),
				icon: h.icon || "🎯"
			}))
			.sort((a, b) => b.streak - a.streak)
			.slice(0, 3);
		
		// Goals progress
		weekStats.goalsProgress = goals
			.filter(g => g.status === 'active')
			.map(g => ({
				title: g.title,
				progress: g.progress,
				color: g.color || "#8B5CF6"
			}))
			.slice(0, 4);
		
		// Journal entries
		weekStats.journalEntries = weekJournals.length;
		
		// Mood breakdown
		weekStats.moodBreakdown = {};
		weekJournals.forEach((j: JournalEntry) => {
			if (j.mood) {
				weekStats.moodBreakdown[j.mood] = (weekStats.moodBreakdown[j.mood] || 0) + 1;
			}
		});
	}

	function getHabitStreak(habitId: string, logs: HabitLog[], targetCount: number): number {
		let streak = 0;
		const today = new Date();
		
		for (let i = 0; i < 365; i++) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split("T")[0];
			
			const log = logs.find(l => l.habitId === habitId && l.date === dateStr);
			if (log && log.count >= targetCount) {
				streak++;
			} else if (i > 0) {
				break;
			}
		}
		
		return streak;
	}

	function saveReview() {
		if (review) {
			updateWeeklyReview(review.id, {
				...reviewForm,
				tasksCompleted: weekStats.tasksCompleted,
				tasksTotal: weekStats.tasksTotal,
				habitsCompletionRate: weekStats.habitsCompletionRate,
				journalEntries: weekStats.journalEntries,
			});
		} else {
			const newReview: WeeklyReview = {
				id: Math.random().toString(36).substring(7),
				weekStart: weekBounds.start,
				weekEnd: weekBounds.end,
				tasksCompleted: weekStats.tasksCompleted,
				tasksTotal: weekStats.tasksTotal,
				habitsCompletionRate: weekStats.habitsCompletionRate,
				journalEntries: weekStats.journalEntries,
				wentWell: reviewForm.wentWell,
				toImprove: reviewForm.toImprove,
				focusNextWeek: reviewForm.focusNextWeek,
				productivityScore: reviewForm.productivityScore,
				createdAt: new Date().toISOString(),
			};
			addWeeklyReview(newReview);
		}
		
		isEditing = false;
		loadWeekData();
	}

	function formatDateRange(): string {
		const start = new Date(weekBounds.start);
		const end = new Date(weekBounds.end);
		
		const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
		return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
	}

	function getProductivityColor(score: number): string {
		if (score >= 8) return "#10B981";
		if (score >= 6) return "#8B5CF6";
		if (score >= 4) return "#F59E0B";
		return "#EF4444";
	}
	
	async function generateAISummary() {
		const settings = getSettings();
		if (!settings.ai.apiKey) {
			showToast('error', 'Please configure your AI API key in Settings');
			return;
		}
		
		isGeneratingAI = true;
		hapticFeedback.tap();
		
		try {
			const result = await generateWeeklySummary(settings.ai);
			
			if (result.error) {
				throw new Error(result.error);
			}
			
			aiSummary = result.summary;
			hapticFeedback.success();
			showToast('success', 'AI summary generated!');
		} catch (error) {
			console.error('AI summary error:', error);
			hapticFeedback.error();
			showToast('error', 'Failed to generate AI summary');
		} finally {
			isGeneratingAI = false;
		}
	}
	
	function useAISuggestion(field: 'wentWell' | 'toImprove' | 'focusNextWeek') {
		if (!aiSummary) return;
		
		// Parse AI summary and extract relevant parts
		const lines = aiSummary.split('\n').filter(l => l.trim());
		
		if (field === 'wentWell' && lines.length > 0) {
			reviewForm.wentWell = lines.slice(0, 2).join('\n');
		} else if (field === 'toImprove' && lines.length > 2) {
			reviewForm.toImprove = lines.slice(2, 4).join('\n');
		} else if (field === 'focusNextWeek' && lines.length > 4) {
			reviewForm.focusNextWeek = lines.slice(4).join('\n');
		}
		
		hapticFeedback.tap();
	}
</script>

<Modal bind:show title="Weekly Review" maxWidth="max-w-3xl">
	<div class="space-y-6">
		<!-- Week Header -->
		<div class="text-center pb-4 border-b border-white/10">
			<h3 class="text-lg font-medium text-gray-400">Week of</h3>
			<p class="text-2xl font-heading font-bold mt-1">{formatDateRange()}</p>
		</div>

		<!-- Stats Overview -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="text-center p-4 bg-white/5 rounded-2xl">
				<div class="text-3xl font-bold text-primary">{weekStats.tasksCompleted}</div>
				<div class="text-sm text-gray-400">Tasks Done</div>
				<div class="text-xs text-gray-500">of {weekStats.tasksTotal} total</div>
			</div>
			<div class="text-center p-4 bg-white/5 rounded-2xl">
				<div class="text-3xl font-bold text-secondary">{weekStats.habitsCompletionRate}%</div>
				<div class="text-sm text-gray-400">Habit Rate</div>
			</div>
			<div class="text-center p-4 bg-white/5 rounded-2xl">
				<div class="text-3xl font-bold text-success">{weekStats.journalEntries}</div>
				<div class="text-sm text-gray-400">Journal Entries</div>
			</div>
			<div class="text-center p-4 bg-white/5 rounded-2xl">
				<div 
					class="text-3xl font-bold"
					style="color: {getProductivityColor(reviewForm.productivityScore)}"
				>
					{reviewForm.productivityScore}/10
				</div>
				<div class="text-sm text-gray-400">Productivity</div>
			</div>
		</div>

		<!-- Mood Summary -->
		{#if Object.keys(weekStats.moodBreakdown).length > 0}
			<div class="p-4 bg-white/5 rounded-2xl">
				<h4 class="text-sm font-medium text-gray-400 mb-3">Mood This Week</h4>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(weekStats.moodBreakdown) as [mood, count]}
						<span class="px-3 py-1.5 bg-white/10 rounded-full text-sm">
							{mood} × {count}
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Top Habits -->
		{#if weekStats.topHabits.length > 0}
			<div class="p-4 bg-white/5 rounded-2xl">
				<h4 class="text-sm font-medium text-gray-400 mb-3">Top Habits</h4>
				<div class="space-y-2">
					{#each weekStats.topHabits as habit}
						<div class="flex items-center justify-between">
							<span class="flex items-center gap-2">
								<span class="text-lg">{habit.icon}</span>
								<span>{habit.title}</span>
							</span>
							{#if habit.streak > 0}
								<span class="flex items-center gap-1 text-orange-400 text-sm">
									<span class="mdi mdi-flare"></span>
									{habit.streak} day streak
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Goals Progress -->
		{#if weekStats.goalsProgress.length > 0}
			<div class="p-4 bg-white/5 rounded-2xl">
				<h4 class="text-sm font-medium text-gray-400 mb-3">Active Goals</h4>
				<div class="space-y-3">
					{#each weekStats.goalsProgress as goal}
						<div>
							<div class="flex justify-between text-sm mb-1">
								<span>{goal.title}</span>
								<span class="text-gray-400">{goal.progress}%</span>
							</div>
							<div class="h-2 bg-white/10 rounded-full overflow-hidden">
								<div 
									class="h-full rounded-full transition-all"
									style="width: {goal.progress}%; background: {goal.color}"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
		
		<!-- AI Summary Section -->
		<div class="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl">
			<div class="flex items-center justify-between mb-3">
				<h4 class="text-sm font-medium text-primary flex items-center gap-2">
					<span class="mdi mdi-robot-happy"></span>
					AI Weekly Summary
				</h4>
				<button
					on:click={generateAISummary}
					disabled={isGeneratingAI}
					class="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-full text-xs font-medium text-primary transition-all disabled:opacity-50 flex items-center gap-1"
				>
					{#if isGeneratingAI}
						<span class="mdi mdi-loading mdi-spin"></span>
						Generating...
					{:else}
						<span class="mdi mdi-auto-fix"></span>
						Generate
					{/if}
				</button>
			</div>
			
			{#if aiSummary}
				<div class="p-3 bg-black/20 rounded-xl text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
					{aiSummary}
				</div>
			{:else}
				<p class="text-sm text-gray-400 text-center py-4">
					Click "Generate" to get an AI-powered summary of your week based on your tasks, habits, journal entries, and goals.
				</p>
			{/if}
		</div>

		<!-- Reflection Section -->
		<div class="space-y-4 pt-4 border-t border-white/10">
			<h4 class="text-lg font-semibold">Reflection</h4>
			
			{#if isEditing}
				<div class="space-y-4">
					<div>
						<label for="went-well" class="block text-sm font-medium mb-2 text-gray-300">
							What went well? ✨
						</label>
						<textarea
							id="went-well"
							bind:value={reviewForm.wentWell}
							placeholder="Celebrate your wins..."
							rows="2"
							class="glass-input resize-none"
						></textarea>
					</div>
					
					<div>
						<label for="to-improve" class="block text-sm font-medium mb-2 text-gray-300">
							What could improve? 🔧
						</label>
						<textarea
							id="to-improve"
							bind:value={reviewForm.toImprove}
							placeholder="Areas for growth..."
							rows="2"
							class="glass-input resize-none"
						></textarea>
					</div>
					
					<div>
						<label for="focus-next" class="block text-sm font-medium mb-2 text-gray-300">
							Focus for next week 🎯
						</label>
						<textarea
							id="focus-next"
							bind:value={reviewForm.focusNextWeek}
							placeholder="What will you prioritize?"
							rows="2"
							class="glass-input resize-none"
						></textarea>
					</div>
					
					<div>
						<label for="productivity-score" class="block text-sm font-medium mb-2 text-gray-300">
							Productivity Score: {reviewForm.productivityScore}/10
						</label>
						<input
							id="productivity-score"
							type="range"
							bind:value={reviewForm.productivityScore}
							min="1"
							max="10"
							class="w-full accent-primary"
						/>
					</div>
				</div>
			{:else if review}
				<div class="space-y-4">
					{#if review.wentWell}
						<div class="p-4 bg-success/10 border border-success/20 rounded-xl">
							<h5 class="text-sm font-medium text-success mb-1">✨ What went well</h5>
							<p class="text-gray-300">{review.wentWell}</p>
						</div>
					{/if}
					
					{#if review.toImprove}
						<div class="p-4 bg-warning/10 border border-warning/20 rounded-xl">
							<h5 class="text-sm font-medium text-warning mb-1">🔧 To improve</h5>
							<p class="text-gray-300">{review.toImprove}</p>
						</div>
					{/if}
					
					{#if review.focusNextWeek}
						<div class="p-4 bg-primary/10 border border-primary/20 rounded-xl">
							<h5 class="text-sm font-medium text-primary mb-1">🎯 Focus next week</h5>
							<p class="text-gray-300">{review.focusNextWeek}</p>
						</div>
					{/if}
				</div>
			{:else}
				<div class="text-center py-8 text-gray-400">
					<span class="mdi mdi-notebook-edit-outline text-4xl block mb-2"></span>
					<p>Take a moment to reflect on your week</p>
				</div>
			{/if}
		</div>
	</div>

	<div slot="footer">
		{#if isEditing}
			<button on:click={() => isEditing = false} class="btn btn-secondary">
				Cancel
			</button>
			<button on:click={saveReview} class="btn btn-primary">
				Save Review
			</button>
		{:else}
			<button on:click={() => show = false} class="btn btn-secondary">
				Close
			</button>
			<button on:click={() => isEditing = true} class="btn btn-primary">
				{review ? 'Edit Review' : 'Start Review'}
			</button>
		{/if}
	</div>
</Modal>
