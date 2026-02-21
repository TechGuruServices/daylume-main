<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import type { Task, TaskPriority, TaskStatus } from "$lib/types";
	import { getTasks, saveTasks, addTask, updateTask, deleteTask } from "$lib/storage";
	import { showToast } from "$lib/toast";
	import Modal from "$lib/components/Modal.svelte";
	import SwipeableItem from "$lib/components/SwipeableItem.svelte";
	import PullToRefresh from "$lib/components/PullToRefresh.svelte";
	import { hapticFeedback } from "$lib/haptics";
	import { TaskSkeleton, StatsSkeleton } from "$lib/components/skeletons";

	let tasks: Task[] = [];
	let filteredTasks: Task[] = [];
	let searchQuery = "";
	let filterStatus: TaskStatus | 'all' = 'all';
	let filterPriority: TaskPriority | 'all' = 'all';
	let sortBy: 'dueDate' | 'priority' | 'created' = 'dueDate';
	let showTaskModal = false;
	let editingTask: Task | null = null;
	let pullToRefresh: PullToRefresh;
	
	// Loading states
	let isLoading = true;

	let taskForm = {
		title: "",
		description: "",
		dueDate: "",
		dueTime: "",
		priority: "medium" as TaskPriority,
		category: "",
	};

	const priorities: { value: TaskPriority; label: string; color: string; icon: string }[] = [
		{ value: "urgent", label: "Urgent", color: "text-red-500", icon: "mdi-alert-decagram" },
		{ value: "high", label: "High", color: "text-orange-500", icon: "mdi-chevron-double-up" },
		{ value: "medium", label: "Medium", color: "text-blue-500", icon: "mdi-minus-circle-outline" },
		{ value: "low", label: "Low", color: "text-gray-400", icon: "mdi-chevron-double-down" },
	];

	const statuses: { value: TaskStatus; label: string; color: string }[] = [
		{ value: "pending", label: "Pending", color: "bg-gray-500" },
		{ value: "in-progress", label: "In Progress", color: "bg-blue-500" },
		{ value: "completed", label: "Completed", color: "bg-success" },
		{ value: "cancelled", label: "Cancelled", color: "bg-gray-600" },
	];

	const today = new Date().toISOString().split("T")[0];

	onMount(() => {
		loadTasks();
		
		// Check for PWA shortcut action
		if ($page.url.searchParams.get('action') === 'new') {
			openNewTaskModal();
		}
	});

	function loadTasks() {
		isLoading = true;
		// Simulate async loading for better UX
		setTimeout(() => {
			tasks = getTasks();
			applyFilters();
			isLoading = false;
		}, 150);
	}

	function handleRefresh() {
		hapticFeedback.tap();
		loadTasks();
		showToast("success", "Tasks refreshed");
		pullToRefresh?.complete();
	}

	function applyFilters() {
		let result = [...tasks];

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(t => 
				t.title.toLowerCase().includes(query) ||
				t.description?.toLowerCase().includes(query) ||
				t.category?.toLowerCase().includes(query)
			);
		}

		// Status filter
		if (filterStatus !== 'all') {
			result = result.filter(t => t.status === filterStatus);
		}

		// Priority filter
		if (filterPriority !== 'all') {
			result = result.filter(t => t.priority === filterPriority);
		}

		// Sort
		result.sort((a, b) => {
			if (sortBy === 'dueDate') {
				if (!a.dueDate && !b.dueDate) return 0;
				if (!a.dueDate) return 1;
				if (!b.dueDate) return -1;
				return a.dueDate.localeCompare(b.dueDate);
			} else if (sortBy === 'priority') {
				const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
				return priorityOrder[a.priority] - priorityOrder[b.priority];
			} else {
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			}
		});

		filteredTasks = result;
	}

	$: {
		searchQuery;
		filterStatus;
		filterPriority;
		sortBy;
		applyFilters();
	}

	function openNewTaskModal() {
		editingTask = null;
		taskForm = {
			title: "",
			description: "",
			dueDate: today,
			dueTime: "",
			priority: "medium",
			category: "",
		};
		showTaskModal = true;
	}

	function openEditTaskModal(task: Task) {
		editingTask = task;
		taskForm = {
			title: task.title,
			description: task.description || "",
			dueDate: task.dueDate || "",
			dueTime: task.dueTime || "",
			priority: task.priority,
			category: task.category || "",
		};
		showTaskModal = true;
	}

	function saveTask() {
		if (!taskForm.title.trim()) {
			showToast("error", "Please enter a task title");
			return;
		}

		if (editingTask) {
			updateTask(editingTask.id, {
				title: taskForm.title.trim(),
				description: taskForm.description.trim() || undefined,
				dueDate: taskForm.dueDate || undefined,
				dueTime: taskForm.dueTime || undefined,
				priority: taskForm.priority,
				category: taskForm.category.trim() || undefined,
			});
			showToast("success", "Task updated");
		} else {
			const newTask: Task = {
				id: Math.random().toString(36).substring(7),
				title: taskForm.title.trim(),
				description: taskForm.description.trim() || undefined,
				dueDate: taskForm.dueDate || undefined,
				dueTime: taskForm.dueTime || undefined,
				priority: taskForm.priority,
				status: "pending",
				category: taskForm.category.trim() || undefined,
				createdAt: new Date().toISOString(),
			};
			addTask(newTask);
			showToast("success", "Task created");
		}

		loadTasks();
		showTaskModal = false;
	}

	function toggleTaskStatus(task: Task) {
		const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
		updateTask(task.id, { 
			status: newStatus,
			completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
		});
		loadTasks();
		
		if (newStatus === 'completed') {
			hapticFeedback.success();
			showToast("success", "Task completed! 🎉");
		} else {
			hapticFeedback.tap();
		}
	}

	function handleSwipeComplete(task: Task) {
		hapticFeedback.complete();
		toggleTaskStatus(task);
	}

	function handleSwipeDelete(task: Task) {
		hapticFeedback.delete();
		if (confirm("Delete this task?")) {
			deleteTask(task.id);
			loadTasks();
			showToast("success", "Task deleted");
		}
	}

	function handleDeleteTask() {
		if (editingTask && confirm("Delete this task?")) {
			deleteTask(editingTask.id);
			loadTasks();
			showTaskModal = false;
			showToast("success", "Task deleted");
		}
	}

	function getPriorityConfig(priority: TaskPriority) {
		return priorities.find(p => p.value === priority) || priorities[2];
	}

	function getStatusConfig(status: TaskStatus) {
		return statuses.find(s => s.value === status) || statuses[0];
	}

	function isOverdue(task: Task): boolean {
		if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
		return task.dueDate < today;
	}

	function isDueToday(task: Task): boolean {
		return task.dueDate === today;
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

		if (dateStr === today) return "Today";
		if (diffDays === 1) return "Tomorrow";
		if (diffDays === -1) return "Yesterday";
		if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
		if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
		
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Stats
	$: pendingCount = tasks.filter(t => t.status === 'pending').length;
	$: inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
	$: completedToday = tasks.filter(t => t.status === 'completed' && t.completedAt?.startsWith(today)).length;
	$: overdueCount = tasks.filter(t => isOverdue(t)).length;
</script>

<PullToRefresh bind:this={pullToRefresh} on:refresh={handleRefresh}>
<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h2 class="text-2xl md:text-3xl font-heading font-bold">Tasks</h2>
			<p class="text-gray-400 text-sm mt-1">
				{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
			</p>
		</div>
		<button on:click={openNewTaskModal} class="btn btn-primary flex items-center gap-2">
			<img src="/assets/glass_10_add.png" alt="Add" class="w-5 h-5" />
			New Task
		</button>
	</div>

	<!-- Stats Cards -->
	{#if isLoading}
		<StatsSkeleton count={4} />
	{:else}
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-gray-500 to-gray-600 shadow-gray-500/20">
				<span class="mdi mdi-clock-time-four-outline text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{pendingCount}</div>
				<div class="stat-label">Pending</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20">
				<span class="mdi mdi-progress-helper text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{inProgressCount}</div>
				<div class="stat-label">In Progress</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-success to-emerald-600 shadow-success/20">
				<span class="mdi mdi-check-decagram text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{completedToday}</div>
				<div class="stat-label">Done Today</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-danger to-red-600 shadow-danger/20">
				<span class="mdi mdi-clock-alert-outline text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{overdueCount}</div>
				<div class="stat-label">Overdue</div>
			</div>
		</div>
	</div>
	{/if}

	<!-- Filters -->
	<div class="glass-panel rounded-3xl p-4 md:p-6">
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<!-- Search -->
			<div class="sm:col-span-2 lg:col-span-1">
				<div class="relative">
					<img src="/assets/glass_12_search.png" alt="Search" class="w-5 h-5 absolute left-4 top-3 opacity-60" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search tasks..."
						class="glass-input pl-12"
					/>
				</div>
			</div>

			<!-- Status Filter -->
			<div>
				<div class="relative">
					<select bind:value={filterStatus} class="glass-input appearance-none">
						<option value="all" class="bg-[#020617]">All Status</option>
						{#each statuses as status}
							<option value={status.value} class="bg-[#020617]">{status.label}</option>
						{/each}
					</select>
					<span class="mdi mdi-chevron-down absolute right-4 top-3.5 text-gray-400 pointer-events-none"></span>
				</div>
			</div>

			<!-- Priority Filter -->
			<div>
				<div class="relative">
					<select bind:value={filterPriority} class="glass-input appearance-none">
						<option value="all" class="bg-[#020617]">All Priorities</option>
						{#each priorities as priority}
							<option value={priority.value} class="bg-[#020617]">{priority.label}</option>
						{/each}
					</select>
					<span class="mdi mdi-chevron-down absolute right-4 top-3.5 text-gray-400 pointer-events-none"></span>
				</div>
			</div>

			<!-- Sort -->
			<div>
				<div class="relative">
					<select bind:value={sortBy} class="glass-input appearance-none">
						<option value="dueDate" class="bg-[#020617]">Sort by Due Date</option>
						<option value="priority" class="bg-[#020617]">Sort by Priority</option>
						<option value="created" class="bg-[#020617]">Sort by Created</option>
					</select>
					<span class="mdi mdi-chevron-down absolute right-4 top-3.5 text-gray-400 pointer-events-none"></span>
				</div>
			</div>
		</div>
	</div>

	<!-- Tasks List -->
	<div class="space-y-3">
		<!-- Mobile swipe hint -->
		<p class="text-xs text-gray-500 flex items-center gap-2 md:hidden px-1">
			<span class="mdi mdi-gesture-swipe-horizontal"></span>
			Swipe right to complete, left to delete
		</p>
		
		{#if isLoading}
			<TaskSkeleton count={5} />
		{:else}
		{#each filteredTasks as task (task.id)}
			{@const priorityConfig = getPriorityConfig(task.priority)}
			{@const statusConfig = getStatusConfig(task.status)}
			{@const overdue = isOverdue(task)}
			{@const dueToday = isDueToday(task)}
			
			<SwipeableItem 
				swipeRightAction="complete" 
				swipeLeftAction="delete"
				on:swipeRight={() => handleSwipeComplete(task)}
				on:swipeLeft={() => handleSwipeDelete(task)}
			>
				<div 
					class="glass-card-static p-4 md:p-5 group priority-{task.priority} {overdue ? 'ring-1 ring-danger/50' : ''} {task.status === 'completed' ? 'opacity-60' : ''}"
				>
				<div class="flex items-start gap-4">
					<!-- Checkbox -->
					<button
						on:click={() => toggleTaskStatus(task)}
						class="checkbox-premium flex-shrink-0 mt-0.5 {task.status === 'completed' ? 'checked' : ''}"
					>
						{#if task.status === 'completed'}
							<img src="/assets/glass_11_confirm.png" alt="Complete" class="w-4 h-4" />
						{/if}
					</button>

					<!-- Task Content -->
					<div class="flex-1 min-w-0">
						<div class="flex items-start justify-between gap-3">
							<div class="flex-1 min-w-0">
								<button 
									on:click={() => openEditTaskModal(task)}
									class="text-left w-full"
								>
									<h4 class="font-medium text-base md:text-lg truncate {task.status === 'completed' ? 'line-through text-gray-500' : ''}">
										{task.title}
									</h4>
								</button>
								
								{#if task.description}
									<p class="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</p>
								{/if}

								<!-- Meta Info -->
								<div class="flex flex-wrap items-center gap-2 md:gap-3 mt-3">
									<!-- Priority Badge -->
									<span class="badge {priorityConfig.color === 'text-red-500' ? 'badge-danger' : priorityConfig.color === 'text-orange-500' ? 'badge-warning' : priorityConfig.color === 'text-blue-500' ? 'badge-primary' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}">
										<span class="mdi {priorityConfig.icon} mr-1 text-xs"></span>
										{priorityConfig.label}
									</span>

									<!-- Due Date -->
									{#if task.dueDate}
										<span class="text-xs flex items-center gap-1 {overdue ? 'text-danger' : dueToday ? 'text-warning' : 'text-gray-400'}">
											<span class="mdi mdi-calendar-range"></span>
											{formatDate(task.dueDate)}
											{#if task.dueTime}
												<span>at {task.dueTime}</span>
											{/if}
										</span>
									{/if}

									<!-- Category -->
									{#if task.category}
										<span class="text-xs text-gray-500 flex items-center gap-1">
											<span class="mdi mdi-tag-outline"></span>
											{task.category}
										</span>
									{/if}
								</div>
							</div>

							<!-- Status Indicator -->
							<div class="flex items-center gap-2 flex-shrink-0">
								<span class="w-2 h-2 rounded-full {statusConfig.color}"></span>
								<span class="text-xs text-gray-400 hidden sm:inline">{statusConfig.label}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
			</SwipeableItem>
		{:else}
			<div class="glass-panel rounded-3xl empty-state py-16">
				<div class="empty-state-icon">
					<span class="mdi mdi-clipboard-check-outline text-4xl text-gray-500"></span>
				</div>
				<p class="text-gray-400 text-lg mb-2">
					{searchQuery || filterStatus !== 'all' || filterPriority !== 'all' 
						? "No tasks match your filters" 
						: "No tasks yet"}
				</p>
				{#if !searchQuery && filterStatus === 'all' && filterPriority === 'all'}
					<button on:click={openNewTaskModal} class="text-primary hover:text-primary/80 font-medium">
						+ Create your first task
					</button>
				{/if}
			</div>
		{/each}
		{/if}
	</div>
</div>
</PullToRefresh>

<!-- Task Modal -->
<Modal bind:show={showTaskModal} title={editingTask ? "Edit Task" : "New Task"}>
	<div class="space-y-6">
		<div>
			<label for="task-title" class="block text-sm font-medium mb-2 text-gray-300">Task Title *</label>
			<input
				id="task-title"
				type="text"
				bind:value={taskForm.title}
				placeholder="What needs to be done?"
				class="glass-input"
			/>
		</div>

		<div>
			<label for="task-description" class="block text-sm font-medium mb-2 text-gray-300">Description</label>
			<textarea
				id="task-description"
				bind:value={taskForm.description}
				placeholder="Add details, notes, or context..."
				rows="3"
				class="glass-input resize-none"
			></textarea>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div>
				<label for="task-due-date" class="block text-sm font-medium mb-2 text-gray-300">Due Date</label>
				<input
					id="task-due-date"
					type="date"
					bind:value={taskForm.dueDate}
					class="glass-input"
				/>
			</div>
			<div>
				<label for="task-due-time" class="block text-sm font-medium mb-2 text-gray-300">Due Time</label>
				<input
					id="task-due-time"
					type="time"
					bind:value={taskForm.dueTime}
					class="glass-input"
				/>
			</div>
		</div>

		<div>
			<span class="block text-sm font-medium mb-3 text-gray-300">Priority</span>
			<div class="grid grid-cols-4 gap-2">
				{#each priorities as priority}
					<button
						type="button"
						on:click={() => taskForm.priority = priority.value}
						class="p-3 rounded-xl border transition-all flex flex-col items-center gap-1 {taskForm.priority === priority.value 
							? 'bg-white/10 border-white/20 ring-2 ring-primary/50' 
							: 'bg-white/5 border-white/5 hover:bg-white/10'}"
					>
						<span class="mdi {priority.icon} text-lg {priority.color}"></span>
						<span class="text-xs font-medium">{priority.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<div>
			<label for="task-category" class="block text-sm font-medium mb-2 text-gray-300">Category</label>
			<input
				id="task-category"
				type="text"
				bind:value={taskForm.category}
				placeholder="Work, Personal, Health..."
				class="glass-input"
			/>
		</div>

		{#if editingTask}
			<div>
				<label for="task-status" class="block text-sm font-medium mb-2 text-gray-300">Status</label>
				<div class="relative">
					<select
						id="task-status"
						bind:value={editingTask.status}
						on:change={() => {
							if (editingTask) {
								updateTask(editingTask.id, { status: editingTask.status });
							}
						}}
						class="glass-input appearance-none"
					>
						{#each statuses as status}
							<option value={status.value} class="bg-[#020617]">{status.label}</option>
						{/each}
					</select>
					<span class="mdi mdi-chevron-down absolute right-4 top-3.5 text-gray-400 pointer-events-none"></span>
				</div>
			</div>
		{/if}
	</div>

	<div slot="footer">
		{#if editingTask}
			<button
				on:click={handleDeleteTask}
				class="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20"
			>
				Delete
			</button>
		{/if}
		<button on:click={() => showTaskModal = false} class="btn btn-secondary">
			Cancel
		</button>
		<button on:click={saveTask} class="btn btn-primary">
			{editingTask ? "Update Task" : "Create Task"}
		</button>
	</div>
</Modal>
