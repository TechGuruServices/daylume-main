<script lang="ts">
	import { onMount } from "svelte";
	import type { CalendarEvent } from "$lib/types";
	import { supabase } from "$lib/supabase";
	import { userStore } from "$lib/user";
	import { showToast } from "$lib/toast";
	import Modal from "$lib/components/Modal.svelte";
	import { CalendarSkeleton } from "$lib/components/skeletons";

	let events: CalendarEvent[] = [];
	let currentDate = new Date();
	let selectedDate: Date | null = null;
	let view: "month" | "week" | "day" = "month";
	let showEventModal = false;
	let editingEvent: CalendarEvent | null = null;
	
	// Loading states
	let isLoading = true;

	// Form state
	let eventForm = {
		title: "",
		date: "",
		time: "",
		endTime: "",
		category: "personal" as CalendarEvent["category"],
		description: "",
		recurring: "none" as CalendarEvent["recurring"],
	};

	onMount(() => {
		loadEvents();
	});

	async function loadEvents() {
		isLoading = true;
		const { data, error } = await supabase.from("events").select("*");
		if (data) {
			events = data.map((e) => ({
				id: e.id,
				title: e.title,
				date: e.date,
				time: e.time,
				endTime: e.end_time,
				category: e.type as CalendarEvent["category"],
				description: e.description,
				recurring:
					(e.recurring as CalendarEvent["recurring"]) || "none",
				createdAt: e.created_at,
				updatedAt: e.created_at,
			}));
		}
		isLoading = false;
	}

	// Calendar calculations
	function getDaysInMonth(date: Date): number {
		return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	}

	function getFirstDayOfMonth(date: Date): number {
		return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
	}

	function getCalendarDays(): (Date | null)[] {
		const daysInMonth = getDaysInMonth(currentDate);
		const firstDay = getFirstDayOfMonth(currentDate);
		const days: (Date | null)[] = [];

		// Add empty cells for days before month starts
		for (let i = 0; i < firstDay; i++) {
			days.push(null);
		}

		// Add days of the month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(
				new Date(currentDate.getFullYear(), currentDate.getMonth(), i),
			);
		}

		return days;
	}

	function getEventsForDate(date: Date | null): CalendarEvent[] {
		if (!date) return [];
		const dateStr = date.toISOString().split("T")[0];
		return events.filter((e) => e.date.startsWith(dateStr));
	}

	function isToday(date: Date | null): boolean {
		if (!date) return false;
		const today = new Date();
		return date.toDateString() === today.toDateString();
	}

	function isSelectedDate(date: Date | null): boolean {
		if (!date || !selectedDate) return false;
		return date.toDateString() === selectedDate.toDateString();
	}

	// Navigation
	function previousMonth() {
		currentDate = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth() - 1,
		);
	}

	function nextMonth() {
		currentDate = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth() + 1,
		);
	}

	function goToday() {
		currentDate = new Date();
	}

	// Event management
	function openNewEventModal(date?: Date) {
		editingEvent = null;
		const targetDate = date || selectedDate || new Date();
		eventForm = {
			title: "",
			date: targetDate.toISOString().split("T")[0],
			time: "",
			endTime: "",
			category: "personal",
			description: "",
			recurring: "none",
		};
		showEventModal = true;
	}

	function openEditEventModal(event: CalendarEvent) {
		editingEvent = event;
		eventForm = {
			title: event.title,
			date: event.date.split("T")[0],
			time: event.time || "",
			endTime: event.endTime || "",
			category: event.category,
			description: event.description || "",
			recurring: event.recurring || "none",
		};
		showEventModal = true;
	}

	async function saveEvent() {
		if (!eventForm.title.trim()) {
			showToast("error", "Please enter an event title");
			return;
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			showToast("error", "You must be logged in to save events");
			return;
		}

		const eventData = {
			user_id: user.id,
			title: eventForm.title.trim(),
			date: eventForm.date,
			time: eventForm.time || null,
			end_time: eventForm.endTime || null,
			type: eventForm.category,
			description: eventForm.description || null,
			recurring: eventForm.recurring,
		};

		try {
			if (editingEvent) {
				// Update existing event
				const { error } = await supabase
					.from("events")
					.update(eventData)
					.eq("id", editingEvent.id);

				if (error) throw error;
				showToast("success", "Event updated");
			} else {
				// Create new event
				const { error } = await supabase
					.from("events")
					.insert(eventData);

				if (error) throw error;
				showToast("success", "Event created");
			}

			await loadEvents();
			showEventModal = false;
		} catch (error) {
			console.error("Error saving event:", error);
			showToast("error", "Failed to save event");
		}
	}

	async function handleDeleteEvent() {
		if (!editingEvent) return;

		if (confirm("Delete this event?")) {
			try {
				const { error } = await supabase
					.from("events")
					.delete()
					.eq("id", editingEvent.id);

				if (error) throw error;

				await loadEvents();
				showEventModal = false;
				showToast("success", "Event deleted");
			} catch (error) {
				console.error("Error deleting event:", error);
				showToast("error", "Failed to delete event");
			}
		}
	}

	const categoryColors = {
		work: "from-blue-500 to-blue-600",
		personal: "from-primary to-primary-600",
		health: "from-success to-success-dark",
		other: "from-gray-500 to-gray-600",
	};

	const monthNames = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-3xl font-heading font-bold">Calendar</h2>
		<button on:click={() => openNewEventModal()} class="btn btn-primary flex items-center gap-2">
			<img src="/assets/glass_10_add.png" alt="Add" class="w-5 h-5" />
			New Event
		</button>
	</div>

	<!-- Calendar View -->
	{#if isLoading}
		<CalendarSkeleton />
	{:else}
	<!-- Calendar Header -->
	<div class="glass-panel rounded-3xl p-6">
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-4">
				<button
					on:click={previousMonth}
					class="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
				>
					<span class="mdi mdi-chevron-left text-2xl"></span>
				</button>
				<h3
					class="text-2xl font-heading font-bold min-w-[200px] text-center"
				>
					{monthNames[currentDate.getMonth()]}
					{currentDate.getFullYear()}
				</h3>
				<button
					on:click={nextMonth}
					class="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
				>
					<span class="mdi mdi-chevron-right text-2xl"></span>
				</button>
			</div>

			<div class="flex items-center gap-2">
				<button on:click={goToday} class="btn btn-secondary">
					Today
				</button>
			</div>
		</div>

		<!-- Calendar Grid -->
		<div class="grid grid-cols-7 gap-2">
			<!-- Day names -->
			{#each dayNames as day}
				<div
					class="text-center font-medium text-gray-400 py-2 uppercase text-xs tracking-wider"
				>
					{day}
				</div>
			{/each}

			<!-- Calendar days -->
			{#each getCalendarDays() as day}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="min-h-[120px] p-2 rounded-2xl border transition-all duration-200 group
					{day
						? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 cursor-pointer'
						: 'border-transparent'} 
					{isToday(day)
						? 'ring-1 ring-primary shadow-[0_0_15px_rgba(139,92,246,0.2)]'
						: ''}
					{isSelectedDate(day) ? 'ring-2 ring-white/50' : ''}"
					on:click={() => day && (selectedDate = day)}
					on:dblclick={() => day && openNewEventModal(day)}
					on:keydown={(e) => {
						if (day && (e.key === 'Enter' || e.key === ' ')) {
							e.preventDefault();
							selectedDate = day;
						}
					}}
					role="button"
					tabindex={day ? 0 : -1}
					aria-label={day ? `${day.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${getEventsForDate(day).length > 0 ? `, ${getEventsForDate(day).length} events` : ''}` : undefined}
				>
					{#if day}
						<div
							class="text-sm font-semibold mb-2 w-7 h-7 flex items-center justify-center rounded-full
							{isToday(day)
								? 'bg-primary text-white'
								: 'text-gray-400 group-hover:text-white'}"
						>
							{day.getDate()}
						</div>
						<div class="space-y-1.5">
							{#each getEventsForDate(day).slice(0, 3) as event}
								<button
									on:click|stopPropagation={() =>
										openEditEventModal(event)}
									class="w-full text-left text-[10px] px-2 py-1 rounded-lg bg-gradient-to-r {categoryColors[
										event.category
									]} text-white truncate shadow-sm hover:brightness-110 transition-all"
								>
									<span class="opacity-75 mr-1"
										>{event.time || "•"}</span
									>
									{event.title}
								</button>
							{/each}
							{#if getEventsForDate(day).length > 3}
								<div
									class="text-[10px] text-gray-400 px-2 font-medium"
								>
									+{getEventsForDate(day).length - 3} more
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
	{/if}

	<!-- Selected Date Events -->
	{#if selectedDate}
		<div class="glass-panel rounded-3xl p-6">
			<h3
				class="text-xl font-heading font-bold mb-4 flex items-center gap-2"
			>
				<span class="mdi mdi-calendar-check text-primary"></span>
				Events for {selectedDate.toLocaleDateString("en-US", {
					weekday: "long",
					month: "long",
					day: "numeric",
				})}
			</h3>
			<div class="space-y-3">
				{#each getEventsForDate(selectedDate) as event}
					<button
						on:click={() => openEditEventModal(event)}
						class="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
					>
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-1">
									<div
										class="w-3 h-3 rounded-full bg-gradient-to-r {categoryColors[
											event.category
										]} shadow-sm"
									></div>
									<h4 class="font-semibold text-lg">
										{event.title}
									</h4>
								</div>
								{#if event.time}
									<p
										class="text-sm text-gray-400 flex items-center gap-1"
									>
										<span
											class="mdi mdi-clock-outline text-xs"
										></span>
										{event.time}{event.endTime
											? ` - ${event.endTime}`
											: ""}
									</p>
								{/if}
								{#if event.description}
									<p
										class="text-sm text-gray-300 mt-2 pl-4 border-l-2 border-white/10"
									>
										{event.description}
									</p>
								{/if}
							</div>
							<div
								class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors p-1.5"
							>
								<img src="/assets/glass_14_edit.png" alt="Edit" class="w-full h-full opacity-60 group-hover:opacity-100" />
							</div>
						</div>
					</button>
				{:else}
					<div
						class="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl"
					>
						<span
							class="mdi mdi-calendar-blank text-4xl text-gray-600 mb-2 block"
						></span>
						<p class="text-gray-400">
							No events scheduled for this day
						</p>
						<button
							on:click={() =>
								selectedDate && openNewEventModal(selectedDate)}
							class="text-primary hover:text-primary-400 text-sm font-medium mt-2"
						>
							+ Add Event
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Event Modal -->
<Modal
	bind:show={showEventModal}
	title={editingEvent ? "Edit Event" : "New Event"}
>
	<div class="space-y-6">
		<div>
			<label for="event-title" class="block text-sm font-medium mb-2 text-gray-300"
				>Event Title *</label
			>
			<input
				id="event-title"
				type="text"
				bind:value={eventForm.title}
				placeholder="What are you planning?"
				class="glass-input"
			/>
		</div>

		<div class="grid grid-cols-2 gap-6">
			<div>
				<label for="event-date" class="block text-sm font-medium mb-2 text-gray-300"
					>Date *</label
				>
				<input
					id="event-date"
					type="date"
					bind:value={eventForm.date}
					class="glass-input"
				/>
			</div>
			<div>
				<label for="event-category" class="block text-sm font-medium mb-2 text-gray-300"
					>Category</label
				>
				<div class="relative">
					<select
						id="event-category"
						bind:value={eventForm.category}
						class="glass-input appearance-none"
					>
						<option value="work" class="bg-[#020617]">Work</option>
						<option value="personal" class="bg-[#020617]"
							>Personal</option
						>
						<option value="health" class="bg-[#020617]"
							>Health</option
						>
						<option value="other" class="bg-[#020617]">Other</option
						>
					</select>
					<span
						class="mdi mdi-chevron-down absolute right-4 top-3.5 text-gray-400 pointer-events-none"
					></span>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-6">
			<div>
				<label for="event-start-time" class="block text-sm font-medium mb-2 text-gray-300"
					>Start Time</label
				>
				<input
					id="event-start-time"
					type="time"
					bind:value={eventForm.time}
					class="glass-input"
				/>
			</div>
			<div>
				<label for="event-end-time" class="block text-sm font-medium mb-2 text-gray-300"
					>End Time</label
				>
				<input
					id="event-end-time"
					type="time"
					bind:value={eventForm.endTime}
					class="glass-input"
				/>
			</div>
		</div>

		<div>
			<label for="event-recurring" class="block text-sm font-medium mb-2 text-gray-300"
				>Repeat</label
			>
			<div class="relative">
				<select
					id="event-recurring"
					bind:value={eventForm.recurring}
					class="glass-input appearance-none"
				>
					<option value="none" class="bg-[#020617]"
						>Does not repeat</option
					>
					<option value="daily" class="bg-[#020617]">Daily</option>
					<option value="weekly" class="bg-[#020617]">Weekly</option>
					<option value="monthly" class="bg-[#020617]">Monthly</option
					>
				</select>
				<span
					class="mdi mdi-chevron-down absolute right-4 top-3.5 text-gray-400 pointer-events-none"
				></span>
			</div>
		</div>

		<div>
			<label for="event-description" class="block text-sm font-medium mb-2 text-gray-300"
				>Description</label
			>
			<textarea
				id="event-description"
				bind:value={eventForm.description}
				placeholder="Add details, location, or notes..."
				rows="3"
				class="glass-input resize-none"
			></textarea>
		</div>
	</div>

	<div slot="footer">
		{#if editingEvent}
			<button
				on:click={handleDeleteEvent}
				class="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20"
			>
				Delete
			</button>
		{/if}
		<button
			on:click={() => (showEventModal = false)}
			class="btn btn-secondary"
		>
			Cancel
		</button>
		<button on:click={saveEvent} class="btn btn-primary">
			{editingEvent ? "Update Event" : "Create Event"}
		</button>
	</div>
</Modal>
