<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { Alarm, Timer } from "$lib/types";
    import {
        getAlarms,
        saveAlarms,
        addAlarm as addAlarmLocal,
        updateAlarm as updateAlarmLocal,
        deleteAlarm as deleteAlarmLocal,
        getTimers,
        saveTimers,
        addTimer,
        updateTimer,
        deleteTimer,
    } from "$lib/storage";
    import {
        loadAlarmsFromSupabase,
        saveAlarmToSupabase,
        deleteAlarmFromSupabase
    } from "$lib/supabase-sync";
    import { showToast } from "$lib/toast";
    import Modal from "$lib/components/Modal.svelte";
    import { playSound, playTimerComplete, playAlarmRing, stopAlarmSound, unlockAudio } from "$lib/audio";
    import { hapticFeedback } from "$lib/haptics";
    import { showNotification, requestNotificationPermission } from "$lib/notifications";

    let activeTab: "alarms" | "timers" = "alarms";
    let alarms: Alarm[] = [];
    let timers: Timer[] = [];
    let showAlarmModal = false;
    let showRingingModal = false;
    let ringingAlarm: Alarm | null = null;
    let editingAlarm: Alarm | null = null;
    let timerInterval: ReturnType<typeof setInterval> | null = null;
    let alarmCheckInterval: ReturnType<typeof setInterval> | null = null;
    let lastCheckedMinute = "";

    let alarmForm = {
        time: "07:00",
        label: "",
        repeat: "none" as Alarm["repeat"],
        customDays: [] as number[],
    };

    let timerForm = {
        label: "",
        hours: 0,
        minutes: 5,
        seconds: 0,
    };

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    onMount(async () => {
        // Load alarms from Supabase (falls back to localStorage if not logged in)
        alarms = await loadAlarmsFromSupabase();
        timers = getTimers();
        
        // Request notification permission on mount
        await requestNotificationPermission();

        // Start timer interval (every second)
        timerInterval = setInterval(() => {
            let updated = false;
            timers = timers.map((timer) => {
                if (timer.isRunning && timer.remaining > 0) {
                    updated = true;
                    const newRemaining = timer.remaining - 1;
                    if (newRemaining === 0) {
                        // Timer completed!
                        showToast("success", `Timer "${timer.label}" completed!`);
                        playTimerComplete();
                        hapticFeedback.success();
                        
                        // Show browser notification
                        showNotification({
                            title: "⏱️ Timer Complete!",
                            body: `"${timer.label}" has finished`,
                            requireInteraction: true
                        });
                    }
                    return { ...timer, remaining: newRemaining };
                }
                return timer;
            });
            if (updated) {
                saveTimers(timers);
            }
        }, 1000);
        
        // Start alarm check interval (every 10 seconds)
        alarmCheckInterval = setInterval(checkAlarms, 10000);
        checkAlarms(); // Check immediately on mount
    });

    onDestroy(() => {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        if (alarmCheckInterval) {
            clearInterval(alarmCheckInterval);
        }
        stopAlarmSound();
    });
    
    function checkAlarms() {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const currentDay = now.getDay(); // 0 = Sunday
        
        // Don't check same minute twice
        if (currentTime === lastCheckedMinute) return;
        lastCheckedMinute = currentTime;
        
        // Reload alarms to get latest state
        alarms = getAlarms();
        
        for (const alarm of alarms) {
            if (!alarm.enabled) continue;
            if (alarm.time !== currentTime) continue;
            
            // Check if alarm should ring today based on repeat settings
            let shouldRing = false;
            
            switch (alarm.repeat) {
                case 'none':
                    shouldRing = true;
                    break;
                case 'daily':
                    shouldRing = true;
                    break;
                case 'weekdays':
                    shouldRing = currentDay >= 1 && currentDay <= 5;
                    break;
                case 'weekends':
                    shouldRing = currentDay === 0 || currentDay === 6;
                    break;
                case 'custom':
                    shouldRing = alarm.customDays?.includes(currentDay) || false;
                    break;
            }
            
            if (shouldRing) {
                triggerAlarm(alarm);
                break; // Only trigger one alarm at a time
            }
        }
    }
    
    function triggerAlarm(alarm: Alarm) {
        ringingAlarm = alarm;
        showRingingModal = true;
        
        // Play alarm sound
        playAlarmRing();
        hapticFeedback.warning();
        
        // Show browser notification
        showNotification({
            title: "⏰ Alarm!",
            body: alarm.label || "Time to wake up!",
            requireInteraction: true
        });
        
        // If non-repeating, disable the alarm
        if (alarm.repeat === 'none') {
            updateAlarmLocal(alarm.id, { enabled: false });
            saveAlarmToSupabase({ ...alarm, enabled: false });
            loadAlarmsFromSupabase().then(a => alarms = a);
        }
    }
    
    function dismissAlarm() {
        stopAlarmSound();
        showRingingModal = false;
        ringingAlarm = null;
        playSound('success');
    }
    
    function snoozeAlarm() {
        stopAlarmSound();
        showRingingModal = false;
        
        // Snooze for 5 minutes
        const snoozeTime = new Date();
        snoozeTime.setMinutes(snoozeTime.getMinutes() + 5);
        const snoozeTimeStr = `${snoozeTime.getHours().toString().padStart(2, '0')}:${snoozeTime.getMinutes().toString().padStart(2, '0')}`;
        
        showToast("info", `Snoozed until ${snoozeTimeStr}`);
        playSound('gentle');
        
        // Create a temporary snooze alarm
        if (ringingAlarm) {
            const snoozeAlarm: Alarm = {
                id: `snooze-${Date.now()}`,
                time: snoozeTimeStr,
                label: `${ringingAlarm.label} (Snoozed)`,
                enabled: true,
                repeat: 'none',
                createdAt: new Date().toISOString()
            };
            addAlarmLocal(snoozeAlarm);
            saveAlarmToSupabase(snoozeAlarm);
            loadAlarmsFromSupabase().then(a => alarms = a);
        }
        
        ringingAlarm = null;
    }

    function openNewAlarmModal() {
        unlockAudio(); // Unlock audio on user interaction
        editingAlarm = null;
        alarmForm = {
            time: "07:00",
            label: "",
            repeat: "none",
            customDays: [],
        };
        showAlarmModal = true;
    }

    function openEditAlarmModal(alarm: Alarm) {
        unlockAudio();
        editingAlarm = alarm;
        alarmForm = {
            time: alarm.time,
            label: alarm.label,
            repeat: alarm.repeat,
            customDays: alarm.customDays || [],
        };
        showAlarmModal = true;
    }

    async function saveAlarm() {
        if (!alarmForm.time) {
            showToast("error", "Please set a time");
            playSound('error');
            return;
        }

        if (editingAlarm) {
            const updatedAlarm = {
                ...editingAlarm,
                time: alarmForm.time,
                label: alarmForm.label,
                repeat: alarmForm.repeat,
                customDays:
                    alarmForm.repeat === "custom"
                        ? alarmForm.customDays
                        : undefined,
            };
            updateAlarmLocal(editingAlarm.id, updatedAlarm);
            await saveAlarmToSupabase(updatedAlarm);
            showToast("success", "Alarm updated");
            playSound('success');
        } else {
            const newAlarm: Alarm = {
                id: Math.random().toString(36).substring(7),
                time: alarmForm.time,
                label: alarmForm.label || "Alarm",
                enabled: true,
                repeat: alarmForm.repeat,
                customDays:
                    alarmForm.repeat === "custom"
                        ? alarmForm.customDays
                        : undefined,
                createdAt: new Date().toISOString(),
            };
            addAlarmLocal(newAlarm);
            await saveAlarmToSupabase(newAlarm);
            showToast("success", "Alarm created");
            playSound('success');
        }

        alarms = await loadAlarmsFromSupabase();
        showAlarmModal = false;
    }

    function toggleAlarm(id: string) {
        unlockAudio();
        const alarm = alarms.find((a) => a.id === id);
        if (alarm) {
            const updated = { ...alarm, enabled: !alarm.enabled };
            updateAlarmLocal(id, { enabled: !alarm.enabled });
            saveAlarmToSupabase(updated);
            loadAlarmsFromSupabase().then(a => alarms = a);
            playSound('notification');
            hapticFeedback.toggle();
        }
    }

    async function handleDeleteAlarm() {
        if (editingAlarm) {
            deleteAlarmLocal(editingAlarm.id);
            await deleteAlarmFromSupabase(editingAlarm.id);
            alarms = await loadAlarmsFromSupabase();
            showAlarmModal = false;
            showToast("success", "Alarm deleted");
            playSound('notification');
        }
    }

    function createTimer() {
        unlockAudio();
        const totalSeconds =
            timerForm.hours * 3600 + timerForm.minutes * 60 + timerForm.seconds;

        if (totalSeconds <= 0) {
            showToast("error", "Please set a valid duration");
            playSound('error');
            return;
        }

        const newTimer: Timer = {
            id: Math.random().toString(36).substring(7),
            label: timerForm.label || `Timer ${timers.length + 1}`,
            duration: totalSeconds,
            remaining: totalSeconds,
            isRunning: true,
            createdAt: new Date().toISOString(),
        };

        addTimer(newTimer);
        timers = getTimers();
        showToast("success", "Timer started");
        playSound('success');
        hapticFeedback.success();

        // Reset form
        timerForm = {
            label: "",
            hours: 0,
            minutes: 5,
            seconds: 0,
        };
    }

    function toggleTimer(id: string) {
        unlockAudio();
        const timer = timers.find((t) => t.id === id);
        if (timer) {
            updateTimer(id, { isRunning: !timer.isRunning });
            timers = getTimers();
            playSound('notification');
            hapticFeedback.toggle();
        }
    }

    function resetTimer(id: string) {
        const timer = timers.find((t) => t.id === id);
        if (timer) {
            updateTimer(id, { remaining: timer.duration, isRunning: false });
            timers = getTimers();
            playSound('notification');
        }
    }

    function removeTimer(id: string) {
        if (confirm("Delete this timer?")) {
            deleteTimer(id);
            timers = getTimers();
            showToast("success", "Timer deleted");
            playSound('notification');
        }
    }

    function formatTime(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    function getRepeatLabel(repeat: Alarm["repeat"]): string {
        const labels = {
            none: "Once",
            daily: "Every day",
            weekdays: "Weekdays",
            weekends: "Weekends",
            custom: "Custom",
        };
        return labels[repeat];
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h2 class="text-3xl font-heading font-bold">Alarms & Timers</h2>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 border-b border-white/10">
        <button
            on:click={() => (activeTab = "alarms")}
            class="px-6 py-3 font-medium transition-all border-b-2 {activeTab ===
            'alarms'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'}"
        >
            <span class="mdi mdi-alarm mr-2"></span>
            Alarms
        </button>
        <button
            on:click={() => (activeTab = "timers")}
            class="px-6 py-3 font-medium transition-all border-b-2 {activeTab ===
            'timers'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'}"
        >
            <span class="mdi mdi-timer-outline mr-2"></span>
            Timers
        </button>
    </div>

    <!-- Alarms Tab -->
    {#if activeTab === "alarms"}
        <div class="space-y-6">
            <button
                on:click={openNewAlarmModal}
                class="w-full btn btn-primary flex items-center justify-center gap-2 py-4 shadow-lg shadow-primary/20"
            >
                <img src="/assets/glass_10_add.png" alt="Add" class="w-6 h-6" />
                New Alarm
            </button>

            <div class="space-y-4">
                {#each alarms as alarm (alarm.id)}
                    <div class="glass-card p-6 group">
                        <div class="flex items-center justify-between">
                            <button
                                on:click={() => openEditAlarmModal(alarm)}
                                class="flex-1 text-left"
                            >
                                <div
                                    class="text-5xl font-heading font-bold mb-2 tracking-tight group-hover:text-primary transition-colors"
                                >
                                    {alarm.time}
                                </div>
                                <div
                                    class="text-sm text-gray-400 flex items-center gap-2"
                                >
                                    <span class="font-medium text-white"
                                        >{alarm.label || "Alarm"}</span
                                    >
                                    {#if alarm.repeat !== "none"}
                                        <span
                                            class="w-1 h-1 rounded-full bg-gray-500"
                                        ></span>
                                        <span
                                            >{getRepeatLabel(
                                                alarm.repeat,
                                            )}</span
                                        >
                                    {/if}
                                </div>
                            </button>

                            <!-- svelte-ignore a11y_label_has_associated_control -->
                            <label
                                class="relative inline-block w-14 h-8 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={alarm.enabled}
                                    on:change={() => toggleAlarm(alarm.id)}
                                    class="sr-only peer"
                                />
                                <div
                                    class="w-full h-full bg-white/10 peer-checked:bg-success rounded-full peer transition-all duration-300"
                                ></div>
                                <div
                                    class="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-6 shadow-md"
                                ></div>
                            </label>
                        </div>
                    </div>
                {:else}
                    <div
                        class="glass-panel rounded-3xl text-center py-16 border-dashed border-2 border-white/10"
                    >
                        <div
                            class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4"
                        >
                            <span
                                class="mdi mdi-alarm-off text-4xl text-gray-500"
                            ></span>
                        </div>
                        <p class="text-gray-400 text-lg">No alarms set</p>
                        <button
                            on:click={openNewAlarmModal}
                            class="text-primary hover:text-primary-400 font-medium mt-2"
                        >
                            Create your first alarm
                        </button>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Timers Tab -->
    {#if activeTab === "timers"}
        <div class="space-y-6">
            <!-- New Timer Form -->
            <div class="glass-panel rounded-3xl p-6">
                <h3
                    class="text-lg font-heading font-bold mb-6 flex items-center gap-2"
                >
                    <span class="mdi mdi-timer-plus text-primary"></span>
                    Create Timer
                </h3>
                <div class="space-y-6">
                    <input
                        type="text"
                        bind:value={timerForm.label}
                        placeholder="Timer label (optional)"
                        class="glass-input"
                    />

                    <div class="grid grid-cols-3 gap-4">
                        <div
                            class="bg-white/5 rounded-2xl p-4 border border-white/5"
                        >
                            <label
                                for="timer-hours"
                                class="block text-xs text-gray-400 mb-2 uppercase tracking-wider text-center"
                                >Hours</label
                            >
                            <input
                                id="timer-hours"
                                type="number"
                                bind:value={timerForm.hours}
                                min="0"
                                max="23"
                                class="w-full bg-transparent text-center text-3xl font-bold focus:outline-none"
                            />
                        </div>
                        <div
                            class="bg-white/5 rounded-2xl p-4 border border-white/5"
                        >
                            <label
                                for="timer-minutes"
                                class="block text-xs text-gray-400 mb-2 uppercase tracking-wider text-center"
                                >Minutes</label
                            >
                            <input
                                id="timer-minutes"
                                type="number"
                                bind:value={timerForm.minutes}
                                min="0"
                                max="59"
                                class="w-full bg-transparent text-center text-3xl font-bold focus:outline-none"
                            />
                        </div>
                        <div
                            class="bg-white/5 rounded-2xl p-4 border border-white/5"
                        >
                            <label
                                for="timer-seconds"
                                class="block text-xs text-gray-400 mb-2 uppercase tracking-wider text-center"
                                >Seconds</label
                            >
                            <input
                                id="timer-seconds"
                                type="number"
                                bind:value={timerForm.seconds}
                                min="0"
                                max="59"
                                class="w-full bg-transparent text-center text-3xl font-bold focus:outline-none"
                            />
                        </div>
                    </div>

                    <button
                        on:click={createTimer}
                        class="w-full btn btn-primary py-3 shadow-lg shadow-primary/20"
                    >
                        Start Timer
                    </button>
                </div>
            </div>

            <!-- Active Timers -->
            <div class="space-y-4">
                {#each timers as timer (timer.id)}
                    <div class="glass-card p-6 relative overflow-hidden">
                        <!-- Progress Background -->
                        <div
                            class="absolute bottom-0 left-0 h-1 bg-white/10 w-full"
                        >
                            <div
                                class="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-linear"
                                style="width: {(timer.remaining /
                                    timer.duration) *
                                    100}%"
                            ></div>
                        </div>

                        <div class="mb-6 text-center">
                            <h4 class="font-medium text-gray-400 mb-2">
                                {timer.label}
                            </h4>
                            <div
                                class="text-6xl font-heading font-bold tracking-tight tabular-nums"
                            >
                                {formatTime(timer.remaining)}
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button
                                on:click={() => toggleTimer(timer.id)}
                                class="flex-1 btn {timer.isRunning
                                    ? 'bg-warning/20 text-warning hover:bg-warning hover:text-white border border-warning/20'
                                    : 'btn-primary'}"
                            >
                                <span
                                    class="mdi mdi-{timer.isRunning
                                        ? 'pause'
                                        : 'play'} mr-2"
                                ></span>
                                {timer.isRunning ? "Pause" : "Start"}
                            </button>
                            <button
                                on:click={() => resetTimer(timer.id)}
                                class="btn btn-secondary"
                                title="Reset"
                            >
                                <span class="mdi mdi-refresh"></span>
                            </button>
                            <button
                                on:click={() => removeTimer(timer.id)}
                                class="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 p-2"
                                title="Delete"
                            >
                                <img src="/assets/glass_15_delete.png" alt="Delete" class="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                {:else}
                    <div
                        class="glass-panel rounded-3xl text-center py-12 border-dashed border-2 border-white/10"
                    >
                        <span
                            class="mdi mdi-timer-off-outline text-5xl text-gray-600 mb-4"
                        ></span>
                        <p class="text-gray-400">No active timers</p>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<!-- Alarm Modal -->
<Modal
    bind:show={showAlarmModal}
    title={editingAlarm ? "Edit Alarm" : "New Alarm"}
>
    <div class="space-y-6">
        <div class="flex justify-center py-4">
            <input
                type="time"
                bind:value={alarmForm.time}
                class="bg-transparent text-6xl font-heading font-bold text-center focus:outline-none border-b-2 border-white/10 focus:border-primary transition-colors w-full max-w-[200px]"
            />
        </div>

        <div>
            <label for="alarm-label" class="block text-sm font-medium mb-2 text-gray-300"
                >Label</label
            >
            <input
                id="alarm-label"
                type="text"
                bind:value={alarmForm.label}
                placeholder="Wake up, Meeting, etc."
                class="glass-input"
            />
        </div>

        <div>
            <label for="alarm-repeat" class="block text-sm font-medium mb-2 text-gray-300"
                >Repeat</label
            >
            <div class="relative">
                <select
                    id="alarm-repeat"
                    bind:value={alarmForm.repeat}
                    class="glass-input appearance-none"
                >
                    <option value="none" class="bg-[#020617]"
                        >Does not repeat</option
                    >
                    <option value="daily" class="bg-[#020617]">Every day</option
                    >
                    <option value="weekdays" class="bg-[#020617]"
                        >Weekdays (Mon-Fri)</option
                    >
                    <option value="weekends" class="bg-[#020617]"
                        >Weekends (Sat-Sun)</option
                    >
                    <option value="custom" class="bg-[#020617]">Custom</option>
                </select>
                <span
                    class="mdi mdi-chevron-down absolute right-4 top-3.5 text-gray-400 pointer-events-none"
                ></span>
            </div>
        </div>

        {#if alarmForm.repeat === "custom"}
            <fieldset>
                <legend class="block text-sm font-medium mb-2 text-gray-300"
                    >Select Days</legend
                >
                <div class="grid grid-cols-7 gap-2">
                    {#each dayNames as day, index}
                        <label class="cursor-pointer">
                            <input
                                type="checkbox"
                                checked={alarmForm.customDays.includes(index)}
                                on:change={(e) => {
                                    if (e.currentTarget.checked) {
                                        alarmForm.customDays = [
                                            ...alarmForm.customDays,
                                            index,
                                        ];
                                    } else {
                                        alarmForm.customDays =
                                            alarmForm.customDays.filter(
                                                (d) => d !== index,
                                            );
                                    }
                                }}
                                class="sr-only peer"
                            />
                            <div
                                class="w-full aspect-square flex items-center justify-center rounded-xl border border-white/10 bg-white/5 peer-checked:bg-primary peer-checked:border-primary peer-checked:text-white text-gray-400 transition-all hover:bg-white/10"
                            >
                                {day.charAt(0)}
                            </div>
                        </label>
                    {/each}
                </div>
            </fieldset>
        {/if}
    </div>

    <div slot="footer">
        {#if editingAlarm}
            <button
                on:click={handleDeleteAlarm}
                class="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20"
            >
                Delete
            </button>
        {/if}
        <button
            on:click={() => (showAlarmModal = false)}
            class="btn btn-secondary"
        >
            Cancel
        </button>
        <button on:click={saveAlarm} class="btn btn-primary">
            {editingAlarm ? "Update" : "Create"}
        </button>
    </div>
</Modal>

<!-- Ringing Alarm Modal -->
{#if showRingingModal && ringingAlarm}
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
        <div class="text-center p-8 max-w-sm w-full mx-4">
            <!-- Animated alarm icon -->
            <div class="relative mb-8">
                <div class="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center animate-pulse">
                    <span class="mdi mdi-alarm text-7xl text-white animate-bounce"></span>
                </div>
                <div class="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
            </div>
            
            <!-- Time -->
            <div class="text-6xl font-heading font-bold mb-4 tracking-tight">
                {ringingAlarm.time}
            </div>
            
            <!-- Label -->
            <div class="text-xl text-gray-300 mb-12">
                {ringingAlarm.label || "Alarm"}
            </div>
            
            <!-- Action buttons -->
            <div class="flex gap-4 justify-center">
                <button
                    on:click={snoozeAlarm}
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
