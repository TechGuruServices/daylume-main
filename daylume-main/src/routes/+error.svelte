<script lang="ts">
	import { page } from "$app/stores";
</script>

<div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
	<!-- Background Orbs -->
	<div class="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
		<div
			class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-danger/20 blur-[120px] animate-pulse-slow"
		></div>
		<div
			class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow"
			style="animation-delay: 2s;"
		></div>
	</div>

	<div class="glass-panel rounded-3xl p-12 max-w-lg w-full text-center animate-fade-in">
		<!-- Error Icon -->
		<div class="w-24 h-24 mx-auto mb-6 rounded-full bg-danger/20 flex items-center justify-center">
			<span class="mdi mdi-alert-circle-outline text-5xl text-danger"></span>
		</div>

		<!-- Error Code -->
		<div class="text-6xl font-heading font-bold text-white mb-2">
			{$page.status}
		</div>

		<!-- Error Title -->
		<h1 class="text-2xl font-heading font-semibold text-gray-200 mb-4">
			{#if $page.status === 404}
				Page Not Found
			{:else if $page.status === 500}
				Server Error
			{:else if $page.status === 403}
				Access Denied
			{:else}
				Something Went Wrong
			{/if}
		</h1>

		<!-- Error Message -->
		<p class="text-gray-400 mb-8 max-w-sm mx-auto">
			{#if $page.error?.message}
				{$page.error.message}
			{:else if $page.status === 404}
				The page you're looking for doesn't exist or has been moved.
			{:else if $page.status === 500}
				An unexpected error occurred on our server. Please try again later.
			{:else if $page.status === 403}
				You don't have permission to access this resource.
			{:else}
				An unexpected error occurred. Please try again.
			{/if}
		</p>

		<!-- Action Buttons -->
		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<a href="/" class="btn btn-primary">
				<span class="mdi mdi-home mr-2"></span>
				Go Home
			</a>
			<button
				on:click={() => window.history.back()}
				class="btn btn-secondary"
			>
				<span class="mdi mdi-arrow-left mr-2"></span>
				Go Back
			</button>
		</div>

		<!-- Support Info -->
		<div class="mt-8 pt-6 border-t border-white/10">
			<p class="text-sm text-gray-500">
				Need help? Check out our 
				<a href="/settings" class="text-primary hover:text-primary/80 transition-colors">
					Settings
				</a>
				or contact support.
			</p>
		</div>
	</div>
</div>
