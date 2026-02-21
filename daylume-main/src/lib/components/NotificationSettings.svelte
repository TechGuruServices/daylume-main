<script lang="ts">
    import { 
        notificationSettingsStore, 
        getSmartNotificationManager,
        type NotificationSettings 
    } from '$lib/smart-notifications';
    import { hapticFeedback } from '$lib/haptics';
    import { createEventDispatcher, onMount } from 'svelte';
    
    export let show = false;
    
    const dispatch = createEventDispatcher();
    
    let settings: NotificationSettings;
    let permissionStatus: NotificationPermission = 'default';
    
    $: settings = $notificationSettingsStore;
    
    onMount(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            permissionStatus = Notification.permission;
        }
    });
    
    async function handleRequestPermission() {
        const manager = getSmartNotificationManager();
        const granted = await manager.checkPermission();
        if (granted) {
            permissionStatus = 'granted';
            hapticFeedback.success();
        }
    }
    
    function toggleEnabled() {
        notificationSettingsStore.update(s => ({ ...s, enabled: !s.enabled }));
        hapticFeedback.tap();
    }
    
    function toggleQuietHours() {
        notificationSettingsStore.update(s => ({
            ...s,
            quietHours: { ...s.quietHours, enabled: !s.quietHours.enabled }
        }));
        hapticFeedback.tap();
    }
    
    function updateQuietHoursStart(value: string) {
        notificationSettingsStore.update(s => ({
            ...s,
            quietHours: { ...s.quietHours, start: value }
        }));
        hapticFeedback.tap();
    }
    
    function updateQuietHoursEnd(value: string) {
        notificationSettingsStore.update(s => ({
            ...s,
            quietHours: { ...s.quietHours, end: value }
        }));
        hapticFeedback.tap();
    }
    
    function toggleLocationReminders() {
        notificationSettingsStore.update(s => ({
            ...s,
            locationReminders: { ...s.locationReminders, enabled: !s.locationReminders.enabled }
        }));
        hapticFeedback.tap();
    }
    
    function toggleIntelligentTiming() {
        notificationSettingsStore.update(s => ({
            ...s,
            intelligentTiming: { ...s.intelligentTiming, enabled: !s.intelligentTiming.enabled }
        }));
        hapticFeedback.tap();
    }
    
    function updateTaskReminderDefault(value: number) {
        notificationSettingsStore.update(s => ({
            ...s,
            taskReminders: { ...s.taskReminders, defaultBefore: value }
        }));
        hapticFeedback.tap();
    }
    
    function handleClose() {
        show = false;
        dispatch('close');
    }
    
    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    }
</script>

{#if show}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
        on:click={handleBackdropClick}
    >
        <div class="w-full max-w-lg bg-gray-900/95 rounded-t-3xl overflow-hidden animate-slide-up">
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-2">
                <div class="w-10 h-1 rounded-full bg-gray-600"></div>
            </div>
            
            <!-- Header -->
            <div class="px-6 pb-4 border-b border-white/10">
                <h2 class="text-xl font-bold">Notification Settings</h2>
                <p class="text-sm text-gray-400 mt-1">Customize your smart notification preferences</p>
            </div>
            
            <!-- Settings -->
            <div class="max-h-[60vh] overflow-y-auto p-6 space-y-6">
                <!-- Permission Status -->
                {#if permissionStatus !== 'granted'}
                    <div class="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                        <div class="flex items-start gap-3">
                            <span class="text-2xl">🔔</span>
                            <div class="flex-1">
                                <h4 class="font-semibold text-yellow-400">Enable Notifications</h4>
                                <p class="text-sm text-gray-400 mt-1">
                                    Allow notifications to receive smart reminders
                                </p>
                                <button
                                    on:click={handleRequestPermission}
                                    class="mt-3 px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium text-sm"
                                >
                                    Enable Now
                                </button>
                            </div>
                        </div>
                    </div>
                {/if}
                
                <!-- Enabled Toggle -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Smart Notifications</h4>
                        <p class="text-sm text-gray-500">Enable intelligent reminders</p>
                    </div>
                    <button
                        on:click={toggleEnabled}
                        class="w-12 h-6 rounded-full transition-colors relative"
                        class:bg-primary={settings.enabled}
                        class:bg-gray-600={!settings.enabled}
                    >
                        <span 
                            class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                            class:left-1={!settings.enabled}
                            class:left-7={settings.enabled}
                        ></span>
                    </button>
                </div>
                
                <!-- Quiet Hours -->
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="font-medium">Quiet Hours</h4>
                            <p class="text-sm text-gray-500">Pause notifications during these hours</p>
                        </div>
                        <button
                            on:click={toggleQuietHours}
                            class="w-12 h-6 rounded-full transition-colors relative"
                            class:bg-primary={settings.quietHours.enabled}
                            class:bg-gray-600={!settings.quietHours.enabled}
                        >
                            <span 
                                class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                                class:left-1={!settings.quietHours.enabled}
                                class:left-7={settings.quietHours.enabled}
                            ></span>
                        </button>
                    </div>
                    
                    {#if settings.quietHours.enabled}
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label for="notif-quiet-start" class="text-xs text-gray-500 block mb-1">Start</label>
                                <input
                                    id="notif-quiet-start"
                                    type="time"
                                    value={settings.quietHours.start}
                                    on:change={(e) => updateQuietHoursStart(e.currentTarget.value)}
                                    class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                                />
                            </div>
                            <div>
                                <label for="notif-quiet-end" class="text-xs text-gray-500 block mb-1">End</label>
                                <input
                                    id="notif-quiet-end"
                                    type="time"
                                    value={settings.quietHours.end}
                                    on:change={(e) => updateQuietHoursEnd(e.currentTarget.value)}
                                    class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                                />
                            </div>
                        </div>
                    {/if}
                </div>
                
                <!-- Location Reminders -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Location Reminders</h4>
                        <p class="text-sm text-gray-500">Remind when near specific places</p>
                    </div>
                    <button
                        on:click={toggleLocationReminders}
                        class="w-12 h-6 rounded-full transition-colors relative"
                        class:bg-primary={settings.locationReminders.enabled}
                        class:bg-gray-600={!settings.locationReminders.enabled}
                    >
                        <span 
                            class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                            class:left-1={!settings.locationReminders.enabled}
                            class:left-7={settings.locationReminders.enabled}
                        ></span>
                    </button>
                </div>
                
                <!-- Smart Timing -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">Smart Timing</h4>
                        <p class="text-sm text-gray-500">Optimize notification timing automatically</p>
                    </div>
                    <button
                        on:click={toggleIntelligentTiming}
                        class="w-12 h-6 rounded-full transition-colors relative"
                        class:bg-primary={settings.intelligentTiming.enabled}
                        class:bg-gray-600={!settings.intelligentTiming.enabled}
                    >
                        <span 
                            class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                            class:left-1={!settings.intelligentTiming.enabled}
                            class:left-7={settings.intelligentTiming.enabled}
                        ></span>
                    </button>
                </div>
                
                <!-- Default Reminder Time -->
                <div>
                    <h4 class="font-medium mb-2">Default Reminder</h4>
                    <select
                        value={settings.taskReminders.defaultBefore}
                        on:change={(e) => updateTaskReminderDefault(parseInt(e.currentTarget.value))}
                        class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                    >
                        <option value="5">5 minutes before</option>
                        <option value="10">10 minutes before</option>
                        <option value="15">15 minutes before</option>
                        <option value="30">30 minutes before</option>
                        <option value="60">1 hour before</option>
                    </select>
                </div>
            </div>
            
            <!-- Done Button -->
            <div class="p-4 border-t border-white/10">
                <button
                    on:click={handleClose}
                    class="w-full py-3 rounded-xl bg-primary text-white font-medium transition-colors"
                >
                    Done
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes slide-up {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .animate-slide-up {
        animation: slide-up 0.3s ease-out;
    }
</style>
