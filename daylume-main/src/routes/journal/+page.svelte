<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import type { JournalEntry } from "$lib/types";
    import { supabase } from "$lib/supabase";
    import { showToast } from "$lib/toast";
    import Modal from "$lib/components/Modal.svelte";
    import { hapticFeedback } from "$lib/haptics";
    import { getJournalPrompts, type JournalPrompt } from "$lib/ai-context";
    import { JournalSkeleton, StatsSkeleton } from "$lib/components/skeletons";

    let entries: JournalEntry[] = [];
    let searchQuery = "";
    let selectedMood = "all";
    let showEntryModal = false;
    let editingEntry: JournalEntry | null = null;
    
    // Loading states
    let isLoading = true;
    
    // AI Journal Prompts
    let journalPrompts: JournalPrompt[] = [];
    let showPromptsPanel = false;

    let entryForm: {
        date: string;
        mood: JournalEntry["mood"];
        content: string;
        tags: string;
    } = {
        date: new Date().toISOString().split("T")[0],
        mood: "😊",
        content: "",
        tags: "",
    };

    const moods: Array<{ emoji: JournalEntry["mood"]; label: string }> = [
        { emoji: "😊", label: "Happy" },
        { emoji: "😐", label: "Neutral" },
        { emoji: "😢", label: "Sad" },
        { emoji: "😡", label: "Angry" },
        { emoji: "😴", label: "Tired" },
        { emoji: "🤗", label: "Grateful" },
        { emoji: "😰", label: "Anxious" },
    ];

    $: filteredEntries = entries.filter((entry) => {
        const matchesSearch =
            entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.tags.some((tag) =>
                tag.toLowerCase().includes(searchQuery.toLowerCase()),
            );
        const matchesMood =
            selectedMood === "all" || entry.mood === selectedMood;
        return matchesSearch && matchesMood;
    });

    onMount(async () => {
        await loadEntries();
        loadJournalPrompts();
        
        // Check for PWA shortcut action or AI prompt
        const action = $page.url.searchParams.get('action');
        const prompt = $page.url.searchParams.get('prompt');
        
        if (action === 'new') {
            openNewEntryModal();
        }
        
        if (prompt) {
            openNewEntryModal();
            entryForm.content = prompt;
        }
    });
    
    function loadJournalPrompts() {
        journalPrompts = getJournalPrompts();
    }

    async function loadEntries() {
        isLoading = true;
        const { data, error } = await supabase
            .from("journal_entries")
            .select("*")
            .order("date", { ascending: false });
        if (data) {
            entries = data.map((e) => ({
                id: e.id,
                date: e.date,
                content: e.content,
                mood: e.mood,
                tags: e.tags || [],
                createdAt: e.created_at,
                updatedAt: e.created_at,
            }));
        }
        isLoading = false;
    }

    async function handleRefresh() {
        hapticFeedback.tap();
        await loadEntries();
        loadJournalPrompts();
        showToast("success", "Journal refreshed");
    }

    function openNewEntryModal() {
        editingEntry = null;
        entryForm = {
            date: new Date().toISOString().split("T")[0],
            mood: "😊",
            content: "",
            tags: "",
        };
        showEntryModal = true;
    }
    
    function usePrompt(prompt: JournalPrompt) {
        entryForm.content = prompt.prompt + "\n\n";
        showPromptsPanel = false;
        hapticFeedback.tap();
        showToast('info', 'Prompt added - start writing!');
    }

    function openEditEntryModal(entry: JournalEntry) {
        editingEntry = entry;
        entryForm = {
            date: entry.date,
            mood: entry.mood || "😊",
            content: entry.content,
            tags: entry.tags.join(", "),
        };
        showEntryModal = true;
    }

    function getMoodLabel(emoji: string): string {
        return moods.find((m) => m.emoji === emoji)?.label || "Unknown";
    }

    async function saveEntry() {
        if (!entryForm.content.trim()) {
            showToast("error", "Please write something in your journal");
            return;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            showToast("error", "You must be logged in to save entries");
            return;
        }

        const tags = entryForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

        const entryData = {
            user_id: user.id,
            date: entryForm.date,
            mood: entryForm.mood,
            content: entryForm.content.trim(),
            tags,
        };

        try {
            if (editingEntry) {
                const { error } = await supabase
                    .from("journal_entries")
                    .update(entryData)
                    .eq("id", editingEntry.id);

                if (error) throw error;
                showToast("success", "Entry updated");
            } else {
                const { error } = await supabase
                    .from("journal_entries")
                    .insert(entryData);

                if (error) throw error;
                showToast("success", "Entry created");
            }

            await loadEntries();
            showEntryModal = false;
        } catch (error) {
            console.error("Error saving entry:", error);
            showToast("error", "Failed to save entry");
        }
    }

    async function handleDeleteEntry() {
        if (!editingEntry) return;

        if (confirm("Are you sure you want to delete this entry?")) {
            try {
                const { error } = await supabase
                    .from("journal_entries")
                    .delete()
                    .eq("id", editingEntry.id);

                if (error) throw error;

                showToast("success", "Entry deleted");
                await loadEntries();
                showEntryModal = false;
            } catch (error) {
                console.error("Error deleting entry:", error);
                showToast("error", "Failed to delete entry");
            }
        }
    }

    function getEntriesThisMonth(): number {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
        return entries.filter((e) => e.date.startsWith(thisMonth)).length;
    }

    function getStreakDays(): number {
        if (entries.length === 0) return 0;

        const sortedEntries = [...entries].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (const entry of sortedEntries) {
            const entryDate = new Date(entry.date);
            entryDate.setHours(0, 0, 0, 0);

            const diffDays = Math.floor(
                (currentDate.getTime() - entryDate.getTime()) /
                    (1000 * 60 * 60 * 24),
            );

            if (diffDays === streak) {
                streak++;
            } else if (diffDays > streak) {
                break;
            }
        }
        return streak;
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h2 class="text-3xl font-heading font-bold">Journal</h2>
        <button
            on:click={openNewEntryModal}
            class="btn btn-primary flex items-center gap-2"
        >
            <img src="/assets/glass_10_add.png" alt="Add" class="w-5 h-5" />
            New Entry
        </button>
    </div>

    <!-- Stats -->
    {#if isLoading}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {#each Array(3) as _}
                <div class="glass-card p-6 flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl bg-white/5 skeleton-animate"></div>
                    <div class="space-y-2">
                        <div class="h-8 w-12 bg-white/5 rounded skeleton-animate"></div>
                        <div class="h-3 w-20 bg-white/5 rounded skeleton-animate"></div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="glass-card p-6 flex items-center gap-4">
            <div
                class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20"
            >
                <span class="mdi mdi-book-open-variant text-3xl text-white"
                ></span>
            </div>
            <div>
                <div class="text-3xl font-heading font-bold">
                    {entries.length}
                </div>
                <div
                    class="text-sm text-gray-400 font-medium uppercase tracking-wider"
                >
                    Total Entries
                </div>
            </div>
        </div>

        <div class="glass-card p-6 flex items-center gap-4">
            <div
                class="w-14 h-14 rounded-2xl bg-gradient-to-br from-success to-info flex items-center justify-center shadow-lg shadow-success/20"
            >
                <span class="mdi mdi-calendar-month text-3xl text-white"></span>
            </div>
            <div>
                <div class="text-3xl font-heading font-bold">
                    {getEntriesThisMonth()}
                </div>
                <div
                    class="text-sm text-gray-400 font-medium uppercase tracking-wider"
                >
                    This Month
                </div>
            </div>
        </div>

        <div class="glass-card p-6 flex items-center gap-4">
            <div
                class="w-14 h-14 rounded-2xl bg-gradient-to-br from-warning to-danger flex items-center justify-center shadow-lg shadow-warning/20"
            >
                <span class="mdi mdi-fire text-3xl text-white"></span>
            </div>
            <div>
                <div class="text-3xl font-heading font-bold">
                    {getStreakDays()}
                </div>
                <div
                    class="text-sm text-gray-400 font-medium uppercase tracking-wider"
                >
                    Day Streak
                </div>
            </div>
        </div>
    </div>
    {/if}

    <!-- Filters -->
    <div class="glass-panel rounded-3xl p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="journal-search" class="block text-sm font-medium mb-2 text-gray-300"
                    >Search</label
                >
                <div class="relative">
                    <img src="/assets/glass_12_search.png" alt="Search" class="w-5 h-5 absolute left-4 top-3 opacity-60" />
                    <input
                        id="journal-search"
                        type="text"
                        bind:value={searchQuery}
                        placeholder="Search entries or tags..."
                        class="glass-input pl-12"
                    />
                </div>
            </div>
            <div>
                <label for="journal-mood-filter" class="block text-sm font-medium mb-2 text-gray-300"
                    >Filter by Mood</label
                >
                <div class="relative">
                    <select
                        id="journal-mood-filter"
                        bind:value={selectedMood}
                        class="glass-input appearance-none"
                    >
                        <option value="all" class="bg-[#020617]"
                            >All Moods</option
                        >
                        {#each moods as mood}
                            <option value={mood.emoji} class="bg-[#020617]"
                                >{mood.emoji} {mood.label}</option
                            >
                        {/each}
                    </select>
                    <span
                        class="mdi mdi-chevron-down absolute right-4 top-3.5 text-gray-400 pointer-events-none"
                    ></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Entries -->
    <div class="space-y-4">
        {#if isLoading}
            <JournalSkeleton count={3} />
        {:else}
        {#each filteredEntries as entry (entry.id)}
            <button
                on:click={() => openEditEntryModal(entry)}
                class="w-full text-left glass-card p-6 hover:border-primary/30 transition-all group"
            >
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            {#if entry.mood}
                                <span
                                    class="text-3xl filter drop-shadow-md hover:scale-110 transition-transform"
                                    >{entry.mood}</span
                                >
                                <span
                                    class="text-sm font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-full"
                                    >{getMoodLabel(entry.mood)}</span
                                >
                            {/if}
                        </div>
                        <div
                            class="text-sm text-gray-400 font-medium flex items-center gap-2 mt-2"
                        >
                            <span class="mdi mdi-calendar-blank"></span>
                            {new Date(entry.date).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </div>
                    </div>
                    <div
                        class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors"
                    >
                        <span
                            class="mdi mdi-chevron-right text-gray-400 group-hover:text-white"
                        ></span>
                    </div>
                </div>

                <p
                    class="text-gray-200 line-clamp-3 mb-4 leading-relaxed text-lg font-light"
                >
                    {entry.content}
                </p>

                {#if entry.tags.length > 0}
                    <div
                        class="flex flex-wrap gap-2 pt-4 border-t border-white/5"
                    >
                        {#each entry.tags as tag}
                            <span
                                class="px-3 py-1 text-xs font-medium bg-primary/10 text-primary-300 border border-primary/20 rounded-full"
                            >
                                #{tag}
                            </span>
                        {/each}
                    </div>
                {/if}
            </button>
        {:else}
            <div
                class="glass-panel rounded-3xl text-center py-16 border-dashed border-2 border-white/10"
            >
                <div
                    class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4"
                >
                    <span
                        class="mdi mdi-book-open-page-variant-outline text-4xl text-gray-500"
                    ></span>
                </div>
                <p class="text-gray-400 text-lg mb-4">
                    {searchQuery || selectedMood !== "all"
                        ? "No entries match your filters"
                        : "Start writing your first journal entry"}
                </p>
                {#if !searchQuery && selectedMood === "all"}
                    <button
                        on:click={openNewEntryModal}
                        class="text-primary hover:text-primary-400 font-medium"
                    >
                    Create Entry
                </button>
            {/if}
            </div>
        {/each}
        {/if}
    </div>
</div><!-- Entry Modal -->
<Modal
    bind:show={showEntryModal}
    title={editingEntry ? "Edit Entry" : "New Entry"}
    maxWidth="max-w-3xl"
>
    <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="entry-date" class="block text-sm font-medium mb-2 text-gray-300"
                    >Date</label
                >
                <input
                    id="entry-date"
                    type="date"
                    bind:value={entryForm.date}
                    class="glass-input"
                />
            </div>
            <fieldset>
                <legend class="block text-sm font-medium mb-2 text-gray-300"
                    >How are you feeling?</legend
                >
                <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {#each moods as mood}
                        <button
                            type="button"
                            on:click={() =>
                                (entryForm.mood =
                                    entryForm.mood === mood.emoji
                                        ? undefined
                                        : mood.emoji)}
                            class="p-3 rounded-xl transition-all flex-shrink-0 {entryForm.mood ===
                            mood.emoji
                                ? 'bg-primary/20 ring-2 ring-primary scale-110 shadow-lg shadow-primary/20'
                                : 'bg-white/5 hover:bg-white/10 border border-white/5'}"
                            title={mood.label}
                        >
                            <span class="text-2xl block">{mood.emoji}</span>
                        </button>
                    {/each}
                </div>
            </fieldset>
        </div>

        <div>
            <div class="flex items-center justify-between mb-2">
                <label for="entry-content" class="block text-sm font-medium text-gray-300"
                    >Your Thoughts</label
                >
                <button
                    type="button"
                    on:click={() => showPromptsPanel = !showPromptsPanel}
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                        {showPromptsPanel 
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'}"
                >
                    <span class="mdi mdi-lightbulb-on-outline"></span>
                    AI Prompts
                </button>
            </div>
            
            <!-- AI Prompts Panel -->
            {#if showPromptsPanel && journalPrompts.length > 0}
                <div class="mb-3 p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
                    <p class="text-xs text-gray-400 mb-2">✨ Context-aware prompts based on your data:</p>
                    <div class="flex flex-wrap gap-2">
                        {#each journalPrompts.slice(0, 4) as prompt}
                            <button
                                type="button"
                                on:click={() => usePrompt(prompt)}
                                class="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 hover:text-white transition-all text-left"
                            >
                                {prompt.prompt.length > 50 ? prompt.prompt.slice(0, 50) + '...' : prompt.prompt}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
            
            <textarea
                id="entry-content"
                bind:value={entryForm.content}
                placeholder="What's on your mind today?"
                rows="12"
                class="glass-input resize-none text-lg font-light leading-relaxed"
            ></textarea>
        </div>

        <div>
            <label for="entry-tags" class="block text-sm font-medium mb-2 text-gray-300"
                >Tags (comma-separated)</label
            >
            <div class="relative">
                <span
                    class="mdi mdi-tag-outline absolute left-4 top-3.5 text-gray-400"
                ></span>
                <input
                    id="entry-tags"
                    type="text"
                    bind:value={entryForm.tags}
                    placeholder="personal, work, gratitude, goals..."
                    class="glass-input pl-12"
                />
            </div>
        </div>
    </div>

    <div slot="footer">
        {#if editingEntry}
            <button
                on:click={handleDeleteEntry}
                class="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20"
            >
                Delete
            </button>
        {/if}
        <button
            on:click={() => (showEntryModal = false)}
            class="btn btn-secondary"
        >
            Cancel
        </button>
        <button on:click={saveEntry} class="btn btn-primary">
            {editingEntry ? "Update Entry" : "Save Entry"}
        </button>
    </div>
</Modal>

<style>
    .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .skeleton-animate {
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03) 0%,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(255, 255, 255, 0.03) 100%
        );
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.5s ease-in-out infinite;
    }
    
    @keyframes skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
</style>
