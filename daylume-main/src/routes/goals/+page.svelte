<script lang="ts">
	import { onMount } from "svelte";
	import type { Goal, GoalCategory, GoalStatus, GoalMilestone } from "$lib/types";
	import { getGoals, addGoal, updateGoal, deleteGoal } from "$lib/storage";
	import { showToast } from "$lib/toast";
	import Modal from "$lib/components/Modal.svelte";
	import { GoalSkeleton, StatsSkeleton } from "$lib/components/skeletons";

	let goals: Goal[] = [];
	let showGoalModal = false;
	let showMilestoneModal = false;
	let editingGoal: Goal | null = null;
	let activeFilter: GoalStatus | 'all' = 'active';
	let categoryFilter: GoalCategory | 'all' = 'all';
	
	// Loading states
	let isLoading = true;

	const statusFilters = ['all', 'active', 'completed', 'paused'] as const;

	function setStatusFilter(status: typeof statusFilters[number]) {
		activeFilter = status;
	}

	let goalForm = {
		title: "",
		description: "",
		category: "personal" as GoalCategory,
		targetDate: "",
		icon: "🎯",
		color: "#8B5CF6",
	};

	let milestoneForm = {
		title: "",
		description: "",
		targetDate: "",
	};

	let editingMilestoneGoal: Goal | null = null;
	let editingMilestoneIndex: number = -1;

	const categoryOptions: { value: GoalCategory; label: string; icon: string }[] = [
		{ value: "health", label: "Health", icon: "heart-pulse" },
		{ value: "career", label: "Career", icon: "briefcase-variant" },
		{ value: "personal", label: "Personal", icon: "account-star" },
		{ value: "financial", label: "Financial", icon: "chart-line-variant" },
		{ value: "learning", label: "Learning", icon: "book-education" },
		{ value: "relationships", label: "Relationships", icon: "account-heart" },
		{ value: "other", label: "Other", icon: "star-four-points" },
	];

	const iconOptions = ["🎯", "🏆", "💪", "📚", "💰", "❤️", "🧠", "🌟", "🚀", "🎓", "🏃", "🧘", "✨", "🔥", "💎", "🌈"];
	const colorOptions = ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#14B8A6"];

	onMount(() => {
		loadGoals();
	});

	function loadGoals() {
		isLoading = true;
		// Simulate async loading for better UX
		setTimeout(() => {
			goals = getGoals();
			isLoading = false;
		}, 150);
	}

	function getFilteredGoals(): Goal[] {
		let filtered = goals;
		
		if (activeFilter !== 'all') {
			filtered = filtered.filter(g => g.status === activeFilter);
		}
		
		if (categoryFilter !== 'all') {
			filtered = filtered.filter(g => g.category === categoryFilter);
		}
		
		return filtered.sort((a, b) => {
			// Active goals first, then by progress
			if (a.status === 'active' && b.status !== 'active') return -1;
			if (b.status === 'active' && a.status !== 'active') return 1;
			return b.progress - a.progress;
		});
	}

	function openNewGoalModal() {
		editingGoal = null;
		goalForm = {
			title: "",
			description: "",
			category: "personal",
			targetDate: "",
			icon: "🎯",
			color: "#8B5CF6",
		};
		showGoalModal = true;
	}

	function openEditGoalModal(goal: Goal) {
		editingGoal = goal;
		goalForm = {
			title: goal.title,
			description: goal.description || "",
			category: goal.category,
			targetDate: goal.targetDate || "",
			icon: goal.icon || "🎯",
			color: goal.color || "#8B5CF6",
		};
		showGoalModal = true;
	}

	function saveGoal() {
		if (!goalForm.title.trim()) {
			showToast("error", "Please enter a goal title");
			return;
		}

		if (editingGoal) {
			updateGoal(editingGoal.id, {
				title: goalForm.title.trim(),
				description: goalForm.description.trim() || undefined,
				category: goalForm.category,
				targetDate: goalForm.targetDate || undefined,
				icon: goalForm.icon,
				color: goalForm.color,
			});
			showToast("success", "Goal updated");
		} else {
			const newGoal: Goal = {
				id: Math.random().toString(36).substring(7),
				title: goalForm.title.trim(),
				description: goalForm.description.trim() || undefined,
				category: goalForm.category,
				status: "active",
				targetDate: goalForm.targetDate || undefined,
				milestones: [],
				progress: 0,
				icon: goalForm.icon,
				color: goalForm.color,
				createdAt: new Date().toISOString(),
			};
			addGoal(newGoal);
			showToast("success", "Goal created");
		}

		loadGoals();
		showGoalModal = false;
	}

	function handleDeleteGoal() {
		if (editingGoal && confirm("Delete this goal? All milestones will be lost.")) {
			deleteGoal(editingGoal.id);
			loadGoals();
			showGoalModal = false;
			showToast("success", "Goal deleted");
		}
	}

	function updateGoalStatus(goal: Goal, status: GoalStatus) {
		updateGoal(goal.id, { 
			status,
			completedAt: status === 'completed' ? new Date().toISOString() : undefined,
			progress: status === 'completed' ? 100 : goal.progress
		});
		loadGoals();
		
		if (status === 'completed') {
			showToast("success", `🎉 Goal "${goal.title}" completed!`);
		}
	}

	// Milestone functions
	function openAddMilestoneModal(goal: Goal) {
		editingMilestoneGoal = goal;
		editingMilestoneIndex = -1;
		milestoneForm = {
			title: "",
			description: "",
			targetDate: "",
		};
		showMilestoneModal = true;
	}

	function openEditMilestoneModal(goal: Goal, index: number) {
		const milestone = goal.milestones[index];
		editingMilestoneGoal = goal;
		editingMilestoneIndex = index;
		milestoneForm = {
			title: milestone.title,
			description: milestone.description || "",
			targetDate: milestone.targetDate || "",
		};
		showMilestoneModal = true;
	}

	function saveMilestone() {
		if (!milestoneForm.title.trim() || !editingMilestoneGoal) {
			showToast("error", "Please enter a milestone title");
			return;
		}

		const milestones = [...editingMilestoneGoal.milestones];

		if (editingMilestoneIndex >= 0) {
			// Edit existing
			milestones[editingMilestoneIndex] = {
				...milestones[editingMilestoneIndex],
				title: milestoneForm.title.trim(),
				description: milestoneForm.description.trim() || undefined,
				targetDate: milestoneForm.targetDate || undefined,
			};
		} else {
			// Add new
			milestones.push({
				id: Math.random().toString(36).substring(7),
				title: milestoneForm.title.trim(),
				description: milestoneForm.description.trim() || undefined,
				targetDate: milestoneForm.targetDate || undefined,
				isCompleted: false,
			});
		}

		updateGoal(editingMilestoneGoal.id, { 
			milestones,
			progress: calculateProgress(milestones)
		});
		loadGoals();
		showMilestoneModal = false;
		showToast("success", editingMilestoneIndex >= 0 ? "Milestone updated" : "Milestone added");
	}

	function toggleMilestone(goal: Goal, index: number) {
		const milestones = [...goal.milestones];
		milestones[index] = {
			...milestones[index],
			isCompleted: !milestones[index].isCompleted,
			completedAt: !milestones[index].isCompleted ? new Date().toISOString() : undefined,
		};

		const progress = calculateProgress(milestones);
		updateGoal(goal.id, { milestones, progress });
		loadGoals();

		if (progress === 100) {
			showToast("success", "🎉 All milestones complete!");
		}
	}

	function deleteMilestone(goal: Goal, index: number) {
		if (confirm("Delete this milestone?")) {
			const milestones = goal.milestones.filter((_, i) => i !== index);
			updateGoal(goal.id, { 
				milestones,
				progress: calculateProgress(milestones)
			});
			loadGoals();
			showToast("success", "Milestone deleted");
		}
	}

	function calculateProgress(milestones: GoalMilestone[]): number {
		if (milestones.length === 0) return 0;
		const completed = milestones.filter(m => m.isCompleted).length;
		return Math.round((completed / milestones.length) * 100);
	}

	function getCategoryIcon(category: GoalCategory): string {
		return categoryOptions.find(c => c.value === category)?.icon || 'star';
	}

	function formatDate(dateStr?: string): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric"
		});
	}

	function getDaysRemaining(targetDate?: string): { text: string; urgent: boolean } {
		if (!targetDate) return { text: '', urgent: false };
		
		const target = new Date(targetDate);
		const today = new Date();
		const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		
		if (diff < 0) return { text: `${Math.abs(diff)} days overdue`, urgent: true };
		if (diff === 0) return { text: 'Due today', urgent: true };
		if (diff === 1) return { text: 'Due tomorrow', urgent: true };
		if (diff <= 7) return { text: `${diff} days left`, urgent: true };
		return { text: `${diff} days left`, urgent: false };
	}

	// Stats
	$: filteredGoals = getFilteredGoals();
	$: totalGoals = goals.length;
	$: activeGoals = goals.filter(g => g.status === 'active').length;
	$: completedGoals = goals.filter(g => g.status === 'completed').length;
	$: averageProgress = goals.length > 0 
		? Math.round(goals.filter(g => g.status === 'active').reduce((sum, g) => sum + g.progress, 0) / Math.max(activeGoals, 1))
		: 0;
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h2 class="text-2xl md:text-3xl font-heading font-bold">Goals</h2>
			<p class="text-gray-400 text-sm mt-1">Track your long-term objectives</p>
		</div>
		<button on:click={openNewGoalModal} class="btn btn-primary flex items-center gap-2">
			<img src="/assets/glass_10_add.png" alt="Add" class="w-5 h-5" />
			New Goal
		</button>
	</div>

	<!-- Stats Cards -->
	{#if isLoading}
		<StatsSkeleton count={4} />
	{:else}
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-primary to-violet-600 shadow-primary/20">
				<span class="mdi mdi-bullseye text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{totalGoals}</div>
				<div class="stat-label">Total Goals</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-secondary to-cyan-600 shadow-secondary/20">
				<span class="mdi mdi-rocket-launch-outline text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{activeGoals}</div>
				<div class="stat-label">In Progress</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-success to-emerald-600 shadow-success/20">
				<span class="mdi mdi-trophy-award text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{completedGoals}</div>
				<div class="stat-label">Completed</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/20">
				<span class="mdi mdi-trending-up text-xl text-white"></span>
			</div>
			<div>
				<div class="stat-value">{averageProgress}%</div>
				<div class="stat-label">Avg Progress</div>
			</div>
		</div>
	</div>
	{/if}

	<!-- Filters -->
	<div class="flex flex-wrap gap-2">
		<div class="flex gap-1 bg-white/5 p-1 rounded-xl">
			{#each statusFilters as status (status)}
				<button
					on:click={() => setStatusFilter(status)}
					class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all {activeFilter === status 
						? 'bg-white/10 text-white' 
						: 'text-gray-400 hover:text-white'}"
				>
					{status.charAt(0).toUpperCase() + status.slice(1)}
				</button>
			{/each}
		</div>
		<div class="relative">
			<select 
				bind:value={categoryFilter}
				class="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
			>
				<option value="all" class="bg-[#020617]">All Categories</option>
				{#each categoryOptions as cat}
					<option value={cat.value} class="bg-[#020617]">{cat.label}</option>
				{/each}
			</select>
			<span class="mdi mdi-chevron-down absolute right-3 top-2.5 text-gray-400 pointer-events-none"></span>
		</div>
	</div>

	<!-- Goals List -->
	<div class="space-y-4">
		{#if isLoading}
			<GoalSkeleton count={3} />
		{:else}
		{#each filteredGoals as goal (goal.id)}
			{@const daysInfo = getDaysRemaining(goal.targetDate)}
			{@const catIcon = getCategoryIcon(goal.category)}
			
			<div class="glass-card-static p-5 md:p-6 {goal.status === 'completed' ? 'ring-1 ring-success/30 bg-success/5' : ''}">
				<div class="flex items-start gap-4">
					<!-- Icon -->
					<button
						on:click={() => openEditGoalModal(goal)}
						class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform hover:scale-110"
						style="background: linear-gradient(135deg, {goal.color}30, {goal.color}10); border: 1px solid {goal.color}40"
					>
						{goal.icon || '🎯'}
					</button>

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<div class="flex items-start justify-between gap-3 mb-2">
							<div>
								<h4 class="font-semibold text-lg {goal.status === 'completed' ? 'line-through text-gray-400' : ''}">{goal.title}</h4>
								{#if goal.description}
									<p class="text-sm text-gray-400 mt-0.5 line-clamp-2">{goal.description}</p>
								{/if}
							</div>
							
							<!-- Status Actions -->
							<div class="flex items-center gap-2 flex-shrink-0">
								{#if goal.status === 'active'}
									<button
										on:click={() => updateGoalStatus(goal, 'completed')}
										class="w-8 h-8 rounded-lg bg-success/20 text-success hover:bg-success hover:text-white flex items-center justify-center transition-all"
										title="Mark complete"
									>
										<span class="mdi mdi-check"></span>
									</button>
									<button
										on:click={() => updateGoalStatus(goal, 'paused')}
										class="w-8 h-8 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center transition-all"
										title="Pause goal"
									>
										<span class="mdi mdi-pause"></span>
									</button>
								{:else if goal.status === 'paused'}
									<button
										on:click={() => updateGoalStatus(goal, 'active')}
										class="w-8 h-8 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all"
										title="Resume goal"
									>
										<span class="mdi mdi-play"></span>
									</button>
								{:else if goal.status === 'completed'}
									<span class="badge badge-success">
										<span class="mdi mdi-check-circle mr-1"></span>
										Completed
									</span>
								{/if}
							</div>
						</div>

						<!-- Meta info -->
						<div class="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
							<span class="flex items-center gap-1">
								<span class="mdi mdi-{catIcon}"></span>
								{categoryOptions.find(c => c.value === goal.category)?.label}
							</span>
							{#if goal.targetDate}
								<span class="flex items-center gap-1 {daysInfo.urgent ? 'text-warning' : ''}">
									<span class="mdi mdi-calendar"></span>
									{formatDate(goal.targetDate)}
									{#if daysInfo.text && goal.status === 'active'}
										<span class="text-gray-500">•</span>
										<span class="{daysInfo.urgent ? 'text-warning' : ''}">{daysInfo.text}</span>
									{/if}
								</span>
							{/if}
						</div>

						<!-- Progress Bar -->
						<div class="mb-4">
							<div class="flex justify-between items-center mb-1">
								<span class="text-sm text-gray-400">Progress</span>
								<span class="text-sm font-medium">{goal.progress}%</span>
							</div>
							<div class="relative h-2 bg-white/10 rounded-full overflow-hidden">
								<div 
									class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
									style="width: {goal.progress}%; background: linear-gradient(90deg, {goal.color}, {goal.color}cc)"
								></div>
							</div>
						</div>

						<!-- Milestones -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-gray-300">Milestones ({goal.milestones.filter(m => m.isCompleted).length}/{goal.milestones.length})</span>
								{#if goal.status === 'active'}
									<button 
										on:click={() => openAddMilestoneModal(goal)}
										class="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
									>
										<img src="/assets/glass_10_add.png" alt="Add" class="w-4 h-4" /> Add
									</button>
								{/if}
							</div>
							
							{#if goal.milestones.length > 0}
								<div class="space-y-1.5">
									{#each goal.milestones as milestone, i}
										<div class="flex items-center gap-3 group p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors">
												<button
													on:click={() => toggleMilestone(goal, i)}
													class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
														{milestone.isCompleted 
															? 'bg-success border-success' 
															: 'border-gray-500 hover:border-gray-400'}"
												>
													{#if milestone.isCompleted}
														<img src="/assets/glass_11_confirm.png" alt="Complete" class="w-3 h-3" />
													{/if}
												</button>
											<span class="flex-1 text-sm {milestone.isCompleted ? 'line-through text-gray-500' : ''}">
												{milestone.title}
												{#if milestone.targetDate}
													<span class="text-gray-500 ml-2">• {formatDate(milestone.targetDate)}</span>
												{/if}
											</span>
											<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<button 
														on:click={() => openEditMilestoneModal(goal, i)}
														class="w-6 h-6 rounded text-gray-400 hover:text-white flex items-center justify-center p-1"
													>
														<img src="/assets/glass_14_edit.png" alt="Edit" class="w-full h-full opacity-60 hover:opacity-100" />
													</button>
													<button 
														on:click={() => deleteMilestone(goal, i)}
														class="w-6 h-6 rounded text-gray-400 hover:text-danger flex items-center justify-center p-1"
													>
														<img src="/assets/glass_15_delete.png" alt="Delete" class="w-full h-full opacity-60 hover:opacity-100" />
													</button>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-gray-500 italic">No milestones yet</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="glass-panel rounded-3xl empty-state py-16">
				<div class="empty-state-icon">
					<span class="mdi mdi-trophy text-4xl text-gray-500"></span>
				</div>
				<p class="text-gray-400 text-lg mb-2">No goals found</p>
				<p class="text-gray-500 text-sm mb-4">
					{#if activeFilter !== 'all' || categoryFilter !== 'all'}
						Try adjusting your filters
					{:else}
						Set your first goal and start achieving
					{/if}
				</p>
				{#if activeFilter === 'all' && categoryFilter === 'all'}
					<button on:click={openNewGoalModal} class="btn btn-primary flex items-center gap-2">
						<img src="/assets/glass_10_add.png" alt="Add" class="w-5 h-5" />
						Create your first goal
					</button>
				{/if}
			</div>
		{/each}
		{/if}
	</div>
</div>

<!-- Goal Modal -->
<Modal bind:show={showGoalModal} title={editingGoal ? "Edit Goal" : "New Goal"}>
	<div class="space-y-6">
		<div>
			<label for="goal-title" class="block text-sm font-medium mb-2 text-gray-300">Goal Title *</label>
			<input
				id="goal-title"
				type="text"
				bind:value={goalForm.title}
				placeholder="e.g., Run a marathon, Learn Spanish..."
				class="glass-input"
			/>
		</div>

		<div>
			<label for="goal-description" class="block text-sm font-medium mb-2 text-gray-300">Description</label>
			<textarea
				id="goal-description"
				bind:value={goalForm.description}
				placeholder="Why is this goal important to you?"
				rows="3"
				class="glass-input resize-none"
			></textarea>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="goal-category" class="block text-sm font-medium mb-2 text-gray-300">Category</label>
				<div class="relative">
					<select id="goal-category" bind:value={goalForm.category} class="glass-input appearance-none">
						{#each categoryOptions as option}
							<option value={option.value} class="bg-[#020617]">{option.label}</option>
						{/each}
					</select>
					<span class="mdi mdi-chevron-down absolute right-4 top-3.5 text-gray-400 pointer-events-none"></span>
				</div>
			</div>
			<div>
				<label for="goal-target-date" class="block text-sm font-medium mb-2 text-gray-300">Target Date</label>
				<input
					id="goal-target-date"
					type="date"
					bind:value={goalForm.targetDate}
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
						on:click={() => goalForm.icon = icon}
						class="w-10 h-10 rounded-xl border transition-all flex items-center justify-center text-xl {goalForm.icon === icon 
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
						on:click={() => goalForm.color = color}
						class="w-10 h-10 rounded-xl border-2 transition-all {goalForm.color === color 
							? 'ring-2 ring-white/50 scale-110' 
							: 'border-transparent hover:scale-105'}"
						style="background: {color}"
					>
						{#if goalForm.color === color}
							<span class="mdi mdi-check text-white"></span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div slot="footer">
		{#if editingGoal}
			<button
				on:click={handleDeleteGoal}
				class="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20"
			>
				Delete
			</button>
		{/if}
		<button on:click={() => showGoalModal = false} class="btn btn-secondary">
			Cancel
		</button>
		<button on:click={saveGoal} class="btn btn-primary">
			{editingGoal ? "Update Goal" : "Create Goal"}
		</button>
	</div>
</Modal>

<!-- Milestone Modal -->
<Modal bind:show={showMilestoneModal} title={editingMilestoneIndex >= 0 ? "Edit Milestone" : "Add Milestone"}>
	<div class="space-y-4">
		<div>
			<label for="milestone-title" class="block text-sm font-medium mb-2 text-gray-300">Milestone *</label>
			<input
				id="milestone-title"
				type="text"
				bind:value={milestoneForm.title}
				placeholder="e.g., Complete Week 1 training..."
				class="glass-input"
			/>
		</div>

		<div>
			<label for="milestone-description" class="block text-sm font-medium mb-2 text-gray-300">Description</label>
			<input
				id="milestone-description"
				type="text"
				bind:value={milestoneForm.description}
				placeholder="Optional details..."
				class="glass-input"
			/>
		</div>

		<div>
			<label for="milestone-date" class="block text-sm font-medium mb-2 text-gray-300">Target Date</label>
			<input
				id="milestone-date"
				type="date"
				bind:value={milestoneForm.targetDate}
				class="glass-input"
			/>
		</div>
	</div>

	<div slot="footer">
		<button on:click={() => showMilestoneModal = false} class="btn btn-secondary">
			Cancel
		</button>
		<button on:click={saveMilestone} class="btn btn-primary">
			{editingMilestoneIndex >= 0 ? "Update" : "Add"} Milestone
		</button>
	</div>
</Modal>
