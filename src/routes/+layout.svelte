<script lang="ts">
	import "../app.css";
	import { page } from "$app/stores";
	import AIChat from "$lib/components/AIChat.svelte";
	import Toast from "$lib/components/Toast.svelte";
	import ThemeBackdrop from "$lib/components/ThemeBackdrop.svelte";
	import SplashScreen from "$lib/components/SplashScreen.svelte";
	import SyncStatus from "$lib/components/SyncStatus.svelte";
	import ConflictResolver from "$lib/components/ConflictResolver.svelte";

	import { onMount, onDestroy } from "svelte";

	import { initTheme } from "$lib/theme";
	import { userStore } from "$lib/user";
	import { searchAll, type SearchResult } from "$lib/search";
	import {
		notifications,
		checkNotifications,
		markAsRead,
		clearAllNotifications,
		requestNotificationPermission,
	} from "$lib/notifications";
	import { supabase, initializeAuth } from "$lib/supabase";
	import { goto } from "$app/navigation";
	import { migrateData } from "$lib/migration";
	import { browser } from "$app/environment";
	import { unlockAudio, stopAlarmSound, playSound } from "$lib/audio";
	import { showToast } from "$lib/toast";
	import type { Alarm } from "$lib/types";
	
	// Import new alarm service
	import {
		initAlarmService,
		destroyAlarmService,
		ringingAlarm,
		showAlarmModal,
		dismissAlarm,
		snoozeAlarm
	} from "$lib/alarm-service";

	let searchQuery = "";
	let searchResults: SearchResult[] = [];
	let showResults = false;
	let showNotifications = false;
	let isAuthenticated = false;
	let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let authInitialized = false;
	let searchInput: HTMLInputElement;
	
	// Splash screen state
	let showSplash = false;
	let appReady = false;
	
	// PWA install prompt
	let deferredInstallPrompt: any = null;
	let showInstallBanner = false;

	// Subscribe to user store to update auth state
	const unsubscribeUser = userStore.subscribe((user) => {
		isAuthenticated = !!user?.email;
	});

	$: {
		if (searchQuery.length >= 2) {
			// Debounce search to avoid excessive API calls
			if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
			searchDebounceTimer = setTimeout(async () => {
				searchResults = await searchAll(searchQuery);
				showResults = true;
			}, 300);
		} else {
			searchResults = [];
			showResults = false;
		}
	}

	function handleResultClick() {
		searchQuery = "";
		showResults = false;
	}

	async function handleLogout() {
		await supabase.auth.signOut();
		userStore.set(null);
		// Clear cached user data
		if (browser) {
			localStorage.removeItem('daylume-user-profile');
		}
		goto("/login");
	}
	
	// Load user profile from cache or Supabase
	async function loadUserProfile(userId: string) {
		// Try cache first for instant UI
		if (browser) {
			const cached = localStorage.getItem('daylume-user-profile');
			if (cached) {
				try {
					const profile = JSON.parse(cached);
					userStore.set(profile);
				} catch (e) {
					// Invalid cache, continue to fetch
				}
			}
		}
		
		// Fetch fresh profile from Supabase
		const { data: profile, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', userId)
			.single();
		
		if (profile && !error) {
			const userProfile = {
				name: profile.name || '',
				email: profile.email || '',
				avatar: profile.avatar || '',
				bio: profile.bio || '',
				joinDate: profile.created_at || new Date().toISOString(),
				plan: profile.plan || 'free'
			};
			userStore.set(userProfile);
			
			// Cache for next load
			if (browser) {
				localStorage.setItem('daylume-user-profile', JSON.stringify(userProfile));
			}
		}
	}

	const navItems = [
		{ href: "/", label: "Dashboard", icon: "/assets/glass_01_dashboard.png" },
		{ href: "/tasks", label: "Tasks", icon: "/assets/glass_02_tasks.png" },
		{ href: "/habits", label: "Habits", icon: "/assets/glass_03_habits.png" },
		{ href: "/calendar", label: "Calendar", icon: "/assets/glass_04_calendar.png" },
		{ href: "/journal", label: "Journal", icon: "/assets/glass_05_journal.png" },
		{ href: "/alarms", label: "Alarms", icon: "/assets/glass_06_alarms.png" },
		{ href: "/goals", label: "Goals", icon: "/assets/glass_07_goals.png" },
		{ href: "/calculator", label: "Calculator", icon: "/assets/glass_08_calculator.png" },
		{ href: "/settings", label: "Settings", icon: "/assets/glass_09_settings.png" },
	];

	let sidebarOpen = false;

	// Global keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Ctrl+K or Cmd+K: Focus search
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			searchInput?.focus();
		}
		// Escape: Close sidebar, notifications, search
		if (e.key === 'Escape') {
			if (sidebarOpen) sidebarOpen = false;
			if (showNotifications) showNotifications = false;
			if (showResults) { showResults = false; searchQuery = ''; }
		}
	}

	async function handleInstall() {
		if (!deferredInstallPrompt) return;
		deferredInstallPrompt.prompt();
		const { outcome } = await deferredInstallPrompt.userChoice;
		if (outcome === 'accepted') {
			showToast('success', 'Daylume installed! 🎉');
		}
		deferredInstallPrompt = null;
		showInstallBanner = false;
	}

	function dismissInstallBanner() {
		showInstallBanner = false;
		localStorage.setItem('daylume_install_dismissed', Date.now().toString());
	}

	onMount(() => {
		initTheme();
		unlockAudio();
		
		// Request notification permission
		requestNotificationPermission();
		
		// Initialize the alarm service with Web Worker and Wake Lock support
		initAlarmService();
		
		// Listen for keyboard shortcuts
		window.addEventListener('keydown', handleKeydown);
		
		// PWA install prompt
		const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
					  (window.navigator as any).standalone === true;
		if (!isPWA) {
			window.addEventListener('beforeinstallprompt', (e: Event) => {
				e.preventDefault();
				deferredInstallPrompt = e;
				// Only show if not recently dismissed
				const dismissed = localStorage.getItem('daylume_install_dismissed');
				if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
					showInstallBanner = true;
				}
			});
		}
		
		// Initialize auth and app state
		(async () => {
		
		// Initialize auth session from storage FIRST
		const session = await initializeAuth();
		if (session?.user) {
			isAuthenticated = true;
			await loadUserProfile(session.user.id);
			await migrateData(session.user.id);
		}
		authInitialized = true;
		
		// Check if splash screen should be shown (first visit or PWA launch)
		const splashShown = localStorage.getItem('daylume_splash_shown');
		
		// Show splash on first visit OR when launching as PWA
		if (!splashShown || isPWA) {
			showSplash = true;
		} else {
			appReady = true;
		}

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log('Auth state changed:', event);
			
			if (event === "SIGNED_OUT") {
				isAuthenticated = false;
				userStore.set(null);
				if (browser) {
					localStorage.removeItem('daylume-user-profile');
				}
			} else if (event === "SIGNED_IN" && session) {
				isAuthenticated = true;
				await loadUserProfile(session.user.id);
				await migrateData(session.user.id);
			} else if (event === "TOKEN_REFRESHED" && session) {
				// Session refreshed, keep user logged in
				isAuthenticated = true;
			}
		});
		})();

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
	
	function handleSplashComplete() {
		showSplash = false;
		appReady = true;
		// Mark splash as shown so it doesn't show again on regular navigation
		try {
			localStorage.setItem('daylume_splash_shown', 'true');
		} catch (e) {
			// Ignore localStorage errors
		}
	}

	onDestroy(() => {
		unsubscribeUser();
		destroyAlarmService();
	});
</script>

<!-- Premium Splash Screen -->
{#if showSplash}
	<SplashScreen onComplete={handleSplashComplete} />
{/if}

<!-- Main App Content -->
<div class="app-container" class:app-ready={appReady} class:app-hidden={showSplash}>
	<Toast />
	<AIChat />
	<ThemeBackdrop />
	<ConflictResolver />

	<div class="min-h-screen flex relative safe-area-inset">

	<!-- Mobile Sidebar Overlay -->
	{#if sidebarOpen}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
			role="button"
			tabindex="0"
			on:click={() => (sidebarOpen = false)}
			on:keydown={(e) => {
				if (e.key === "Enter" || e.key === " ") sidebarOpen = false;
			}}
		></div>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed lg:static inset-y-0 left-0 z-50 w-72 transform {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-out flex flex-col lg:m-4 lg:rounded-3xl"
	>
		<div class="h-full glass-panel lg:rounded-3xl flex flex-col p-4 safe-top safe-bottom">
			<!-- Logo -->
			<div class="flex items-center gap-3 px-4 py-6 mb-2">
				<div class="w-14 h-14 lg:w-16 lg:h-16">
					<img
						src="/assets/logo.png"
						alt="Daylume Logo"
						class="w-full h-full object-contain"
					/>
				</div>
				<div>
					<h1
						class="text-xl lg:text-2xl font-heading font-bold tracking-tight"
						style="background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #F472B6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 0.02em;"
					>
						Daylume
					</h1>
					<p class="text-xs text-gray-400 font-medium tracking-wider">
						Bring Your Day Into Focus
					</p>
				</div>
				
				<!-- Mobile Close Button -->
				<button
					class="lg:hidden ml-auto w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white active:scale-95 transition-all"
					on:click={() => (sidebarOpen = false)}
				>
					<span class="mdi mdi-close text-xl"></span>
				</button>
			</div>

			<!-- Nav -->
			<nav class="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
				{#each navItems as item}
					<a
						href={item.href}
						class="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group touch-target {$page
							.url.pathname === item.href
							? 'bg-white/10 text-white shadow-lg shadow-white/5 border border-white/10'
							: 'text-gray-400 hover:bg-white/5 hover:text-white hover:pl-5 active:bg-white/10'}"
						on:click={() => (sidebarOpen = false)}
					>
						<img
							src={item.icon}
							alt={item.label}
							class="w-6 h-6 transition-transform group-hover:scale-110 {$page
								.url.pathname === item.href
								? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]'
								: 'opacity-80'}"
						/>
						<span class="font-medium tracking-wide"
							>{item.label}</span
						>
						{#if $page.url.pathname === item.href}
							<span
								class="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(139,92,246,0.8)]"
							></span>
						{/if}
					</a>
				{/each}
			</nav>

			<!-- User Profile / Auth (Bottom) -->
			<div class="mt-4 pt-4 border-t border-white/5">
				{#if isAuthenticated && $userStore}
					<a
						href="/profile"
						class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group mb-2 touch-target"
						on:click={() => (sidebarOpen = false)}
					>
						<div
							class="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-white/10 flex items-center justify-center overflow-hidden"
						>
							{#if $userStore.avatar && ($userStore.avatar.startsWith("data:") || $userStore.avatar.startsWith("http"))}
								<img
									src={$userStore.avatar}
									alt="Avatar"
									class="w-full h-full object-cover"
								/>
							{:else}
								<span class="text-lg"
									>{$userStore.avatar || "👤"}</span
								>
							{/if}
						</div>
						<div class="text-left min-w-0 flex-1">
							<p
								class="text-sm font-medium text-white group-hover:text-primary transition-colors truncate"
							>
								{$userStore.name || "User Profile"}
							</p>
						</div>
						<span
							class="mdi mdi-chevron-right ml-auto text-gray-500 group-hover:translate-x-1 transition-transform"
						></span>
					</a>
					<button
						on:click={handleLogout}
						class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all duration-300 group touch-target"
					>
						<span
							class="mdi mdi-logout text-xl group-hover:text-danger transition-colors"
						></span>
						<span class="font-medium tracking-wide">Sign Out</span>
					</button>
				{:else}
					<a
						href="/login"
						class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all duration-300 group touch-target"
						on:click={() => (sidebarOpen = false)}
					>
						<span
							class="mdi mdi-login text-xl group-hover:text-primary transition-colors"
						></span>
						<span class="font-medium tracking-wide">Sign In</span>
					</a>
				{/if}
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col min-w-0 min-h-screen">
		<!-- Top Bar -->
		<header
			class="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 lg:px-10 pt-2 md:pt-4 flex-shrink-0 safe-top"
		>
			<div class="flex items-center gap-3 md:gap-4">
				<button
					class="lg:hidden w-11 h-11 rounded-xl glass-panel flex items-center justify-center text-white active:scale-95 transition-transform touch-target"
					on:click={() => (sidebarOpen = !sidebarOpen)}
				>
					<span class="mdi mdi-menu text-2xl"></span>
				</button>

				<!-- Search / Actions -->
				<div class="flex items-center gap-3 md:gap-4">
					<div
						class="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 focus-within:bg-white/10 focus-within:border-white/20 transition-all w-64 relative"
					>
						<img src="/assets/glass_12_search.png" alt="Search" class="w-5 h-5 opacity-70" />
						<input
						bind:this={searchInput}
						type="text"
						bind:value={searchQuery}
						placeholder="Search (Ctrl+K)"
						class="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 w-full"
					/>

						<!-- Search Results Dropdown -->
						{#if showResults}
							<div
								class="absolute top-full left-0 w-full mt-2 bg-[#0f172a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto custom-scrollbar"
							>
								{#if searchResults.length > 0}
									{#each searchResults as result}
										<a
											href={result.href}
											on:click={handleResultClick}
											class="flex items-start gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
										>
											<div
												class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"
											>
												<span
													class="mdi {result.icon} {result.color}"
												></span>
											</div>
											<div class="min-w-0">
												<p
													class="text-sm font-medium text-white truncate"
												>
													{result.title}
												</p>
												<p
													class="text-xs text-gray-400 truncate"
												>
													{result.subtitle}
												</p>
											</div>
										</a>
									{/each}
								{:else}
									<div
										class="p-4 text-center text-gray-400 text-sm"
									>
										No results found
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<div class="relative">
						<!-- Sync Status Indicator -->
						<div class="mr-2 relative">
							<SyncStatus />
						</div>
					</div>
					
					<div class="relative">
						<button
							on:click={() =>
								(showNotifications = !showNotifications)}
							class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors relative"
						>
							<img src="/assets/glass_13_notifications.png" alt="Notifications" class="w-5 h-5" />
							{#if $notifications.length > 0}
								<span
									class="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"
								></span>
							{/if}
						</button>

						{#if showNotifications}
							<div
								class="absolute top-full right-0 w-80 mt-2 bg-[#0f172a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
							>
								<div
									class="flex items-center justify-between p-3 border-b border-white/5"
								>
									<h3
										class="text-sm font-semibold text-white"
									>
										Notifications
									</h3>
									{#if $notifications.length > 0}
										<button
											on:click={clearAllNotifications}
											class="text-xs text-primary hover:text-primary/80"
											>Clear all</button
										>
									{/if}
								</div>
								<div
									class="max-h-80 overflow-y-auto custom-scrollbar"
								>
									{#if $notifications.length > 0}
										{#each $notifications as notification (notification.id)}
											<a
												href={notification.href}
												on:click={() => {
													markAsRead(notification.id);
													showNotifications = false;
												}}
												class="flex items-start gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
											>
												<div
													class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"
												>
													<span
														class="mdi {notification.type ===
														'event'
															? 'mdi-calendar'
															: 'mdi-alarm'} {notification.type ===
														'event'
															? 'text-secondary'
															: 'text-warning'}"
													></span>
												</div>
												<div>
													<p
														class="text-sm font-medium text-white"
													>
														{notification.title}
													</p>
													<p
														class="text-xs text-gray-400"
													>
														{notification.message}
													</p>
													<p
														class="text-[10px] text-gray-500 mt-1"
													>
														{notification.time}
													</p>
												</div>
											</a>
										{/each}
									{:else}
										<div class="p-8 text-center">
											<span
												class="mdi mdi-bell-off-outline text-2xl text-gray-600 mb-2 block"
											></span>
											<p class="text-sm text-gray-400">
												No new notifications
											</p>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</header>

		<!-- Page Content -->
		<main
			class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 custom-scrollbar safe-bottom"
		>
			<div class="mx-auto max-w-7xl animate-fade-in pb-safe">
				<slot />
			</div>
		</main>
	</div>
</div>

<!-- PWA Install Banner -->
{#if showInstallBanner}
	<div class="fixed bottom-0 left-0 right-0 z-[90] p-4 safe-bottom animate-slide-up">
		<div class="max-w-lg mx-auto glass-panel rounded-2xl p-4 flex items-center gap-4 shadow-2xl border border-primary/20">
			<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg">
				<img src="/assets/logo.png" alt="Daylume" class="w-8 h-8 object-contain" />
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-sm font-semibold text-white">Install Daylume</p>
				<p class="text-xs text-gray-400">Add to home screen for the best experience</p>
			</div>
			<button
				on:click={handleInstall}
				class="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all active:scale-95 flex-shrink-0"
			>
				Install
			</button>
			<button
				on:click={dismissInstallBanner}
				class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0"
			>
				<span class="mdi mdi-close text-sm"></span>
			</button>
		</div>
	</div>
{/if}
</div>

<!-- Global Ringing Alarm Modal -->
{#if $showAlarmModal && $ringingAlarm}
	<div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
		<div class="text-center p-8 max-w-sm w-full mx-4">
			<div class="relative mb-8">
				<div class="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center animate-pulse">
					<span class="mdi mdi-alarm text-7xl text-white animate-bounce"></span>
				</div>
				<div class="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
			</div>
			
			<div class="text-6xl font-heading font-bold mb-4 tracking-tight">
				{$ringingAlarm.time}
			</div>
			
			<div class="text-xl text-gray-300 mb-12">
				{$ringingAlarm.label || "Alarm"}
			</div>
			
			<div class="flex gap-4 justify-center">
				<button
					on:click={() => snoozeAlarm()}
					class="flex-1 py-4 px-6 rounded-2xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2"
				>
					<span class="mdi mdi-alarm-snooze text-xl"></span>
					Snooze
				</button>
				<button
					on:click={dismissAlarm}
					class="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
				>
					<span class="mdi mdi-check text-xl"></span>
					Dismiss
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MDI Icons -->
<svelte:head>
	<link
		rel="stylesheet"
		href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css"
	/>
</svelte:head>

<style>
	.app-container {
		opacity: 1;
		transition: opacity 0.5s ease-out;
	}
	
	.app-hidden {
		opacity: 0;
		pointer-events: none;
	}
	
	.app-ready {
		opacity: 1;
		pointer-events: auto;
	}
</style>
