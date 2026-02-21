<script lang="ts">
	import { onMount } from "svelte";
	import { exportAllData, importAllData, clearAllData } from "$lib/storage";
	import { showToast } from "$lib/toast";
	import { themeStore, updateTheme } from "$lib/theme";
	import { userStore, updateProfile } from "$lib/user";
	import type { ThemeSettings } from "$lib/types";

	type TabId = "profile" | "themes" | "appearance" | "data";
	type PresetKey =
		| "dawn"
		| "ocean"
		| "sunset"
		| "forest"
		| "midnight"
		| "aurora"
		| "ember";

	let activeTab: TabId = "profile";
	let selectedAvatar = "";

	// Initialize selectedAvatar when userStore is loaded
	$: if ($userStore?.avatar) {
		selectedAvatar = $userStore.avatar;
	}

	const tabs: Array<{ id: TabId; label: string; icon: string }> = [
		{ id: "profile", label: "Profile", icon: "mdi-account" },
		{ id: "themes", label: "Themes", icon: "mdi-palette" },
		{ id: "appearance", label: "Appearance", icon: "mdi-brush" },
		{ id: "data", label: "Data", icon: "mdi-database" },
	];

	const themePresets: Record<
		PresetKey,
		{
			name: string;
			type: string;
			primaryColor: string;
			secondaryColor: string;
			accentColor: string;
			description: string;
		}
	> = {
		dawn: {
			name: "Dawn",
			type: "light",
			primaryColor: "#FFB5A7",
			secondaryColor: "#C7B3E5",
			accentColor: "#FF8C7A",
			description: "Soft peach to lavender with warm accents",
		},
		ocean: {
			name: "Ocean",
			type: "dark",
			primaryColor: "#1E40AF",
			secondaryColor: "#0D9488",
			accentColor: "#06B6D4",
			description: "Deep blue to teal with cyan accents",
		},
		sunset: {
			name: "Sunset",
			type: "dark",
			primaryColor: "#7C3AED",
			secondaryColor: "#F97316",
			accentColor: "#F87171",
			description: "Purple to orange with coral accents",
		},
		forest: {
			name: "Forest",
			type: "dark",
			primaryColor: "#065F46",
			secondaryColor: "#059669",
			accentColor: "#84CC16",
			description: "Deep green to emerald with lime accents",
		},
		midnight: {
			name: "Midnight",
			type: "dark",
			primaryColor: "#1E3A8A",
			secondaryColor: "#7C3AED",
			accentColor: "#8B5CF6",
			description: "Navy to deep purple with violet accents",
		},
		aurora: {
			name: "Aurora",
			type: "dark",
			primaryColor: "#4C1D95",
			secondaryColor: "#EC4899",
			accentColor: "#D946EF",
			description: "Indigo to pink with magenta accents",
		},
		ember: {
			name: "Ember",
			type: "dark",
			primaryColor: "#1F2937",
			secondaryColor: "#DC2626",
			accentColor: "#F97316",
			description: "Charcoal to crimson with orange accents",
		},
	};

	const avatarEmojis = [
		"👤",
		"😊",
		"🚀",
		"🎨",
		"⚡",
		"🌟",
		"💎",
		"🎯",
		"🔥",
		"✨",
	];
	const fontOptions: Array<"Inter" | "Roboto" | "Outfit" | "Poppins"> = [
		"Inter",
		"Roboto",
		"Outfit",
		"Poppins",
	];
	const densityOptions: Array<"compact" | "comfortable" | "spacious"> = [
		"compact",
		"comfortable",
		"spacious",
	];

	onMount(() => {
		selectedAvatar = $userStore?.avatar || "👤";
	});

	function selectPreset(presetKey: PresetKey) {
		const preset = themePresets[presetKey];
		updateTheme({
			preset: presetKey,
			primaryColor: preset.primaryColor,
			secondaryColor: preset.secondaryColor,
			accentColor: preset.accentColor,
		});
		showToast("success", `${preset.name} theme applied`);
	}

	function handlePresetSelect(key: string) {
		selectPreset(key as PresetKey);
	}

	function handleCustomThemeChange() {
		updateTheme({ preset: "custom" });
	}

	function handleSaveProfile() {
		if (!$userStore) return;
		updateProfile({
			name: $userStore.name,
			email: $userStore.email,
			bio: $userStore.bio,
			avatar: selectedAvatar,
		});
		showToast("success", "Profile updated successfully");
	}

	async function handleExportData() {
		const data = exportAllData();
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `daylume-backup-${new Date().toISOString().split("T")[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("success", "Data exported successfully");
	}

	async function handleImportData(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			importAllData(data);
			showToast("success", "Data imported successfully");
			location.reload();
		} catch (error) {
			showToast("error", "Failed to import data");
		}
	}

	function handleAvatarUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			showToast("error", "Image size should be less than 5MB");
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result as string;
			selectedAvatar = result;
		};
		reader.readAsDataURL(file);
	}

	function handleClearData() {
		if (
			confirm(
				"Are you sure you want to clear ALL data? This cannot be undone!",
			)
		) {
			clearAllData();
			showToast("warning", "All data cleared");
			setTimeout(() => location.reload(), 1000);
		}
	}
</script>

{#if $userStore && $themeStore}
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-3xl font-heading font-bold">User Profile</h2>
				<p class="text-gray-400 mt-1">
					Manage your account and customize your experience
				</p>
			</div>
		</div>

		<!-- Tabs -->
		<div class="flex gap-2 border-b border-white/10">
			{#each tabs as tab}
				<button
					on:click={() => (activeTab = tab.id)}
					class="px-6 py-3 font-medium transition-all border-b-2 {activeTab ===
					tab.id
						? 'border-primary text-primary'
						: 'border-transparent text-gray-400 hover:text-white'}"
				>
					<span class="mdi {tab.icon} mr-2"></span>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Profile Tab -->
		{#if activeTab === "profile"}
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div class="glass-panel rounded-3xl p-6">
					<h3 class="text-lg font-heading font-bold mb-6">Avatar</h3>
					<div class="flex flex-col items-center gap-4">
						<div class="relative group">
							<div
								class="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary p-1 shadow-2xl shadow-primary/20"
							>
								<div
									class="w-full h-full rounded-full bg-[#020617] flex items-center justify-center overflow-hidden relative"
								>
									{#if selectedAvatar.startsWith("data:") || selectedAvatar.startsWith("http")}
										<img
											src={selectedAvatar}
											alt="Avatar"
											class="w-full h-full object-cover"
										/>
									{:else}
										<span class="text-6xl"
											>{selectedAvatar}</span
										>
									{/if}

									<!-- Hover Overlay -->
									<label
										class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
									>
										<span
											class="mdi mdi-camera text-white text-2xl mb-1"
										></span>
										<span
											class="text-xs text-white font-medium"
											>Change</span
										>
										<input
											type="file"
											accept="image/*"
											on:change={handleAvatarUpload}
											class="hidden"
										/>
									</label>
								</div>
							</div>
						</div>

						<div
							class="flex flex-wrap justify-center gap-3 max-w-md"
						>
							{#each avatarEmojis as emoji}
								<button
									on:click={() => (selectedAvatar = emoji)}
									class="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl transition-all hover:scale-110 {selectedAvatar ===
									emoji
										? 'ring-2 ring-primary bg-primary/20'
										: ''}"
								>
									{emoji}
								</button>
							{/each}
							<label
								class="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl transition-all hover:scale-110 cursor-pointer {selectedAvatar.startsWith(
									'data:',
								)
									? 'ring-2 ring-primary bg-primary/20'
									: ''}"
								title="Upload Image"
							>
								<span class="mdi mdi-upload text-gray-400"
								></span>
								<input
									type="file"
									accept="image/*"
									on:change={handleAvatarUpload}
									class="hidden"
								/>
							</label>
						</div>
					</div>
				</div>

				<div class="lg:col-span-2 glass-panel rounded-3xl p-6">
					<h3 class="text-lg font-heading font-bold mb-6">
						Personal Information
					</h3>
					<div class="space-y-6">
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label
								for="profile-name"
								class="block text-sm font-medium mb-2 text-gray-300"
								>Name</label
							>
							<input
								id="profile-name"
								type="text"
								bind:value={$userStore.name}
								placeholder="Your name"
								class="glass-input"
							/>
						</div>
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label
								for="profile-email"
								class="block text-sm font-medium mb-2 text-gray-300"
								>Email</label
							>
							<input
								id="profile-email"
								type="email"
								bind:value={$userStore.email}
								placeholder="your@email.com"
								class="glass-input"
							/>
						</div>
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label
								for="profile-bio"
								class="block text-sm font-medium mb-2 text-gray-300"
								>Bio</label
							>
							<textarea
								id="profile-bio"
								bind:value={$userStore.bio}
								placeholder="Tell us about yourself..."
								rows="4"
								class="glass-input resize-none"
							></textarea>
						</div>
						<div
							class="flex items-center gap-2 text-sm text-gray-400"
						>
							<span class="mdi mdi-calendar"></span>
							<span
								>Joined {new Date(
									$userStore.joinDate,
								).toLocaleDateString("en-US", {
									month: "long",
									year: "numeric",
								})}</span
							>
						</div>
						<button
							on:click={handleSaveProfile}
							class="btn btn-primary w-full">Save Profile</button
						>
					</div>
				</div>
			</div>
		{/if}

		<!-- Themes Tab -->
		{#if activeTab === "themes"}
			<div class="space-y-6">
				<div class="glass-panel rounded-3xl p-6">
					<h3 class="text-lg font-heading font-bold mb-6">
						Preset Themes
					</h3>
					<div
						class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
					>
						{#each Object.entries(themePresets) as [key, preset]}
							<button
								on:click={() => handlePresetSelect(key)}
								class="relative group overflow-hidden rounded-2xl transition-all hover:scale-105 {$themeStore.preset ===
								key
									? 'ring-2 ring-primary'
									: ''}"
							>
								<div class="aspect-video relative">
									<div
										class="absolute inset-0 animate-gradient-slow"
										style="background: linear-gradient(135deg, {preset.primaryColor}, {preset.secondaryColor}); opacity: {preset.type ===
										'light'
											? 0.8
											: 1};"
									></div>
									{#if $themeStore.preset === key}
										<div
											class="absolute inset-0 flex items-center justify-center"
										>
											<span
												class="mdi mdi-check-circle text-white text-4xl drop-shadow-lg"
											></span>
										</div>
									{/if}
								</div>
								<div
									class="bg-white/5 backdrop-blur-sm border-t border-white/10 p-4"
								>
									<div
										class="flex items-center justify-between mb-1"
									>
										<h4 class="font-semibold">
											{preset.name}
										</h4>
										<span
											class="text-xs px-2 py-1 rounded-full {preset.type ===
											'light'
												? 'bg-yellow-500/20 text-yellow-300'
												: 'bg-blue-500/20 text-blue-300'}"
											>{preset.type}</span
										>
									</div>
									<p class="text-xs text-gray-400">
										{preset.description}
									</p>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<div class="glass-panel rounded-3xl p-6">
					<h3
						class="text-lg font-heading font-bold mb-6 flex items-center gap-2"
					>
						<span class="mdi mdi-tune text-primary"></span>
						Custom Theme Controls
					</h3>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label
								for="theme-primary"
								class="block text-sm font-medium mb-2 text-gray-300"
								>Primary Color</label
							>
							<div class="flex gap-2">
								<input
									id="theme-primary"
									type="color"
									bind:value={$themeStore.primaryColor}
									on:input={handleCustomThemeChange}
									class="w-16 h-12 rounded-xl cursor-pointer bg-transparent"
								/>
								<input
									aria-label="Primary Color Hex"
									type="text"
									bind:value={$themeStore.primaryColor}
									on:input={handleCustomThemeChange}
									class="glass-input flex-1 font-mono text-sm"
								/>
							</div>
						</div>
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label
								for="theme-secondary"
								class="block text-sm font-medium mb-2 text-gray-300"
								>Secondary Color</label
							>
							<div class="flex gap-2">
								<input
									id="theme-secondary"
									type="color"
									bind:value={$themeStore.secondaryColor}
									on:input={handleCustomThemeChange}
									class="w-16 h-12 rounded-xl cursor-pointer bg-transparent"
								/>
								<input
									aria-label="Secondary Color Hex"
									type="text"
									bind:value={$themeStore.secondaryColor}
									on:input={handleCustomThemeChange}
									class="glass-input flex-1 font-mono text-sm"
								/>
							</div>
						</div>
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label
								for="theme-accent"
								class="block text-sm font-medium mb-2 text-gray-300"
								>Accent Color</label
							>
							<div class="flex gap-2">
								<input
									id="theme-accent"
									type="color"
									bind:value={$themeStore.accentColor}
									on:input={handleCustomThemeChange}
									class="w-16 h-12 rounded-xl cursor-pointer bg-transparent"
								/>
								<input
									aria-label="Accent Color Hex"
									type="text"
									bind:value={$themeStore.accentColor}
									on:input={handleCustomThemeChange}
									class="glass-input flex-1 font-mono text-sm"
								/>
							</div>
						</div>
					</div>
					<div class="mt-6">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label
							for="theme-speed"
							class="block text-sm font-medium mb-3 text-gray-300"
							>Animation Speed: {$themeStore.animationSpeed}/10</label
						>
						<input
							id="theme-speed"
							type="range"
							min="1"
							max="10"
							bind:value={$themeStore.animationSpeed}
							class="w-full accent-primary"
						/>
						<div
							class="flex justify-between text-xs text-gray-500 mt-1"
						>
							<span>Slow</span>
							<span>Fast</span>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Appearance Tab -->
		{#if activeTab === "appearance"}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div class="glass-panel rounded-3xl p-6">
					<h3 class="text-lg font-heading font-bold mb-6">
						Typography
					</h3>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<h4 class="block text-sm font-medium mb-3 text-gray-300">
						Font Family
					</h4>
					<div class="grid grid-cols-2 gap-2">
						{#each fontOptions as font}
							<button
								on:click={() =>
									updateTheme({ fontFamily: font })}
								class="p-4 rounded-xl text-center transition-all {$themeStore.fontFamily ===
								font
									? 'bg-primary/20 ring-2 ring-primary'
									: 'bg-white/5 hover:bg-white/10'}"
								style="font-family: {font}"
							>
								{font}
							</button>
						{/each}
					</div>
				</div>

				<div class="glass-panel rounded-3xl p-6">
					<h3 class="text-lg font-heading font-bold mb-6">Spacing</h3>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<h4 class="block text-sm font-medium mb-3 text-gray-300">
						Density
					</h4>
					<div class="flex gap-2">
						{#each densityOptions as density}
							<button
								on:click={() => updateTheme({ density })}
								class="flex-1 p-3 rounded-xl capitalize transition-all {$themeStore.density ===
								density
									? 'bg-primary/20 ring-2 ring-primary'
									: 'bg-white/5 hover:bg-white/10'}"
							>
								{density}
							</button>
						{/each}
					</div>
				</div>

				<div class="glass-panel rounded-3xl p-6">
					<h3 class="text-lg font-heading font-bold mb-6">
						Border Radius
					</h3>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label
						for="theme-radius"
						class="block text-sm font-medium mb-3 text-gray-300"
						>Roundness: {$themeStore.borderRadius}px</label
					>
					<input
						id="theme-radius"
						type="range"
						min="0"
						max="24"
						bind:value={$themeStore.borderRadius}
						class="w-full accent-primary mb-4"
					/>
					<div class="grid grid-cols-4 gap-2">
						{#each [0, 8, 16, 24] as radius}
							<div
								class="aspect-square bg-primary/30"
								style="border-radius: {radius}px"
							></div>
						{/each}
					</div>
				</div>

				<div class="glass-panel rounded-3xl p-6">
					<h3 class="text-lg font-heading font-bold mb-6">
						Glass Effect
					</h3>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label
						for="glass-intensity"
						class="block text-sm font-medium mb-3 text-gray-300"
					>
						Intensity: {$themeStore.glassIntensity}%
					</label>
					<input
						id="glass-intensity"
						type="range"
						min="0"
						max="100"
						bind:value={$themeStore.glassIntensity}
						class="w-full accent-primary mb-4"
					/>
					<div class="h-24 rounded-2xl relative overflow-hidden">
						<div
							class="absolute inset-0 bg-gradient-to-r from-primary to-secondary"
						></div>
						<div
							class="absolute inset-4 backdrop-blur-md border border-white/20 rounded-xl"
							style="background: rgba(255,255,255,{$themeStore.glassIntensity /
								100})"
						></div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Data Tab -->
		{#if activeTab === "data"}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div class="glass-panel rounded-3xl p-6">
					<div class="flex items-center gap-3 mb-6">
						<div
							class="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center"
						>
							<span class="mdi mdi-export text-success text-2xl"
							></span>
						</div>
						<div>
							<h3 class="text-lg font-heading font-bold">
								Export Data
							</h3>
							<p class="text-sm text-gray-400">
								Download all your data as JSON
							</p>
						</div>
					</div>
					<button
						on:click={handleExportData}
						class="btn btn-secondary w-full"
					>
						<span class="mdi mdi-download mr-2"></span>
						Export All Data
					</button>
				</div>

				<div class="glass-panel rounded-3xl p-6">
					<div class="flex items-center gap-3 mb-6">
						<div
							class="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center"
						>
							<span class="mdi mdi-import text-info text-2xl"
							></span>
						</div>
						<div>
							<h3 class="text-lg font-heading font-bold">
								Import Data
							</h3>
							<p class="text-sm text-gray-400">
								Restore from a backup file
							</p>
						</div>
					</div>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="btn btn-secondary w-full cursor-pointer">
						<span class="mdi mdi-upload mr-2"></span>
						Import Data
						<input
							type="file"
							accept=".json"
							on:change={handleImportData}
							class="hidden"
						/>
					</label>
				</div>

				<div class="glass-panel rounded-3xl p-6 lg:col-span-2">
					<div class="flex items-center gap-3 mb-6">
						<div
							class="w-12 h-12 rounded-xl bg-danger/20 flex items-center justify-center"
						>
							<span class="mdi mdi-alert text-danger text-2xl"
							></span>
						</div>
						<div>
							<h3 class="text-lg font-heading font-bold">
								Clear All Data
							</h3>
							<p class="text-sm text-gray-400">
								Permanently delete all your data
							</p>
						</div>
					</div>
					<button
						on:click={handleClearData}
						class="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 w-full"
					>
						<span class="mdi mdi-delete-forever mr-2"></span>
						Clear All Data
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	@keyframes gradient-slow {
		0%,
		100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
	}

	.animate-gradient-slow {
		background-size: 200% 200%;
		animation: gradient-slow 20s ease infinite;
	}
</style>
