<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { supabase } from "$lib/supabase";
	import { userStore } from "$lib/user";
	import Weather from "$lib/components/Weather.svelte";
	import WeeklyReview from "$lib/components/WeeklyReview.svelte";
	import BottomSheet from "$lib/components/BottomSheet.svelte";
	import WidgetGrid from "$lib/components/widgets/WidgetGrid.svelte";
	import WidgetPicker from "$lib/components/widgets/WidgetPicker.svelte";
	import NotificationSettings from "$lib/components/NotificationSettings.svelte";
	import { widgetStore } from "$lib/widgets";
	import type { CalendarEvent, Task, Habit, HabitLog, Goal, InboxItem } from "$lib/types";
	import {
		getTasks,
		updateTask,
		getHabits,
		getHabitLogs,
		getOrCreateHabitLog,
		updateHabitLog,
		getActiveGoals,
		getHabitStreak,
		addTask
	} from "$lib/storage";
	import { showToast } from "$lib/toast";

	import { hapticFeedback } from "$lib/haptics";
	import {
		DashboardSkeleton,
		TaskSkeleton,
		HabitSkeleton,
		EventSkeleton,
		GoalSkeleton
	} from "$lib/components/skeletons";

	let eventsToday: CalendarEvent[] = [];
	let tasksToday: Task[] = [];
	let allPendingTasks: Task[] = [];
	let habits: Habit[] = [];
	let habitLogs: Map<string, HabitLog> = new Map();
	let goals: Goal[] = [];
	let greeting = "";
	let progress = 0;
	let todayStr = "";
	let currentTime = "";
	let showWeeklyReview = false;

	// Loading states
	let isLoading = true;
	let eventsLoading = true;
	let tasksLoading = true;
	let habitsLoading = true;
	let goalsLoading = true;

	// Quick Capture
	let showQuickCapture = false;
	let quickCaptureText = "";

	// Widget System
	let widgetEditMode = false;
	let showWidgetPicker = false;
	let showNotificationSettings = false;
	let viewMode: 'classic' | 'widgets' = 'classic';

	// Time update interval
	let timeInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		// Get greeting based on time
		updateGreetingAndTime();
		timeInterval = setInterval(updateGreetingAndTime, 1000);

		todayStr = new Date().toISOString().split("T")[0];

		// Load data from Supabase
		loadEvents();

		// Load local data
		loadLocalData();

		// Mark overall loading complete after a brief delay for smooth transition
		setTimeout(() => {
			isLoading = false;
		}, 300);

		// Check for Quick Capture PWA shortcut
		if ($page.url.searchParams.get('capture') === 'true') {
			showQuickCapture = true;
		}

		// Check for widget mode preference
		const savedViewMode = localStorage.getItem('daylume-view-mode');
		if (savedViewMode === 'widgets') {
			viewMode = 'widgets';
		}

		return () => {
			if (timeInterval) clearInterval(timeInterval);
		};
	});

	function toggleViewMode() {
		viewMode = viewMode === 'classic' ? 'widgets' : 'classic';
		localStorage.setItem('daylume-view-mode', viewMode);
		hapticFeedback.tap();
	}

	function toggleWidgetEditMode() {
		widgetEditMode = !widgetEditMode;
		hapticFeedback.tap();
		if (!widgetEditMode) {
			showToast("success", "Widgets saved!");
		}
	}

	function handleQuickCapture() {
		if (!quickCaptureText.trim()) {
			showToast("error", "Please enter something to capture");
			return;
		}

		// Create a new task from the quick capture
		const newTask: Task = {
			id: Math.random().toString(36).substring(7),
			title: quickCaptureText.trim(),
			priority: "medium",
			status: "pending",
			createdAt: new Date().toISOString(),
		};

		addTask(newTask);
		hapticFeedback.success();
		showToast("success", "Captured to tasks! ✨");
		quickCaptureText = "";
		showQuickCapture = false;
		loadLocalData();
	}

	function updateGreetingAndTime() {
		const now = new Date();
		const hour = now.getHours();

		if (hour < 12) greeting = "Good morning";
		else if (hour < 17) greeting = "Good afternoon";
		else if (hour < 21) greeting = "Good evening";
		else greeting = "Good night";

		currentTime = now.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true
		});
	}

	async function loadEvents() {
		eventsLoading = true;
		const { data: events } = await supabase
			.from("events")
			.select("*")
			.eq("date", todayStr);

		if (events) {
			eventsToday = events
				.map((e) => ({
					id: e.id,
					title: e.title,
					date: e.date,
					time: e.time,
					endTime: e.end_time,
					category: e.type as CalendarEvent["category"],
					description: e.description,
					recurring: (e.recurring as CalendarEvent["recurring"]) || "none",
					createdAt: e.created_at,
					updatedAt: e.created_at,
				}))
				.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
		}
		eventsLoading = false;
	}

	function loadLocalData() {
		tasksLoading = true;
		habitsLoading = true;
		goalsLoading = true;

		// Load tasks
		const allTasks = getTasks();
		tasksToday = allTasks.filter(t => t.dueDate === todayStr && t.status !== 'completed');
		allPendingTasks = allTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
		tasksLoading = false;

		// Load habits
		habits = getHabits();
		const todayLogs = getHabitLogs().filter(l => l.date === todayStr);
		habitLogs = new Map(todayLogs.map(l => [l.habitId, l]));
		habitsLoading = false;

		// Load goals
		goals = getActiveGoals().slice(0, 3);
		goalsLoading = false;

		// Calculate overall progress
		calculateProgress();
	}

	function calculateProgress() {
		let completed = 0;
		let total = 0;

		// Tasks progress
		const todayTasks = getTasks().filter(t => t.dueDate === todayStr);
		const completedTasks = todayTasks.filter(t => t.status === 'completed').length;
		total += todayTasks.length;
		completed += completedTasks;

		// Habits progress
		habits.forEach(habit => {
			total += habit.targetCount;
			const log = habitLogs.get(habit.id);
			completed += Math.min(log?.count || 0, habit.targetCount);
		});

		// Events - count attended (assume past events are done)
		const now = new Date();
		const currentTimeStr = now.toTimeString().slice(0, 5);
		const pastEvents = eventsToday.filter(e => !e.time || e.time < currentTimeStr);
		total += eventsToday.length;
		completed += pastEvents.length;

		progress = total > 0 ? Math.round((completed / total) * 100) : 0;
	}

	function toggleTaskComplete(task: Task) {
		const newStatus = task.status === 'completed' ? 'pending' : 'completed';
		updateTask(task.id, {
			status: newStatus,
			completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
		});
		loadLocalData();
		showToast("success", newStatus === 'completed' ? "Task completed! 🎉" : "Task reopened");
	}

	function incrementHabit(habitId: string) {
		const log = getOrCreateHabitLog(habitId, todayStr);
		updateHabitLog(log.id, { count: log.count + 1 });
		loadLocalData();
	}

	function getHabitProgress(habit: Habit): number {
		const log = habitLogs.get(habit.id);
		return log ? Math.min((log.count / habit.targetCount) * 100, 100) : 0;
	}

	function getHabitCount(habitId: string): number {
		return habitLogs.get(habitId)?.count || 0;
	}

	function getPriorityBadge(priority: Task['priority']): string {
		const badges: Record<string, string> = {
			urgent: 'badge-danger',
			high: 'badge-warning',
			medium: 'badge-primary',
			low: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
		};
		return badges[priority] || badges.medium;
	}

	const quickActions = [
		{ label: "Add Task", icon: "/assets/glass_10_add.png", href: "/tasks", color: "from-primary to-violet-600" },
		{ label: "Add Event", icon: "/assets/glass_04_calendar.png", href: "/calendar", color: "from-secondary to-cyan-600" },
		{ label: "Log Habit", icon: "/assets/glass_03_habits.png", href: "/habits", color: "from-orange-500 to-amber-600" },
		{ label: "Review Week", icon: "/assets/glass_insights-analytics.png", action: () => showWeeklyReview = true, color: "from-pink-500 to-rose-600" },
	];

	const eventCategoryColors: Record<string, string> = {
		work: 'bg-blue-500',
		personal: 'bg-primary',
		health: 'bg-success',
		other: 'bg-gray-500'
	};

	const goalCategoryColors: Record<string, string> = {
		health: 'from-emerald-500 to-green-600',
		career: 'from-blue-500 to-indigo-600',
		personal: 'from-purple-500 to-violet-600',
		financial: 'from-yellow-500 to-amber-600',
		learning: 'from-cyan-500 to-teal-600',
		relationships: 'from-pink-500 to-rose-600',
		other: 'from-gray-500 to-slate-600'
	};
</script>

<div class="space-y-6 md:space-y-8">
	<!-- Hero Section -->
	{#if isLoading}
		<DashboardSkeleton />
	{:else}
	<div class="premium-card p-6 md:p-8 relative overflow-hidden">
		<div class="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
		<div class="absolute bottom-0 left-0 w-48 md:w-72 h-48 md:h-72 bg-secondary/15 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2"></div>

		<div class="relative z-10">
			<!-- Top Row: Time Badge + Weather (Desktop) -->
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-4">
					<div class="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-base md:text-lg font-semibold text-white">
						<span class="w-2.5 h-2.5 rounded-full bg-success animate-pulse"></span>
						{currentTime}
					</div>
					<!-- Weather Widget - Desktop (next to clock) -->
					<div class="hidden lg:block">
						<Weather />
					</div>
				</div>
			</div>

			<!-- Main Content Row -->
			<div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8">
				<div class="flex-1">
					<h1 class="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-2 tracking-tight">
						{greeting}{#if $userStore?.name}, <span class="text-gradient-primary">{$userStore.name}</span>{/if}
					</h1>
					<p class="text-gray-400 text-base md:text-lg">
						{new Date().toLocaleDateString("en-US", {
							weekday: "long",
							month: "long",
							day: "numeric",
							year: "numeric",
						})}
					</p>

					<!-- Weather Widget - Mobile -->
					<div class="mt-4 lg:hidden">
						<Weather />
					</div>

					<!-- Quick Stats -->
					<div class="flex flex-wrap items-center gap-4 md:gap-6 mt-6 md:mt-8">
						<div class="flex flex-col">
							<span class="text-2xl md:text-3xl font-bold text-white">{tasksToday.length}</span>
							<span class="text-xs text-gray-400 uppercase tracking-wider">Tasks Today</span>
						</div>
						<div class="w-px h-10 bg-white/10"></div>
						<div class="flex flex-col">
							<span class="text-2xl md:text-3xl font-bold text-white">{eventsToday.length}</span>
							<span class="text-xs text-gray-400 uppercase tracking-wider">Events</span>
						</div>
						<div class="w-px h-10 bg-white/10"></div>
						<div class="flex flex-col">
							<span class="text-2xl md:text-3xl font-bold text-white">{habits.length}</span>
							<span class="text-xs text-gray-400 uppercase tracking-wider">Habits</span>
						</div>
					</div>
				</div>

				<!-- Progress Circle -->
				<!-- Progress Circle -->
				<div class="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0 flex items-center justify-center self-center lg:self-auto">
					<svg class="w-full h-full transform -rotate-90">
						<circle
							cx="50%"
							cy="50%"
							r="45%"
							stroke="currentColor"
							stroke-width="8"
							fill="transparent"
							class="text-white/5"
						/>
						<circle
							cx="50%"
							cy="50%"
							r="45%"
							stroke="url(#progressGradient)"
							stroke-width="8"
							fill="transparent"
							stroke-dasharray="283"
							stroke-dashoffset={283 - (283 * progress) / 100}
							class="transition-all duration-1000 ease-out"
							stroke-linecap="round"
						/>
						<defs>
							<linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
								<stop offset="0%" stop-color="rgb(139, 92, 246)" />
								<stop offset="100%" stop-color="rgb(236, 72, 153)" />
							</linearGradient>
						</defs>
					</svg>
					<div class="absolute inset-0 flex flex-col items-center justify-center">
						<span class="text-2xl md:text-3xl font-bold">{progress}%</span>
						<span class="text-[10px] text-gray-400 uppercase tracking-wider">Today</span>
					</div>
				</div>
			</div>
		</div>
	</div>
	{/if}

	<!-- View Mode Toggle + Notification Settings -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
			<button
				on:click={() => { viewMode = 'classic'; localStorage.setItem('daylume-view-mode', 'classic'); hapticFeedback.tap(); }}
				class="px-4 py-2 rounded-lg text-sm font-medium transition-all {viewMode === 'classic' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}"
			>
				Classic
			</button>
			<button
				on:click={() => { viewMode = 'widgets'; localStorage.setItem('daylume-view-mode', 'widgets'); hapticFeedback.tap(); }}
				class="px-4 py-2 rounded-lg text-sm font-medium transition-all {viewMode === 'widgets' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}"
			>
				Widgets
			</button>
		</div>

		<div class="flex items-center gap-2">
			{#if viewMode === 'widgets'}
				<button
					on:click={toggleWidgetEditMode}
					class="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
						{widgetEditMode ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}"
				>
					<span class="mdi mdi-{widgetEditMode ? 'check' : 'pencil'}"></span>
					{widgetEditMode ? 'Done' : 'Edit'}
				</button>
				{#if widgetEditMode}
					<button
						on:click={() => showWidgetPicker = true}
						class="px-3 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-400 hover:text-white border border-white/10 transition-all flex items-center gap-2"
					>
						<span class="mdi mdi-plus"></span>
						Add
					</button>
				{/if}
			{/if}
			<button
				on:click={() => showNotificationSettings = true}
				class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
				title="Notification Settings"
			>
				<span class="mdi mdi-bell-cog"></span>
			</button>
		</div>
	</div>

	<!-- Widget View -->
	{#if viewMode === 'widgets'}
		<div class="glass-panel rounded-3xl p-5 md:p-6">
			<WidgetGrid editMode={widgetEditMode} />
		</div>
	{:else}

	<!-- Quick Actions - Mobile Optimized -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
		{#each quickActions as action}
			{#if action.href}
				<a
					href={action.href}
					class="glass-card p-4 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 group touch-target"
				>
					<div class="w-10 h-10 rounded-xl bg-gradient-to-br {action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform p-1.5">
						<img src={action.icon} alt={action.label} class="w-full h-full object-contain" />
					</div>
					<span class="font-medium text-sm md:text-base text-center">{action.label}</span>
				</a>
			{:else}
				<button
					on:click={action.action}
					class="glass-card p-4 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 group touch-target"
				>
					<div class="w-10 h-10 rounded-xl bg-gradient-to-br {action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform p-1.5">
						<img src={action.icon} alt={action.label} class="w-full h-full object-contain" />
					</div>
					<span class="font-medium text-sm md:text-base text-center">{action.label}</span>
				</button>
			{/if}
		{/each}
	</div>

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Today's Tasks -->
		<div class="lg:col-span-2 glass-panel rounded-3xl p-5 md:p-6">
			<div class="flex items-center justify-between mb-5">
				<h3 class="text-lg font-heading font-semibold flex items-center gap-2">
					<img src="/assets/glass_02_tasks.png" alt="Tasks" class="w-6 h-6" />
					Today's Tasks
				</h3>
				<a href="/tasks" class="text-sm text-primary hover:text-primary/80 font-medium">
					View All →
				</a>
			</div>

			{#if tasksLoading}
				<TaskSkeleton count={3} />
			{:else if tasksToday.length > 0}
				<div class="space-y-3">
					{#each tasksToday.slice(0, 5) as task (task.id)}
						<div class="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/8 transition-colors group priority-{task.priority}">
							<button
								on:click={() => toggleTaskComplete(task)}
								class="checkbox-premium flex-shrink-0 {task.status === 'completed' ? 'checked' : ''}"
							>
								{#if task.status === 'completed'}
									<img src="/assets/glass_11_confirm.png" alt="Complete" class="w-4 h-4" />
								{/if}
							</button>
							<div class="flex-1 min-w-0">
								<p class="font-medium truncate {task.status === 'completed' ? 'line-through text-gray-500' : ''}">{task.title}</p>
								<div class="flex items-center gap-2 mt-1">
									{#if task.dueTime}
										<span class="text-xs text-gray-400 flex items-center gap-1">
											<span class="mdi mdi-clock-outline text-xs"></span>
											{task.dueTime}
										</span>
									{/if}
									<span class="badge {getPriorityBadge(task.priority)} text-[10px]">
										{task.priority}
									</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state py-8">
					<div class="empty-state-icon">
						<span class="mdi mdi-clipboard-text-outline text-3xl text-gray-500"></span>
					</div>
					<p class="text-gray-400 mb-2">No tasks for today</p>
					<a href="/tasks" class="text-primary hover:text-primary/80 text-sm font-medium">
						+ Add a task
					</a>
				</div>
			{/if}
		</div>

		<!-- Today's Habits -->
		<div class="glass-panel rounded-3xl p-5 md:p-6">
			<div class="flex items-center justify-between mb-5">
				<h3 class="text-lg font-heading font-semibold flex items-center gap-2">
					<img src="/assets/glass_03_habits.png" alt="Habits" class="w-6 h-6" />
					Habits
				</h3>
				<a href="/habits" class="text-sm text-primary hover:text-primary/80 font-medium">
					View All →
				</a>
			</div>

			{#if habitsLoading}
				<HabitSkeleton count={3} />
			{:else if habits.length > 0}
				<div class="space-y-4">
					{#each habits.slice(0, 4) as habit (habit.id)}
						{@const habitProgress = getHabitProgress(habit)}
						{@const count = getHabitCount(habit.id)}
						{@const streak = getHabitStreak(habit.id)}
						<div class="p-4 rounded-2xl bg-white/5 border border-white/5">
							<div class="flex items-center justify-between mb-3">
								<div class="flex items-center gap-3">
									<span class="text-2xl">{habit.icon || '🎯'}</span>
									<div>
										<p class="font-medium text-sm">{habit.title}</p>
										<p class="text-xs text-gray-400">{count}/{habit.targetCount} today</p>
									</div>
								</div>
								<button
									on:click={() => incrementHabit(habit.id)}
									class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 flex items-center justify-center hover:from-primary/30 hover:to-secondary/30 transition-all active:scale-95 p-2"
									disabled={count >= habit.targetCount}
								>
									{#if count >= habit.targetCount}
										<img src="/assets/glass_11_confirm.png" alt="Complete" class="w-full h-full" />
									{:else}
										<img src="/assets/glass_10_add.png" alt="Add" class="w-full h-full" />
									{/if}
								</button>
							</div>
							<div class="relative h-2 bg-white/10 rounded-full overflow-hidden">
								<div
									class="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
									style="width: {habitProgress}%"
								></div>
							</div>
							{#if streak > 0}
								<p class="text-xs text-orange-400 mt-2 flex items-center gap-1">
									<span class="mdi mdi-flare"></span>
									{streak} day streak
								</p>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state py-8">
					<div class="empty-state-icon">
						<span class="mdi mdi-star-shooting-outline text-3xl text-gray-500"></span>
					</div>
					<p class="text-gray-400 mb-2">No habits tracked yet</p>
					<a href="/habits" class="text-primary hover:text-primary/80 text-sm font-medium">
						+ Create a habit
					</a>
				</div>
			{/if}
		</div>
	</div>

	<!-- Second Row: Events + Goals -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Today's Events Timeline -->
		<div class="glass-panel rounded-3xl p-5 md:p-6">
			<div class="flex items-center justify-between mb-5">
				<h3 class="text-lg font-heading font-semibold flex items-center gap-2">
					<img src="/assets/glass_04_calendar.png" alt="Calendar" class="w-6 h-6" />
					Today's Schedule
				</h3>
				<a href="/calendar" class="text-sm text-primary hover:text-primary/80 font-medium">
					View Calendar →
				</a>
			</div>

			{#if eventsLoading}
				<EventSkeleton count={3} />
			{:else if eventsToday.length > 0}
				<div class="space-y-1">
					{#each eventsToday as event (event.id)}

						<div class="timeline-item">
							<div class="flex items-start gap-3">
								<div class="text-sm text-gray-400 w-16 flex-shrink-0 pt-0.5">
									{event.time || 'All day'}
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<div class="w-2 h-2 rounded-full {eventCategoryColors[event.category]}"></div>
										<p class="font-medium">{event.title}</p>
									</div>
									{#if event.endTime}
										<p class="text-xs text-gray-400 mt-0.5">Until {event.endTime}</p>
									{/if}
									{#if event.description}
										<p class="text-sm text-gray-400 mt-1 line-clamp-1">{event.description}</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state py-8">
					<div class="empty-state-icon">
						<span class="mdi mdi-calendar-star-outline text-3xl text-gray-500"></span>
					</div>
					<p class="text-gray-400 mb-2">No events scheduled</p>
					<a href="/calendar" class="text-primary hover:text-primary/80 text-sm font-medium">
						+ Schedule an event
					</a>
				</div>
			{/if}
		</div>

		<!-- Active Goals -->
		<div class="glass-panel rounded-3xl p-5 md:p-6">
			<div class="flex items-center justify-between mb-5">
				<h3 class="text-lg font-heading font-semibold flex items-center gap-2">
					<img src="/assets/glass_07_goals.png" alt="Goals" class="w-6 h-6" />
					Active Goals
				</h3>
				<a href="/goals" class="text-sm text-primary hover:text-primary/80 font-medium">
					View All →
				</a>
			</div>

			{#if goalsLoading}
				<GoalSkeleton count={2} />
			{:else if goals.length > 0}
				<div class="space-y-4">
					{#each goals as goal (goal.id)}

						<a href="/goals" class="block p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/8 transition-colors group">
							<div class="flex items-center gap-3 mb-3">
								<div class="w-10 h-10 rounded-xl bg-gradient-to-br {goalCategoryColors[goal.category]} flex items-center justify-center shadow-lg">
									<span class="text-lg">{goal.icon || '🎯'}</span>
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium truncate">{goal.title}</p>
									<p class="text-xs text-gray-400 capitalize">{goal.category}</p>
								</div>
								<span class="text-lg font-bold text-primary">{goal.progress}%</span>
							</div>
							<div class="relative h-2 bg-white/10 rounded-full overflow-hidden">
								<div
									class="absolute inset-y-0 left-0 bg-gradient-to-r {goalCategoryColors[goal.category]} rounded-full transition-all duration-500"
									style="width: {goal.progress}%"
								></div>
							</div>
							{#if goal.targetDate}
								<p class="text-xs text-gray-400 mt-2 flex items-center gap-1">
									<span class="mdi mdi-calendar-clock text-xs"></span>
									Target: {new Date(goal.targetDate).toLocaleDateString()}
								</p>
							{/if}
						</a>
					{/each}
				</div>
			{:else}
				<div class="empty-state py-8">
					<div class="empty-state-icon">
						<span class="mdi mdi-rocket-launch-outline text-3xl text-gray-500"></span>
					</div>
					<p class="text-gray-400 mb-2">No active goals</p>
					<a href="/goals" class="text-primary hover:text-primary/80 text-sm font-medium">
						+ Set a goal
					</a>
				</div>
			{/if}
		</div>
	</div>

	<!-- Upcoming Tasks Preview -->
	{#if allPendingTasks.length > tasksToday.length}
		<div class="glass-panel rounded-3xl p-5 md:p-6">
			<div class="flex items-center justify-between mb-5">
				<h3 class="text-lg font-heading font-semibold flex items-center gap-2">
					<span class="mdi mdi-clock-fast text-warning"></span>
					Upcoming Tasks
				</h3>
				<span class="text-sm text-gray-400">{allPendingTasks.length - tasksToday.length} remaining</span>
			</div>
			<div class="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scroll-smooth">
				{#each allPendingTasks.filter(t => t.dueDate !== todayStr).slice(0, 6) as task (task.id)}
					<div class="flex-shrink-0 w-48 p-4 rounded-2xl bg-white/5 border border-white/5">
						<p class="font-medium text-sm truncate mb-2">{task.title}</p>
						<div class="flex items-center justify-between">
							<span class="text-xs text-gray-400">
								{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
							</span>
							<span class="badge {getPriorityBadge(task.priority)} text-[10px]">
								{task.priority}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{/if}
	<!-- End of Classic View conditional -->

	<!-- Footer -->
	<div class="text-center pt-4 pb-8 space-y-2">
		<p class="text-gray-400 font-medium tracking-wide">
			Daylume — Bring Your Day Into Focus
		</p>
		<p class="text-xs text-gray-600 uppercase tracking-widest">
			powered by TECHGURU
		</p>
	</div>
</div>

<!-- Weekly Review Modal -->
<WeeklyReview bind:show={showWeeklyReview} />

<!-- Widget Picker Modal -->
<WidgetPicker bind:show={showWidgetPicker} on:close={() => showWidgetPicker = false} />

<!-- Notification Settings Modal -->
<NotificationSettings bind:show={showNotificationSettings} on:close={() => showNotificationSettings = false} />

<!-- Quick Capture Bottom Sheet -->
<BottomSheet bind:open={showQuickCapture} title="Quick Capture" snapPoints={[0.4, 0.6]}>
	<div class="space-y-4">
		<p class="text-gray-400 text-sm">Quickly capture a thought, task, or idea</p>

		<textarea
			bind:value={quickCaptureText}
			placeholder="What's on your mind?"
			rows="4"
			class="glass-input w-full resize-none text-lg"
		></textarea>

		<div class="flex gap-3">
			<button
				on:click={() => showQuickCapture = false}
				class="btn btn-secondary flex-1"
			>
				Cancel
			</button>
			<button
				on:click={handleQuickCapture}
				class="btn btn-primary flex-1"
			>
				<span class="mdi mdi-check mr-2"></span>
				Capture
			</button>
		</div>
	</div>
</BottomSheet>

<!-- Floating Quick Capture Button (Mobile) -->
<button
	on:click={() => { showQuickCapture = true; hapticFeedback.tap(); }}
	aria-label="Quick capture new thought"
	class="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30 flex items-center justify-center text-white z-50 active:scale-95 transition-transform md:hidden safe-bottom"
>
	<span class="mdi mdi-plus text-2xl"></span>
</button>
