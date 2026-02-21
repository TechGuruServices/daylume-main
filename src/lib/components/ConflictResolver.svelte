<script lang="ts">
    import { syncStore, resolveConflict } from '$lib/sync-conflict';
    import type { SyncConflict, SyncState } from '$lib/types';
    import { onMount, onDestroy } from 'svelte';
    import { showToast } from '$lib/toast';
    
    let isOpen = false;
    let pendingConflicts: SyncConflict[] = [];
    let currentConflict: SyncConflict | null = null;
    let currentIndex = 0;
    
    const unsubSync = syncStore.subscribe((state: SyncState) => {
        pendingConflicts = state.conflicts.filter(c => !c.resolved);
        if (pendingConflicts.length > 0 && !currentConflict) {
            currentConflict = pendingConflicts[0];
            currentIndex = 0;
        }
        if (pendingConflicts.length === 0) {
            currentConflict = null;
            isOpen = false;
        }
    });
    
    onMount(() => {
        // Listen for open event
        const handleOpen = () => {
            if (pendingConflicts.length > 0) {
                isOpen = true;
                currentConflict = pendingConflicts[0];
                currentIndex = 0;
            }
        };
        
        window.addEventListener('open-conflict-resolver', handleOpen);
        
        return () => {
            window.removeEventListener('open-conflict-resolver', handleOpen);
        };
    });
    
    onDestroy(() => {
        unsubSync();
    });
    
    function close() {
        isOpen = false;
    }
    
    async function handleResolve(strategy: 'local' | 'remote') {
        if (!currentConflict) return;
        
        await resolveConflict(currentConflict as any, strategy);
        showToast('success', strategy === 'local' ? 'Kept local version' : 'Kept cloud version');
        
        // Move to next conflict
        if (currentIndex < pendingConflicts.length - 1) {
            currentIndex++;
            currentConflict = pendingConflicts[currentIndex];
        } else {
            currentConflict = null;
        }
    }
    
    async function resolveAll(strategy: 'local' | 'remote') {
        for (const conflict of pendingConflicts) {
            await resolveConflict(conflict as any, strategy);
        }
        showToast('success', strategy === 'local' ? 'All kept local' : 'All kept cloud');
        isOpen = false;
    }
    
    function getEntityIcon(type: string): string {
        switch (type) {
            case 'alarm': return '⏰';
            case 'event': return '📅';
            case 'task': return '✓';
            case 'habit': return '🔄';
            case 'journal': return '📝';
            case 'goal': return '🎯';
            default: return '📄';
        }
    }
    
    function formatTimestamp(iso: string): string {
        return new Date(iso).toLocaleString();
    }
    
    function getDataPreview(data: unknown): string {
        if (!data) return 'No data';
        const d = data as Record<string, unknown>;
        if (d.title) return String(d.title);
        if (d.name) return String(d.name);
        if (d.content) return String(d.content).substring(0, 50) + '...';
        if (d.label) return String(d.label);
        return JSON.stringify(data).substring(0, 50) + '...';
    }
</script>

{#if isOpen && currentConflict}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        on:click={close}
    ></div>
    
    <!-- Modal -->
    <div class="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50 glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="p-4 border-b border-white/10 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <span class="text-2xl text-orange-500">⚠️</span>
                <div>
                    <h2 class="text-white font-semibold">Sync Conflict</h2>
                    <p class="text-white/60 text-sm">{currentIndex + 1} of {pendingConflicts.length} conflicts</p>
                </div>
            </div>
            <button
                class="p-2 text-white/60 hover:text-white transition-colors"
                on:click={close}
            >
                ✕
            </button>
        </div>
        
        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- Conflict info -->
            <div class="flex items-center gap-2 text-white/80">
                <span class="text-xl">{getEntityIcon(currentConflict.entityType)}</span>
                <span class="capitalize">{currentConflict.entityType}</span>
            </div>
            
            <!-- Comparison -->
            <div class="grid grid-cols-2 gap-4">
                <!-- Local version -->
                <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-blue-400 text-sm font-medium">📱 Local</span>
                    </div>
                    <p class="text-white text-sm mb-2">{getDataPreview(currentConflict.localData)}</p>
                    <p class="text-white/40 text-xs">
                        Modified: {formatTimestamp(currentConflict.localUpdatedAt)}
                    </p>
                </div>
                
                <!-- Remote version -->
                <div class="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-purple-400 text-sm font-medium">☁️ Cloud</span>
                    </div>
                    <p class="text-white text-sm mb-2">{getDataPreview(currentConflict.remoteData)}</p>
                    <p class="text-white/40 text-xs">
                        Modified: {formatTimestamp(currentConflict.remoteUpdatedAt)}
                    </p>
                </div>
            </div>
            
            <!-- Detected time -->
            <p class="text-white/40 text-xs text-center">
                Conflict detected: {formatTimestamp(currentConflict.detectedAt)}
            </p>
        </div>
        
        <!-- Actions -->
        <div class="p-4 border-t border-white/10 space-y-3">
            <!-- Single conflict actions -->
            <div class="grid grid-cols-2 gap-3">
                <button
                    class="py-3 bg-blue-500/20 text-blue-400 rounded-xl font-medium hover:bg-blue-500/30 transition-colors"
                    on:click={() => handleResolve('local')}
                >
                    Keep Local
                </button>
                <button
                    class="py-3 bg-purple-500/20 text-purple-400 rounded-xl font-medium hover:bg-purple-500/30 transition-colors"
                    on:click={() => handleResolve('remote')}
                >
                    Keep Cloud
                </button>
            </div>
            
            <!-- Resolve all -->
            {#if pendingConflicts.length > 1}
                <div class="pt-2 border-t border-white/10 grid grid-cols-2 gap-3">
                    <button
                        class="py-2 bg-white/5 text-white/60 rounded-lg text-sm hover:bg-white/10 transition-colors"
                        on:click={() => resolveAll('local')}
                    >
                        Keep All Local
                    </button>
                    <button
                        class="py-2 bg-white/5 text-white/60 rounded-lg text-sm hover:bg-white/10 transition-colors"
                        on:click={() => resolveAll('remote')}
                    >
                        Keep All Cloud
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}
