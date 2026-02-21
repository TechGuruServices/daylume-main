<script lang="ts">
	import { fade, fly } from "svelte/transition";
	import { toasts } from "$lib/toast";

	function removeToast(id: string) {
		toasts.update((t) => t.filter((toast) => toast.id !== id));
	}

	const icons = {
		success: "mdi-check-circle",
		error: "mdi-alert-circle",
		info: "mdi-information",
		warning: "mdi-alert",
	};

	const colors = {
		success:
			"text-success border-success/30 bg-success/10 shadow-success/20",
		error: "text-danger border-danger/30 bg-danger/10 shadow-danger/20",
		info: "text-info border-info/30 bg-info/10 shadow-info/20",
		warning:
			"text-warning border-warning/30 bg-warning/10 shadow-warning/20",
	};
</script>

<div
	class="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
>
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto glass-panel rounded-2xl p-4 flex items-center gap-4 shadow-lg border backdrop-blur-xl {colors[
				toast.type
			]}"
			transition:fly={{ y: -20, duration: 300 }}
		>
			<div
				class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"
			>
				<span class="mdi {icons[toast.type]} text-xl"></span>
			</div>

			<div class="flex-1 min-w-0">
				<p class="text-sm font-medium text-white">{toast.message}</p>
			</div>

			<button
				on:click={() => removeToast(toast.id)}
				class="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
			>
				<span class="mdi mdi-close text-sm opacity-60 hover:opacity-100"
				></span>
			</button>
		</div>
	{/each}
</div>
