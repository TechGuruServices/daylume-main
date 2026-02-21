<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { fade, scale } from "svelte/transition";

	export let show = false;
	export let title = "";
	export let maxWidth = "max-w-2xl";

	const dispatch = createEventDispatcher();

	function handleClose() {
		dispatch("close");
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && show) {
			handleClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
	<!-- Backdrop overlay - using presentation role since it's just a visual backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-md"
		on:click={handleBackdropClick}
		transition:fade={{ duration: 200 }}
		role="presentation"
	>
		<div
			class="w-full {maxWidth} glass-panel rounded-3xl relative overflow-hidden"
			transition:scale={{ duration: 300, start: 0.95, opacity: 0 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<!-- Glow Effect -->
			<div
				class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
			></div>

			<!-- Header -->
			<div
				class="flex items-center justify-between p-6 border-b border-white/5 bg-white/5"
			>
				<h2 id="modal-title" class="text-2xl font-heading font-bold tracking-tight">
					{title}
				</h2>
				<button
					on:click={handleClose}
					class="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
					aria-label="Close modal"
				>
					<span class="mdi mdi-close text-xl"></span>
				</button>
			</div>

			<!-- Content -->
			<div class="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
				<slot />
			</div>

			<!-- Footer -->
			{#if $$slots.footer}
				<div
					class="flex items-center justify-end gap-3 p-6 border-t border-white/5 bg-white/5"
				>
					<slot name="footer" />
				</div>
			{/if}
		</div>
	</div>
{/if}
