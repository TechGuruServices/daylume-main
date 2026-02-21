<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type {
        AppSettings,
        VisualTheme,
        CustomBackgroundSettings,
    } from "$lib/types";
    import {
        getSettings,
        saveSettings,
        exportAllData,
        importAllData,
        clearAllData,
        getThemeSettings,
        saveThemeSettings,
    } from "$lib/storage";
    import { AI_MODELS } from "$lib/ai-providers";

    import { showToast } from "$lib/toast";
    import { themeStore, updateTheme } from "$lib/theme";
    import {
        notificationSettingsStore,
        type NotificationSettings,
        SmartNotificationManager,
    } from "$lib/smart-notifications";

    let settings: AppSettings;

    let selectedModel = "llama3.2";
    let selectedVisualTheme: VisualTheme = "default";

    // Custom background state
    let customBackground: CustomBackgroundSettings | undefined;
    let isUploading = false;
    let shuffleInterval: NodeJS.Timeout | null = null;

    // Notification state
    let notificationSettings: NotificationSettings;
    let notificationPermission: NotificationPermission = "default";

    $: notificationSettings = $notificationSettingsStore;

    const visualThemes: {
        id: VisualTheme;
        name: string;
        description: string;
        icon: string;
        colors: string[];
    }[] = [
        {
            id: "default",
            name: "Default",
            description: "Classic ambient orbs",
            icon: "mdi-circle-outline",
            colors: ["#8B5CF6", "#EC4899"],
        },
        {
            id: "aurora",
            name: "Aurora",
            description: "Northern lights animation",
            icon: "mdi-weather-night",
            colors: ["#00FF7F", "#00C8FF", "#8A2BE2"],
        },
        {
            id: "sunset",
            name: "Sunset",
            description: "Warm gradient orbs",
            icon: "mdi-weather-sunset",
            colors: ["#FF6B35", "#F7931E", "#FF1493"],
        },
        {
            id: "ocean",
            name: "Ocean",
            description: "Deep blue waves",
            icon: "mdi-waves",
            colors: ["#0077B6", "#00B4D8", "#90E0EF"],
        },
        {
            id: "forest",
            name: "Forest",
            description: "Green leaf particles",
            icon: "mdi-leaf",
            colors: ["#2D5A27", "#4A7C59", "#8FB339"],
        },
        {
            id: "minimal",
            name: "Minimal",
            description: "Pure black/white",
            icon: "mdi-contrast-box",
            colors: ["#000000", "#FFFFFF"],
        },
    ];

    onMount(async () => {
        settings = getSettings();
        selectedModel = settings.ai.model || "llama3.2";

        // Load current visual theme and custom background
        const themeSettings = getThemeSettings();
        selectedVisualTheme = themeSettings.visualTheme || "default";
        customBackground = themeSettings.customBackground;

        // Start shuffle interval if enabled
        if (
            customBackground?.shuffleEnabled &&
            customBackground.images.length > 1
        ) {
            startShuffleInterval();
        }

        // Check notification permission
        if (typeof window !== "undefined" && "Notification" in window) {
            notificationPermission = Notification.permission;
        }
    });

    onDestroy(() => {
        if (shuffleInterval) {
            clearInterval(shuffleInterval);
        }
    });

    function startShuffleInterval() {
        if (shuffleInterval) clearInterval(shuffleInterval);
        if (
            !customBackground?.shuffleEnabled ||
            !customBackground.images.length
        )
            return;

        const intervalMs = (customBackground.shuffleInterval || 10) * 60 * 1000;
        shuffleInterval = setInterval(() => {
            shuffleToNextImage();
        }, intervalMs);
    }

    function shuffleToNextImage() {
        if (!customBackground || customBackground.images.length <= 1) return;

        const nextIndex =
            (customBackground.currentIndex + 1) %
            customBackground.images.length;
        customBackground = {
            ...customBackground,
            currentIndex: nextIndex,
            lastShuffled: new Date().toISOString(),
        };
        updateTheme({ customBackground });
    }

    function handleVisualThemeChange(themeId: VisualTheme) {
        selectedVisualTheme = themeId;
        updateTheme({ visualTheme: themeId });
        showToast(
            "success",
            `Theme changed to ${visualThemes.find((t) => t.id === themeId)?.name}`,
        );
    }

    async function handleImageUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (!files?.length) return;

        isUploading = true;

        try {
            const newImages: string[] = [];

            for (const file of files) {
                if (!file.type.startsWith("image/")) {
                    showToast("error", `${file.name} is not an image`);
                    continue;
                }

                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showToast("error", `${file.name} is too large (max 5MB)`);
                    continue;
                }

                const base64 = await fileToBase64(file);
                newImages.push(base64);
            }

            if (newImages.length > 0) {
                const existingImages = customBackground?.images || [];
                customBackground = {
                    images: [...existingImages, ...newImages],
                    shuffleEnabled: customBackground?.shuffleEnabled || false,
                    shuffleInterval: customBackground?.shuffleInterval || 10,
                    currentIndex:
                        existingImages.length === 0
                            ? 0
                            : customBackground?.currentIndex || 0,
                };

                updateTheme({ customBackground });
                showToast("success", `${newImages.length} image(s) added`);
            }
        } catch (error) {
            showToast("error", "Failed to upload image(s)");
            console.error(error);
        } finally {
            isUploading = false;
            input.value = "";
        }
    }

    function fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function removeImage(index: number) {
        if (!customBackground) return;

        const newImages = customBackground.images.filter((_, i) => i !== index);

        if (newImages.length === 0) {
            // Clear custom background entirely
            customBackground = undefined;
            updateTheme({ customBackground: undefined });
            showToast("success", "Custom background removed");
        } else {
            // Adjust current index if needed
            let newIndex = customBackground.currentIndex;
            if (index <= newIndex) {
                newIndex = Math.max(0, newIndex - 1);
            }
            if (newIndex >= newImages.length) {
                newIndex = 0;
            }

            customBackground = {
                ...customBackground,
                images: newImages,
                currentIndex: newIndex,
            };
            updateTheme({ customBackground });
            showToast("success", "Image removed");
        }
    }

    function selectImage(index: number) {
        if (!customBackground) return;

        customBackground = {
            ...customBackground,
            currentIndex: index,
        };
        updateTheme({ customBackground });
    }

    function toggleShuffle() {
        if (!customBackground) return;

        customBackground = {
            ...customBackground,
            shuffleEnabled: !customBackground.shuffleEnabled,
        };
        updateTheme({ customBackground });

        if (customBackground.shuffleEnabled) {
            startShuffleInterval();
            showToast(
                "success",
                `Shuffle enabled (every ${customBackground.shuffleInterval} min)`,
            );
        } else {
            if (shuffleInterval) clearInterval(shuffleInterval);
            showToast("success", "Shuffle disabled");
        }
    }

    function setShuffleInterval(minutes: 3 | 10 | 30) {
        if (!customBackground) return;

        customBackground = {
            ...customBackground,
            shuffleInterval: minutes,
        };
        updateTheme({ customBackground });

        if (customBackground.shuffleEnabled) {
            startShuffleInterval();
        }
        showToast("success", `Shuffle interval set to ${minutes} minutes`);
    }

    function clearAllBackgrounds() {
        if (confirm("Remove all custom background images?")) {
            customBackground = undefined;
            updateTheme({ customBackground: undefined });
            if (shuffleInterval) clearInterval(shuffleInterval);
            showToast("success", "All custom backgrounds removed");
        }
    }

    async function handleSaveSettings() {
        const newSettings: AppSettings = {
            ...settings,
            ai: {
                model: selectedModel,
            },
        };

        saveSettings(newSettings);
        settings = newSettings;
        showToast("success", "AI model saved: " + selectedModel);
    }

    let testingApi = false;
    async function handleTestConnection() {
        testingApi = true;
        try {
            const response = await fetch(
                "http://localhost:11434/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: [
                            {
                                role: "user",
                                content: 'Say "test successful" in 2 words',
                            },
                        ],
                        max_tokens: 20,
                    }),
                },
            );

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                const reply =
                    data?.choices?.[0]?.message?.content || "Connected!";
                showToast(
                    "success",
                    `✅ Ollama connected! Response: ${reply.substring(0, 50)}`,
                );
            } else {
                const errorMsg =
                    data?.error?.message ||
                    data?.error ||
                    `Error ${response.status}. Make sure you have pulled the model: ollama pull ${selectedModel}`;
                showToast(
                    "error",
                    `❌ ${typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg)}`,
                );
            }
        } catch (error) {
            console.error("[Test] Failed:", error);
            showToast(
                "error",
                `❌ Cannot connect to Ollama. Make sure it's running: ollama serve`,
            );
        } finally {
            testingApi = false;
        }
    }

    function handleExportData() {
        try {
            const data = exportAllData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `daylume-backup-${new Date().toISOString().split("T")[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("success", "Data exported successfully");
        } catch (error) {
            showToast("error", `Export failed: ${error}`);
        }
    }

    function handleImportData(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);

                if (confirm("This will replace all current data. Continue?")) {
                    importAllData(data);
                    showToast("success", "Data imported successfully");
                    setTimeout(() => location.reload(), 1000);
                }
            } catch (error) {
                showToast("error", `Import failed: ${error}`);
            }
        };
        reader.readAsText(file);

        // Reset input so same file can be imported again
        input.value = "";
    }

    function handleClearAllData() {
        if (
            confirm(
                "Are you sure you want to delete ALL data? This cannot be undone!",
            )
        ) {
            if (
                confirm(
                    "Really delete everything? Please confirm one more time.",
                )
            ) {
                clearAllData();
                showToast("success", "All data cleared");
                setTimeout(() => location.reload(), 1000);
            }
        }
    }

    function getSelectedModelInfo() {
        const model = AI_MODELS.find((m) => m.id === selectedModel);
        return model ? `${model.name} (Ollama Local)` : selectedModel;
    }

    // Group models by category for display
    function getModelsByCategory() {
        const grouped: Record<string, (typeof AI_MODELS)[number][]> = {};
        AI_MODELS.forEach((model) => {
            const cat = (model as any).category || "General";
            if (!grouped[cat]) {
                grouped[cat] = [];
            }
            grouped[cat].push(model);
        });
        return grouped;
    }

    // Notification settings helpers
    async function handleEnableNotifications() {
        if (typeof window !== "undefined" && "Notification" in window) {
            const permission = await Notification.requestPermission();
            notificationPermission = permission;
            if (permission === "granted") {
                showToast("success", "Notifications enabled!");
            } else {
                showToast("error", "Permission denied");
            }
        }
    }
</script>

<div class="space-y-8 max-w-4xl mx-auto">
    <div>
        <h2 class="text-4xl font-heading font-bold mb-2">Settings</h2>
        <p class="text-gray-400 text-lg">
            Configure your AI assistant, themes, and manage your data
        </p>
    </div>

    <!-- Visual Themes Section -->
    <div class="glass-panel rounded-3xl p-8">
        <h3
            class="text-2xl font-heading font-bold mb-6 flex items-center gap-3"
        >
            <div
                class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center"
            >
                <span class="mdi mdi-palette text-green-400 text-xl"></span>
            </div>
            Visual Themes
        </h3>

        <p class="text-gray-400 mb-6">
            Choose a unique animated backdrop for your dashboard
        </p>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            {#each visualThemes as theme}
                <button
                    on:click={() => handleVisualThemeChange(theme.id)}
                    class="relative group p-4 rounded-2xl border-2 transition-all duration-300 text-left
                        {selectedVisualTheme === theme.id
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}"
                >
                    <!-- Theme Preview -->
                    <div
                        class="w-full h-20 rounded-xl mb-3 overflow-hidden relative"
                        style="background: linear-gradient(135deg, {theme.colors.join(
                            ', ',
                        )});"
                    >
                        <!-- Animated preview indicator -->
                        {#if theme.id === "aurora"}
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-pulse"
                            ></div>
                        {/if}
                        <div
                            class="absolute inset-0 flex items-center justify-center"
                        >
                            <span
                                class="mdi {theme.icon} text-3xl text-white/80 drop-shadow-lg"
                            ></span>
                        </div>
                    </div>

                    <!-- Theme Info -->
                    <div class="flex items-start justify-between">
                        <div>
                            <h4 class="font-bold text-white mb-0.5">
                                {theme.name}
                            </h4>
                            <p class="text-xs text-gray-400">
                                {theme.description}
                            </p>
                        </div>
                        {#if selectedVisualTheme === theme.id}
                            <img
                                src="/assets/glass_11_confirm.png"
                                alt="Selected"
                                class="w-5 h-5"
                            />
                        {/if}
                    </div>

                    <!-- Color dots -->
                    <div class="flex gap-1.5 mt-3">
                        {#each theme.colors as color}
                            <div
                                class="w-4 h-4 rounded-full border border-white/20"
                                style="background-color: {color};"
                            ></div>
                        {/each}
                    </div>
                </button>
            {/each}
        </div>
    </div>

    <!-- Custom Background Section -->
    <div class="glass-panel rounded-3xl p-8">
        <h3
            class="text-2xl font-heading font-bold mb-6 flex items-center gap-3"
        >
            <div
                class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center"
            >
                <span class="mdi mdi-image-multiple text-purple-400 text-xl"
                ></span>
            </div>
            Custom Background
        </h3>

        <p class="text-gray-400 mb-6">
            Upload your own images as background. Custom backgrounds override
            visual themes.
        </p>

        <!-- Upload Button -->
        <div class="flex flex-wrap gap-3 mb-6">
            <label
                class="btn btn-primary cursor-pointer inline-flex items-center gap-2 {isUploading
                    ? 'opacity-50 pointer-events-none'
                    : ''}"
            >
                <img
                    src="/assets/glass_10_add.png"
                    alt="Upload"
                    class="w-5 h-5"
                />
                {isUploading ? "Uploading..." : "Upload Images"}
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    on:change={handleImageUpload}
                    class="sr-only"
                    disabled={isUploading}
                />
            </label>

            {#if customBackground?.images?.length}
                <button
                    on:click={clearAllBackgrounds}
                    class="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 flex items-center gap-2"
                >
                    <img
                        src="/assets/glass_15_delete.png"
                        alt="Delete"
                        class="w-5 h-5"
                    />
                    Clear All
                </button>
            {/if}
        </div>

        {#if customBackground?.images?.length}
            <!-- Shuffle Controls -->
            <div class="p-4 bg-white/5 rounded-2xl mb-6 space-y-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span
                            class="mdi mdi-shuffle-variant text-xl text-gray-400"
                        ></span>
                        <div>
                            <h4 class="font-bold text-white">Auto Shuffle</h4>
                            <p class="text-xs text-gray-400">
                                Automatically rotate through images
                            </p>
                        </div>
                    </div>
                    <button
                        on:click={toggleShuffle}
                        class="relative w-14 h-8 rounded-full transition-colors duration-300 {customBackground?.shuffleEnabled
                            ? 'bg-primary'
                            : 'bg-white/20'}"
                    >
                        <span
                            class="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 {customBackground?.shuffleEnabled
                                ? 'left-7'
                                : 'left-1'}"
                        ></span>
                    </button>
                </div>

                {#if customBackground?.shuffleEnabled}
                    <div class="flex gap-2">
                        <span class="text-sm text-gray-400 self-center"
                            >Interval:</span
                        >
                        <button
                            on:click={() => setShuffleInterval(3)}
                            class="px-4 py-2 rounded-xl text-sm font-medium transition-all {customBackground.shuffleInterval ===
                            3
                                ? 'bg-primary text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'}"
                        >
                            3 min
                        </button>
                        <button
                            on:click={() => setShuffleInterval(10)}
                            class="px-4 py-2 rounded-xl text-sm font-medium transition-all {customBackground.shuffleInterval ===
                            10
                                ? 'bg-primary text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'}"
                        >
                            10 min
                        </button>
                        <button
                            on:click={() => setShuffleInterval(30)}
                            class="px-4 py-2 rounded-xl text-sm font-medium transition-all {customBackground.shuffleInterval ===
                            30
                                ? 'bg-primary text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'}"
                        >
                            30 min
                        </button>
                    </div>
                {/if}
            </div>

            <!-- Image Gallery -->
            <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {#each customBackground.images as image, index}
                    <button
                        type="button"
                        on:click={() => selectImage(index)}
                        class="relative group aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all {customBackground.currentIndex ===
                        index
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-transparent hover:border-white/20'}"
                    >
                        <img
                            src={image}
                            alt="Background {index + 1}"
                            class="w-full h-full object-cover"
                        />

                        <!-- Current indicator -->
                        {#if customBackground.currentIndex === index}
                            <div
                                class="absolute top-2 left-2 px-2 py-0.5 bg-primary rounded-full text-xs font-bold text-white"
                            >
                                Active
                            </div>
                        {/if}

                        <!-- Remove button -->
                        <button
                            type="button"
                            on:click|stopPropagation={() => removeImage(index)}
                            class="absolute top-2 right-2 w-7 h-7 bg-danger/80 hover:bg-danger rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <span class="mdi mdi-close text-white text-sm"
                            ></span>
                        </button>

                        <!-- Click to select overlay -->
                        {#if customBackground.currentIndex !== index}
                            <div
                                class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            >
                                <span class="text-white text-sm font-medium"
                                    >Click to use</span
                                >
                            </div>
                        {/if}
                    </button>
                {/each}
            </div>

            <p class="text-xs text-gray-500 mt-4 flex items-center gap-2">
                <span class="mdi mdi-information-outline"></span>
                {customBackground.images.length} image{customBackground.images
                    .length !== 1
                    ? "s"
                    : ""} uploaded. Click an image to set it as the current background.
            </p>
        {:else}
            <!-- Empty State -->
            <div
                class="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center"
            >
                <span
                    class="mdi mdi-image-plus text-5xl text-gray-500 mb-4 block"
                ></span>
                <h4 class="font-bold text-gray-300 mb-2">
                    No custom backgrounds
                </h4>
                <p class="text-sm text-gray-500 mb-4">
                    Upload images to personalize your dashboard background
                </p>
                <p class="text-xs text-gray-600">
                    Supported formats: JPG, PNG, GIF, WebP (max 5MB each)
                </p>
            </div>
        {/if}
    </div>

    <!-- Smart Notifications Section -->
    <div class="glass-panel rounded-3xl p-8">
        <h3
            class="text-2xl font-heading font-bold mb-6 flex items-center gap-3"
        >
            <div
                class="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center"
            >
                <span class="mdi mdi-bell-ring text-yellow-400 text-xl"></span>
            </div>
            Smart Notifications
        </h3>

        <p class="text-gray-400 mb-6">
            Intelligent reminders with priority sounds, quiet hours, and
            location awareness
        </p>

        <!-- Permission Status -->
        {#if notificationPermission !== "granted"}
            <div
                class="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 mb-6"
            >
                <div class="flex items-start gap-3">
                    <span class="text-2xl">🔔</span>
                    <div class="flex-1">
                        <h4 class="font-semibold text-yellow-400">
                            Enable Notifications
                        </h4>
                        <p class="text-sm text-gray-400 mt-1">
                            Allow notifications to receive smart reminders for
                            tasks, habits, and events
                        </p>
                        <button
                            on:click={handleEnableNotifications}
                            class="mt-3 px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium text-sm hover:bg-yellow-400 transition-colors"
                        >
                            Enable Notifications
                        </button>
                    </div>
                </div>
            </div>
        {:else}
            <div
                class="p-3 rounded-xl bg-green-500/10 border border-green-500/30 mb-6 flex items-center gap-2"
            >
                <span class="mdi mdi-check-circle text-green-400"></span>
                <span class="text-sm text-green-300">Notifications enabled</span
                >
            </div>
        {/if}

        <div class="space-y-6">
            <!-- Main Toggle -->
            <div
                class="flex items-center justify-between p-4 bg-white/5 rounded-2xl"
            >
                <div>
                    <h4 class="font-bold text-white">Smart Notifications</h4>
                    <p class="text-sm text-gray-400">
                        Enable intelligent reminder system
                    </p>
                </div>
                <button
                    on:click={() =>
                        notificationSettingsStore.update((s) => ({
                            ...s,
                            enabled: !s.enabled,
                        }))}
                    class="relative w-14 h-8 rounded-full transition-colors duration-300 {notificationSettings.enabled
                        ? 'bg-primary'
                        : 'bg-white/20'}"
                >
                    <span
                        class="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 {notificationSettings.enabled
                            ? 'left-7'
                            : 'left-1'}"
                    ></span>
                </button>
            </div>

            <!-- Quiet Hours -->
            <div class="p-4 bg-white/5 rounded-2xl space-y-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span
                            class="mdi mdi-moon-waning-crescent text-xl text-indigo-400"
                        ></span>
                        <div>
                            <h4 class="font-bold text-white">Quiet Hours</h4>
                            <p class="text-xs text-gray-400">
                                Pause notifications during sleep time
                            </p>
                        </div>
                    </div>
                    <button
                        on:click={() =>
                            notificationSettingsStore.updateQuietHours({
                                ...notificationSettings.quietHours,
                                enabled:
                                    !notificationSettings.quietHours.enabled,
                            })}
                        class="relative w-14 h-8 rounded-full transition-colors duration-300 {notificationSettings
                            .quietHours.enabled
                            ? 'bg-primary'
                            : 'bg-white/20'}"
                    >
                        <span
                            class="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 {notificationSettings
                                .quietHours.enabled
                                ? 'left-7'
                                : 'left-1'}"
                        ></span>
                    </button>
                </div>

                {#if notificationSettings.quietHours.enabled}
                    <div class="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <label
                                for="quiet-hours-start"
                                class="text-xs text-gray-500 block mb-1"
                                >Start Time</label
                            >
                            <input
                                id="quiet-hours-start"
                                type="time"
                                value={notificationSettings.quietHours.start}
                                on:change={(e) =>
                                    notificationSettingsStore.updateQuietHours({
                                        ...notificationSettings.quietHours,
                                        start: e.currentTarget.value,
                                    })}
                                class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                            />
                        </div>
                        <div>
                            <label
                                for="quiet-hours-end"
                                class="text-xs text-gray-500 block mb-1"
                                >End Time</label
                            >
                            <input
                                id="quiet-hours-end"
                                type="time"
                                value={notificationSettings.quietHours.end}
                                on:change={(e) =>
                                    notificationSettingsStore.updateQuietHours({
                                        ...notificationSettings.quietHours,
                                        end: e.currentTarget.value,
                                    })}
                                class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                            />
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Focus Mode -->
            <div
                class="flex items-center justify-between p-4 bg-white/5 rounded-2xl"
            >
                <div class="flex items-center gap-3">
                    <span class="mdi mdi-focus-field text-xl text-blue-400"
                    ></span>
                    <div>
                        <h4 class="font-bold text-white">Focus Mode</h4>
                        <p class="text-xs text-gray-400">
                            Block non-urgent notifications
                        </p>
                    </div>
                </div>
                <button
                    on:click={() => notificationSettingsStore.toggleFocusMode()}
                    class="relative w-14 h-8 rounded-full transition-colors duration-300 {notificationSettings
                        .focusMode.enabled
                        ? 'bg-primary'
                        : 'bg-white/20'}"
                >
                    <span
                        class="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 {notificationSettings
                            .focusMode.enabled
                            ? 'left-7'
                            : 'left-1'}"
                    ></span>
                </button>
            </div>

            <!-- Location Reminders -->
            <div
                class="flex items-center justify-between p-4 bg-white/5 rounded-2xl"
            >
                <div class="flex items-center gap-3">
                    <span class="mdi mdi-map-marker text-xl text-red-400"
                    ></span>
                    <div>
                        <h4 class="font-bold text-white">Location Reminders</h4>
                        <p class="text-xs text-gray-400">
                            Get reminded when near specific places
                        </p>
                    </div>
                </div>
                <button
                    on:click={() =>
                        notificationSettingsStore.update((s) => ({
                            ...s,
                            locationReminders: {
                                ...s.locationReminders,
                                enabled: !s.locationReminders.enabled,
                            },
                        }))}
                    class="relative w-14 h-8 rounded-full transition-colors duration-300 {notificationSettings
                        .locationReminders.enabled
                        ? 'bg-primary'
                        : 'bg-white/20'}"
                >
                    <span
                        class="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 {notificationSettings
                            .locationReminders.enabled
                            ? 'left-7'
                            : 'left-1'}"
                    ></span>
                </button>
            </div>

            <!-- Smart Timing -->
            <div
                class="flex items-center justify-between p-4 bg-white/5 rounded-2xl"
            >
                <div class="flex items-center gap-3">
                    <span class="mdi mdi-clock-smart text-xl text-green-400"
                    ></span>
                    <div>
                        <h4 class="font-bold text-white">Smart Timing</h4>
                        <p class="text-xs text-gray-400">
                            AI-optimized notification timing
                        </p>
                    </div>
                </div>
                <button
                    on:click={() =>
                        notificationSettingsStore.update((s) => ({
                            ...s,
                            intelligentTiming: {
                                ...s.intelligentTiming,
                                enabled: !s.intelligentTiming.enabled,
                            },
                        }))}
                    class="relative w-14 h-8 rounded-full transition-colors duration-300 {notificationSettings
                        .intelligentTiming.enabled
                        ? 'bg-primary'
                        : 'bg-white/20'}"
                >
                    <span
                        class="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 {notificationSettings
                            .intelligentTiming.enabled
                            ? 'left-7'
                            : 'left-1'}"
                    ></span>
                </button>
            </div>

            <!-- Default Reminder -->
            <div class="p-4 bg-white/5 rounded-2xl">
                <h4 class="font-bold text-white mb-3">Default Task Reminder</h4>
                <select
                    value={notificationSettings.taskReminders.defaultBefore}
                    on:change={(e) =>
                        notificationSettingsStore.update((s) => ({
                            ...s,
                            taskReminders: {
                                ...s.taskReminders,
                                defaultBefore: parseInt(e.currentTarget.value),
                            },
                        }))}
                    class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm cursor-pointer"
                >
                    <option value="5">5 minutes before</option>
                    <option value="10">10 minutes before</option>
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                    <option value="1440">1 day before</option>
                </select>
            </div>
        </div>
    </div>

    <!-- AI Settings -->
    <div class="glass-panel rounded-3xl p-8">
        <h3
            class="text-2xl font-heading font-bold mb-6 flex items-center gap-3"
        >
            <div
                class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"
            >
                <span class="mdi mdi-robot-outline text-primary text-xl"></span>
            </div>
            AI Assistant — Local Ollama
        </h3>

        <div class="space-y-6">
            <!-- Info Box -->
            <div
                class="p-4 bg-info/10 border border-info/20 rounded-2xl flex items-start gap-3"
            >
                <span
                    class="mdi mdi-information-outline text-info text-xl mt-0.5"
                ></span>
                <div class="text-sm text-gray-300 leading-relaxed">
                    <strong>100% Local & Private:</strong> Daylume uses
                    <a
                        href="https://ollama.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-primary hover:underline">Ollama</a
                    >
                    to run AI models entirely on your machine. No API keys needed,
                    no data leaves your device. Install Ollama, pull a model (e.g.
                    <code class="text-primary">ollama pull llama3.2</code>), and
                    you're ready!
                </div>
            </div>

            <!-- Ollama Status Tip -->
            <div class="p-3 bg-white/5 rounded-xl flex items-center gap-3">
                <span class="mdi mdi-server-network text-emerald-400 text-lg"
                ></span>
                <div class="text-xs text-gray-400">
                    Ollama must be running at <code class="text-gray-300"
                        >http://localhost:11434</code
                    >. Start it with:
                    <code class="text-primary">ollama serve</code>
                </div>
            </div>

            <!-- Model Selection -->
            <div class="space-y-2">
                <label
                    class="block text-sm font-medium text-gray-300"
                    for="ai-model"
                >
                    Ollama Model
                </label>
                <select
                    id="ai-model"
                    bind:value={selectedModel}
                    class="glass-input text-sm cursor-pointer"
                >
                    {#each Object.entries(getModelsByCategory()) as [category, models]}
                        <optgroup label={category}>
                            {#each models as model}
                                <option value={model.id}>{model.name}</option>
                            {/each}
                        </optgroup>
                    {/each}
                </select>
                <p class="text-xs text-gray-500">
                    Selected: {getSelectedModelInfo()} — Pull this model:
                    <code class="text-gray-400"
                        >ollama pull {selectedModel}</code
                    >
                </p>
            </div>

            <!-- Quick Setup -->
            <div class="p-4 rounded-2xl border border-white/5 bg-white/5">
                <h4
                    class="font-bold text-sm text-white mb-3 flex items-center gap-2"
                >
                    <span class="mdi mdi-rocket-launch text-primary"></span>
                    Quick Setup
                </h4>
                <div class="text-xs text-gray-400 space-y-2 font-mono">
                    <p>
                        1. Install Ollama → <a
                            href="https://ollama.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-primary hover:underline">ollama.com</a
                        >
                    </p>
                    <p>
                        2. Pull a model → <code class="text-primary"
                            >ollama pull {selectedModel}</code
                        >
                    </p>
                    <p>
                        3. Start Ollama → <code class="text-primary"
                            >ollama serve</code
                        >
                    </p>
                    <p>4. Select your model above → Save & chat!</p>
                </div>
            </div>

            <div class="pt-4 space-y-3">
                <button
                    on:click={handleTestConnection}
                    disabled={testingApi}
                    class="btn w-full py-3 text-base border-2 border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {#if testingApi}
                        <span class="mdi mdi-loading mdi-spin"></span>
                        Testing...
                    {:else}
                        <span class="mdi mdi-connection"></span>
                        Test Ollama Connection
                    {/if}
                </button>
                <button
                    on:click={handleSaveSettings}
                    class="btn btn-primary w-full py-4 text-lg shadow-lg shadow-primary/20"
                >
                    Save AI Settings
                </button>
            </div>
        </div>
    </div>

    <!-- Data Management -->
    <div class="glass-panel rounded-3xl p-8">
        <h3
            class="text-2xl font-heading font-bold mb-6 flex items-center gap-3"
        >
            <div
                class="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center"
            >
                <span class="mdi mdi-database text-secondary text-xl"></span>
            </div>
            Data Management
        </h3>

        <div class="space-y-6">
            <div
                class="p-4 bg-warning/10 border border-warning/20 rounded-2xl flex items-start gap-3"
            >
                <span class="mdi mdi-alert text-warning text-xl mt-0.5"></span>
                <div class="text-sm text-gray-300 leading-relaxed">
                    <strong>Important:</strong> All your data is stored locally in
                    your browser. Regular backups are recommended to prevent data
                    loss.
                </div>
            </div>

            <!-- Export Data -->
            <div
                class="glass-card p-6 flex items-start gap-6 hover:border-white/10 transition-colors"
            >
                <div
                    class="w-14 h-14 rounded-2xl bg-gradient-to-br from-success to-info flex items-center justify-center flex-shrink-0 shadow-lg shadow-success/20"
                >
                    <span class="mdi mdi-download text-3xl text-white"></span>
                </div>
                <div class="flex-1">
                    <h4 class="text-lg font-bold mb-1">Export Data</h4>
                    <p class="text-sm text-gray-400 mb-4 leading-relaxed">
                        Download all your data (events, journal, settings) as a
                        JSON file for backup or transfer to another device.
                    </p>
                    <button
                        on:click={handleExportData}
                        class="btn btn-secondary"
                    >
                        <span class="mdi mdi-download mr-2"></span>
                        Export All Data
                    </button>
                </div>
            </div>

            <!-- Import Data -->
            <div
                class="glass-card p-6 flex items-start gap-6 hover:border-white/10 transition-colors"
            >
                <div
                    class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20"
                >
                    <span class="mdi mdi-upload text-3xl text-white"></span>
                </div>
                <div class="flex-1">
                    <h4 class="text-lg font-bold mb-1">Import Data</h4>
                    <p class="text-sm text-gray-400 mb-4 leading-relaxed">
                        Restore data from a previous export. This will replace
                        all current data with the backup file.
                    </p>
                    <label
                        class="btn btn-secondary cursor-pointer inline-flex items-center"
                    >
                        <span class="mdi mdi-upload mr-2"></span>
                        Import Data
                        <input
                            type="file"
                            accept=".json"
                            on:change={handleImportData}
                            class="sr-only"
                        />
                    </label>
                </div>
            </div>

            <!-- Clear All Data -->
            <div
                class="glass-card p-6 flex items-start gap-6 border-danger/20 hover:border-danger/40 transition-colors"
            >
                <div
                    class="w-14 h-14 rounded-2xl bg-gradient-to-br from-danger to-danger-dark flex items-center justify-center flex-shrink-0 shadow-lg shadow-danger/20"
                >
                    <span class="mdi mdi-delete-forever text-3xl text-white"
                    ></span>
                </div>
                <div class="flex-1">
                    <h4 class="text-lg font-bold mb-1 text-danger">
                        Clear All Data
                    </h4>
                    <p class="text-sm text-gray-400 mb-4 leading-relaxed">
                        Permanently delete all data from this browser. This
                        action cannot be undone.
                    </p>
                    <button
                        on:click={handleClearAllData}
                        class="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20"
                    >
                        <span class="mdi mdi-delete-forever mr-2"></span>
                        Clear All Data
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- About -->
    <div class="glass-panel rounded-3xl p-8">
        <h3
            class="text-2xl font-heading font-bold mb-6 flex items-center gap-3"
        >
            <div
                class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
            >
                <span class="mdi mdi-information text-white text-xl"></span>
            </div>
            About Daylume
        </h3>

        <div class="space-y-4 text-gray-300 leading-relaxed">
            <p>
                <strong class="text-white">Version:</strong> 1.0.0
            </p>
            <p>
                <strong class="text-white">Description:</strong> Daylume is a comprehensive
                daily planner PWA with AI assistance. Manage your calendar, set alarms,
                track your journal, and chat with AI - all in one place.
            </p>
            <div>
                <strong class="text-white block mb-2">Features:</strong>
                <ul class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <li class="flex items-center gap-2">
                        <span class="mdi mdi-check-circle text-primary text-sm"
                        ></span> Event Calendar with categories
                    </li>
                    <li class="flex items-center gap-2">
                        <span class="mdi mdi-check-circle text-primary text-sm"
                        ></span> Calculator with history
                    </li>
                    <li class="flex items-center gap-2">
                        <span class="mdi mdi-check-circle text-primary text-sm"
                        ></span> Alarms & Timers with notifications
                    </li>
                    <li class="flex items-center gap-2">
                        <span class="mdi mdi-check-circle text-primary text-sm"
                        ></span> Journal with mood tracking
                    </li>
                    <li class="flex items-center gap-2">
                        <span class="mdi mdi-check-circle text-primary text-sm"
                        ></span> AI Chat Assistant
                    </li>
                    <li class="flex items-center gap-2">
                        <span class="mdi mdi-check-circle text-primary text-sm"
                        ></span> Data Export/Import
                    </li>
                    <li class="flex items-center gap-2">
                        <span class="mdi mdi-check-circle text-primary text-sm"
                        ></span> Works Offline (PWA)
                    </li>
                </ul>
            </div>
            <p class="pt-4 border-t border-white/5 text-sm text-gray-400">
                <strong class="text-gray-300">Privacy:</strong> All data is stored
                locally in your browser. No data is sent to external servers except
                when using AI features with your configured API keys.
            </p>
        </div>
    </div>
    <!-- Footer -->
    <div class="text-center pt-8 pb-4 space-y-2">
        <p class="text-gray-400 font-medium tracking-wide">
            Daylume — Bring Your Day Into Focus
        </p>
        <p class="text-xs text-gray-600 uppercase tracking-widest">
            powered by TECHGURU
        </p>
    </div>
</div>
