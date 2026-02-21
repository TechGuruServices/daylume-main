<script lang="ts">
	import { onMount } from "svelte";
	import type { Habit, HabitFrequency, HabitLog } from "$lib/types";
	import {
		getHabits,
		addHabit,
		updateHabit,
		deleteHabit,
		getHabitLogs,
		getOrCreateHabitLog,
		updateHabitLog,
		getHabitStreak
	} from "$lib/storage";
	import { showToast } from "$lib/toast";
	import Modal from "$lib/components/Modal.svelte";
	import { hapticFeedback } from "$lib/haptics";
	import { HabitSkeleton, StatsSkeleton } from "$lib/components/skeletons";

	let habits: Habit[] = [];
	let habitLogs: Map<string, HabitLog> = new Map();
	let showHabitModal = false;
	let editingHabit: Habit | null = null;
	let selectedDate = new Date().toISOString().split("T")[0];

	// Loading states
	let isLoading = true;

	let habitForm = {
		title: "",
		description: "",
		frequency: "daily" as HabitFrequency,
		targetCount: 1,
		icon: "🎯",
		color: "#8B5CF6",
	};

	const frequencyOptions: { value: HabitFrequency; label: string; description: string }[] = [
		{ value: "daily", label: "Daily", description: "Every day" },
		{ value: "weekly", label: "Weekly", description: "Once a week" },
		{ value: "monthly", label: "Monthly", description: "Once a month" },
	];

	const iconOptions = ["🎯", "💪", "📚", "🧘", "💧", "🏃", "💤", "🥗", "✍️", "🎨", "🎵", "💊", "🧹", "💰", "📱", "🚭"];
	const colorOptions = ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#14B8A6"];

	onMount(() => {
		loadData();
	});

	function loadData() {
		isLoading = true;
		// Simulate async loading for better UX
		setTimeout(() => {
			habits = getHabits();
			loadLogsForDate(selectedDate);
			isLoading = false;
		}, 150);
	}

	function handleRefresh() {
		hapticFeedback.tap();
		loadData();
		showToast("success", "Habits refreshed");
	}

	function loadLogsForDate(date: string) {
		const allLogs = getHabitLogs().filter(l => l.date === date);
		habitLogs = new Map(allLogs.map(l => [l.habitId, l]));
	}

	function openNewHabitModal() {
		editingHabit = null;
		habitForm = {
			title: "",
			description: "",
			frequency: "daily",
			targetCount: 1,
			icon: "🎯",
			color: "#8B5CF6",
		};
		showHabitModal = true;
	}

	function openEditHabitModal(habit: Habit) {
		editingHabit = habit;
		habitForm = {
			title: habit.title,
			description: habit.description || "",
			frequency: habit.frequency,
			targetCount: habit.targetCount,
			icon: habit.icon || "🎯",
			color: habit.color || "#8B5CF6",
		};
		showHabitModal = true;
	}

	function saveHabit() {
		if (!habitForm.title.trim()) {
			showToast("error", "Please enter a habit name");
			return;
		}

		if (editingHabit) {
			updateHabit(editingHabit.id, {
				title: habitForm.title.trim(),
				description: habitForm.description.trim() || undefined,
				frequency: habitForm.frequency,
				targetCount: habitForm.targetCount,
				icon: habitForm.icon,
				color: habitForm.color,
			});
			showToast("success", "Habit updated");
		} else {
			const newHabit: Habit = {
				id: Math.random().toString(36).substring(7),
				title: habitForm.title.trim(),
				description: habitForm.description.trim() || undefined,
				frequency: habitForm.frequency,
				targetCount: habitForm.targetCount,
				icon: habitForm.icon,
				color: habitForm.color,
				createdAt: new Date().toISOString(),
			};
			addHabit(newHabit);
			showToast("success", "Habit created");
		}

		loadData();
		showHabitModal = false;
	}

	function handleDeleteHabit() {
		if (editingHabit && confirm("Delete this habit? All progress will be lost.")) {
			deleteHabit(editingHabit.id);
			loadData();
			showHabitModal = false;
			showToast("success", "Habit deleted");
		}
	}

	function incrementHabit(habitId: string) {
		const log = getOrCreateHabitLog(habitId, selectedDate);
		const habit = habits.find(h => h.id === habitId);
		if (!habit) return;

		if (log.count < habit.targetCount) {
			updateHabitLog(log.id, { count: log.count + 1 });
			loadLogsForDate(selectedDate);

			if (log.count + 1 >= habit.targetCount) {
				showToast("success", `${habit.title} completed! 🎉`);
			}
		}
	}

	function decrementHabit(habitId: string) {
		const log = getOrCreateHabitLog(habitId, selectedDate);
		if (log.count > 0) {
			updateHabitLog(log.id, { count: log.count - 1 });
			loadLogsForDate(selectedDate);
		}
	}

	function getHabitProgress(habit: Habit): number {
		const log = habitLogs.get(habit.id);
		return log ? Math.min((log.count / habit.targetCount) * 100, 100) : 0;
	}

	function getHabitCount(habitId: string): number {
		return habitLogs.get(habitId)?.count || 0;
	}

	function isCompleted(habit: Habit): boolean {
		return getHabitCount(habit.id) >= habit.targetCount;
	}

	// Navigate dates
	function previousDay() {
		const date = new Date(selectedDate);
		date.setDate(date.getDate() - 1);
		selectedDate = date.toISOString().split("T")[0];
		loadLogsForDate(selectedDate);
	}

	function nextDay() {
		const today = new Date().toISOString().split("T")[0];
		if (selectedDate >= today) return;

		const date = new Date(selectedDate);
		date.setDate(date.getDate() + 1);
		selectedDate = date.toISOString().split("T")[0];
		loadLogsForDate(selectedDate);
	}

	function goToday() {
		selectedDate = new Date().toISOString().split("T")[0];
		loadLogsForDate(selectedDate);
	}

	function formatSelectedDate(): string {
		const today = new Date().toISOString().split("T")[0];
		if (selectedDate === today) return "Today";

		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		if (selectedDate === yesterday.toISOString().split("T")[0]) return "Yesterday";

		return new Date(selectedDate).toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric"
		});
	}

	// Generate last 7 days for mini calendar
	function getLast7Days(): { date: string; completed: number; total: number }[] {
		const days: { date: string; completed: number; total: number }[] = [];
		const allLogs = getHabitLogs();

		for (let i = 6; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split("T")[0];

			const dayLogs = allLogs.filter(l => l.date === dateStr);
			let completed = 0;

			habits.forEach(habit => {
				const log = dayLogs.find(l => l.habitId === habit.id);
				if (log && log.count >= habit.targetCount) {
					completed++;
				}
			});

			days.push({ date: dateStr, completed, total: habits.length });
		}

		return days;
	}

	// Stats
	$: totalHabits = habits.length;
	$: completedToday = habits.filter(h => isCompleted(h)).length;
	$: longestStreak = habits.reduce((max, h) => Math.max(max, getHabitStreak(h.id)), 0);
	$: completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
	$: last7Days = getLast7Days();
	$: isToday = selectedDate === new Date().toISOString().split("T")[0];
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h2 class="text-2xl md:text-3xl font-heading font-bold">Habits</h2>
			<p class="text-gray-400 text-sm mt-1">Build consistency, one day at a time</p>
		</div>
		<button on:click={openNewHabitModal} class="btn btn-primary flex items-center gap-2">
			<img src="/assets/glass_10_add.png" alt="Add" class="w-5 h-5" />
			New Habit
		</button>
	</div>

	<!-- Stats Cards -->
	{#if isLoading}
		<StatsSkeleton count={4} />
	{:else}
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-primary to-violet-600 shadow-primary/20">
				<span class="mdi mdi-bullseye-arrow text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{totalHabits}</div>
				<div class="stat-label">Active</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-success to-emerald-600 shadow-success/20">
				<span class="mdi mdi-check-decagram-outline text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{completedToday}/{totalHabits}</div>
				<div class="stat-label">Today</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/20">
				<span class="mdi mdi-flare text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{longestStreak}</div>
				<div class="stat-label">Best Streak</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-secondary to-cyan-600 shadow-secondary/20">
				<span class="mdi mdi-chart-donut text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{completionRate}%</div>
				<div class="stat-label">Complete</div>
			</div>
		</div>
	</div>
	{/if}

	<!-- Week Overview -->
	<div class="glass-panel rounded-3xl p-4 md:p-6">
		<h3 class="text-sm font-medium text-gray-400 mb-4">Last 7 Days</h3>
		<div class="grid grid-cols-7 gap-2">
			{#each last7Days as day}
				{@const isSelected = day.date === selectedDate}
				{@const isTodayDate = day.date === new Date().toISOString().split("T")[0]}
				{@const completionPercent = day.total > 0 ? (day.completed / day.total) * 100 : 0}
				<button
					on:click={() => { selectedDate = day.date; loadLogsForDate(day.date); }}
					class="flex flex-col items-center p-2 md:p-3 rounded-xl transition-all {isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'bg-white/5 hover:bg-white/10'}"
				>
					<span class="text-xs text-gray-400 mb-1">
						{new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
					</span>
					<span class="text-sm font-medium {isTodayDate ? 'text-primary' : ''}">
						{new Date(day.date).getDate()}
					</span>
					<div class="w-6 h-1 rounded-full mt-2 bg-white/10 overflow-hidden">
						<div
							class="h-full bg-gradient-to-r from-primary to-secondary transition-all"
							style="width: {completionPercent}%"
						></div>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Date Navigation -->
	<div class="flex items-center justify-between px-2">
		<button
			on:click={previousDay}
			aria-label="Previous day"
			class="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
		>
			<span class="mdi mdi-chevron-left text-2xl"></span>
		</button>
		<div class="flex items-center gap-3">
			<h3 class="text-xl font-heading font-semibold">{formatSelectedDate()}</h3>
			{#if !isToday}
				<button on:click={goToday} class="text-xs text-primary hover:text-primary/80 font-medium">
					Go to today
				</button>
			{/if}
		</div>
		<button
			on:click={nextDay}
			disabled={isToday}
			aria-label="Next day"
			class="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
		>
			<span class="mdi mdi-chevron-right text-2xl"></span>
		</button>
	</div>

	<!-- Habits List -->
	<div class="space-y-4">
		{#if isLoading}
			<HabitSkeleton count={4} />
		{:else}
		{#each habits as habit (habit.id)}
			{@const progress = getHabitProgress(habit)}
			{@const count = getHabitCount(habit.id)}
			{@const completed = isCompleted(habit)}
			{@const streak = getHabitStreak(habit.id)}

			<div
				class="glass-card-static p-5 md:p-6 {completed ? 'ring-1 ring-success/30 bg-success/5' : ''}"
				style="--habit-color: {habit.color}"
			>
				<div class="flex items-start gap-4">
					<!-- Icon -->
					<button
						on:click={() => openEditHabitModal(habit)}
						class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform hover:scale-110"
						style="background: linear-gradient(135deg, {habit.color}30, {habit.color}10); border: 1px solid {habit.color}40"
					>
						{habit.icon || '🎯'}
					</button>

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<div class="flex items-start justify-between gap-3 mb-3">
							<div>
								<h4 class="font-semibold text-lg {completed ? 'text-success' : ''}">{habit.title}</h4>
								{#if habit.description}
									<p class="text-sm text-gray-400 mt-0.5">{habit.description}</p>
								{/if}
							</div>

							<!-- Streak Badge -->
							{#if streak > 0}
								<div class="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium flex-shrink-0">
									<span class="mdi mdi-fire"></span>
									{streak}
								</div>
							{/if}
						</div>

						<!-- Progress Bar -->
						<div class="relative h-3 bg-white/10 rounded-full overflow-hidden mb-3">
							<div
								class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
								style="width: {progress}%; background: linear-gradient(90deg, {habit.color}, {habit.color}cc)"
							></div>
						</div>

						<!-- Controls -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium">{count} / {habit.targetCount}</span>
								<span class="text-xs text-gray-500">
									{habit.frequency === 'daily' ? 'per day' : habit.frequency === 'weekly' ? 'per week' : 'per month'}
								</span>
							</div>

							<div class="flex items-center gap-2">
								<button
									on:click={() => decrementHabit(habit.id)}
									disabled={count === 0}
									aria-label="Decrease habit count"
									class="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
								>
									<span class="mdi mdi-minus"></span>
								</button>
								<button
									on:click={() => incrementHabit(habit.id)}
									disabled={completed}
									aria-label="Increase habit count"
									class="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
									style="background: linear-gradient(135deg, {habit.color}, {habit.color}cc)"
								>
									<span class="mdi {completed ? 'mdi-check' : 'mdi-plus'} text-white"></span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="glass-panel rounded-3xl empty-state py-16">
				<div class="empty-state-icon">
					<span class="mdi mdi-fire text-4xl text-gray-500"></span>
				</div>
				<p class="text-gray-400 text-lg mb-2">No habits yet</p>
				<p class="text-gray-500 text-sm mb-4">Start building better habits today</p>
				<button on:click={openNewHabitModal} class="btn btn-primary flex items-center gap-2">
					<img src="/assets/glass_10_add.png" alt="Add" class="w-5 h-5" />
					Create your first habit
				</button>
			</div>
		{/each}
		{/if}
	</div>
</div>

<!-- Habit Modal -->
<Modal bind:show={showHabitModal} title={editingHabit ? "Edit Habit" : "New Habit"}>
	<div class="space-y-6">
		<div>
			<label for="habit-title" class="block text-sm font-medium mb-2 text-gray-300">Habit Name *</label>
			<input
				id="habit-title"
				type="text"
				bind:value={habitForm.title}
				placeholder="e.g., Drink water, Read, Exercise..."
				class="glass-input"
			/>
		</div>

		<div>
			<label for="habit-description" class="block text-sm font-medium mb-2 text-gray-300">Description</label>
			<textarea
				id="habit-description"
				bind:value={habitForm.description}
				placeholder="Why is this habit important to you?"
				rows="2"
				class="glass-input resize-none"
			></textarea>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="habit-frequency" class="block text-sm font-medium mb-2 text-gray-300">Frequency</label>
				<div class="relative">
					<select id="habit-frequency" bind:value={habitForm.frequency} class="glass-input appearance-none">
						{#each frequencyOptions as option}
							<option value={option.value} class="bg-[#020617]">{option.label}</option>
						{/each}
					</select>
					<span class="mdi mdi-chevron-down absolute right-4 top-3.5 text-gray-400 pointer-events-none"></span>
				</div>
			</div>
			<div>
				<label for="habit-target" class="block text-sm font-medium mb-2 text-gray-300">Target Count</label>
				<input
					id="habit-target"
					type="number"
					bind:value={habitForm.targetCount}
					min="1"
					max="100"
					class="glass-input"
				/>
			</div>
		</div>

		<div>
			<span class="block text-sm font-medium mb-3 text-gray-300">Icon</span>
			<div class="grid grid-cols-8 gap-2">
				{#each iconOptions as icon}
					<button
						type="button"
						on:click={() => habitForm.icon = icon}
						class="w-10 h-10 rounded-xl border transition-all flex items-center justify-center text-xl {habitForm.icon === icon
							? 'bg-white/10 border-white/20 ring-2 ring-primary/50'
							: 'bg-white/5 border-white/5 hover:bg-white/10'}"
					>
						{icon}
					</button>
				{/each}
			</div>
		</div>

		<div>
			<span class="block text-sm font-medium mb-3 text-gray-300">Color</span>
			<div class="flex gap-2 flex-wrap">
				{#each colorOptions as color}
					<button
						type="button"
						on:click={() => habitForm.color = color}
						class="w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center {habitForm.color === color
							? 'ring-2 ring-white/50 scale-110'
							: 'border-transparent hover:scale-105'}"
						style="background: {color}"
					>
						{#if habitForm.color === color}
							<img src="/assets/glass_11_confirm.png" alt="Selected" class="w-5 h-5" />
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div slot="footer">
		{#if editingHabit}
			<button
				on:click={handleDeleteHabit}
				class="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20"
			>
				Delete
			</button>
		{/if}
		<button on:click={() => showHabitModal = false} class="btn btn-secondary">
			Cancel
		</button>
		<button on:click={saveHabit} class="btn btn-primary">
			{editingHabit ? "Update Habit" : "Create Habit"}
		</button>
	</div>
</Modal>
