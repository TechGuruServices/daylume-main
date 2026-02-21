<script lang="ts">
    import { syncStore, isOnline, processOfflineQueue } from '$lib/sync-conflict';
    import type { SyncState, SyncConflict } from '$lib/types';
    import { onMount, onDestroy } from 'svelte';
    
    let online = true;
    let syncState: SyncState = {
        status: 'idle',
        lastSyncedAt: null,
        pendingChanges: 0,
        conflicts: [],
        isOnline: true
    };
    let showDetails = false;
    
    // Subscribe to sync store
    const unsubSync = syncStore.subscribe((state: SyncState) => {
        syncState = state;
    });
    
    onMount(() => {
        online = isOnline();
        
        // Listen for online/offline events
        const handleOnline = () => { online = true; };
        const handleOffline = () => { online = false; };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    });
    
    onDestroy(() => {
        unsubSync();
    });
    
    function getStatusIcon(status: string, isOnlineNow: boolean): string {
        if (!isOnlineNow) return '📡';
        switch (status) {
            case 'synced': return '✓';
            case 'syncing': return '↻';
            case 'idle': return '○';
            case 'offline': return '📡';
            case 'conflict': return '⚠️';
            case 'error': return '✗';
            default: return '?';
        }
    }
    
    function getStatusColor(status: string, isOnlineNow: boolean): string {
        if (!isOnlineNow) return 'text-yellow-500';
        switch (status) {
            case 'synced': return 'text-green-500';
            case 'syncing': return 'text-blue-500';
            case 'idle': return 'text-gray-400';
            case 'offline': return 'text-yellow-500';
            case 'conflict': return 'text-orange-500';
            case 'error': return 'text-red-500';
            default: return 'text-gray-500';
        }
    }
    
    function getStatusText(status: string, isOnlineNow: boolean, pending: number, conflictCount: number): string {
        if (!isOnlineNow) return 'Offline';
        switch (status) {
            case 'synced': return 'Synced';
            case 'syncing': return 'Syncing...';
            case 'idle': return pending > 0 ? `${pending} pending` : 'Ready';
            case 'conflict': return `${conflictCount} conflicts`;
            case 'error': return 'Sync error';
            default: return 'Unknown';
        }
    }
    
    function getBgClass(status: string, isOnlineNow: boolean): string {
        if (!isOnlineNow) return 'bg-yellow-500/20';
        switch (status) {
            case 'synced': return 'bg-green-500/20';
            case 'syncing': return 'bg-blue-500/20';
            case 'idle': return 'bg-gray-500/20';
            case 'conflict': return 'bg-orange-500/20';
            case 'error': return 'bg-red-500/20';
            default: return 'bg-gray-500/20';
        }
    }
    
    $: pendingCount = syncState.pendingChanges;
    $: conflictCount = syncState.conflicts.filter((c: SyncConflict) => !c.resolved).length;
    $: effectiveStatus = !online ? 'offline' : (conflictCount > 0 ? 'conflict' : (pendingCount > 0 && syncState.status === 'idle' ? 'idle' : syncState.status));
</script>

<!-- Compact sync status indicator -->
<button
    class="sync-status flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 {getBgClass(effectiveStatus, online)}"
    on:click={() => showDetails = !showDetails}
    title={getStatusText(effectiveStatus, online, pendingCount, conflictCount)}
>
    <span 
        class="status-icon {getStatusColor(effectiveStatus, online)}"
        class:animate-spin-slow={syncState.status === 'syncing'}
    >
        {getStatusIcon(effectiveStatus, online)}
    </span>
    
    {#if pendingCount > 0 || conflictCount > 0 || !online}
        <span class="text-white/70">
            {#if !online}
                Offline
            {:else if conflictCount > 0}
                {conflictCount}⚠️
            {:else if pendingCount > 0}
                {pendingCount}
            {/if}
        </span>
    {/if}
</button>

<!-- Details popover -->
{#if showDetails}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="fixed inset-0 z-40" on:click={() => showDetails = false}></div>
    <div class="absolute top-12 right-4 z-50 w-72 glass-panel rounded-xl shadow-2xl p-4">
        <h3 class="text-white font-semibold mb-3">Sync Status</h3>
        
        <!-- Connection status -->
        <div class="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
            <span class="w-2 h-2 rounded-full" class:bg-green-500={online} class:bg-yellow-500={!online}></span>
            <span class="text-white/80 text-sm">{online ? 'Connected' : 'Offline'}</span>
        </div>
        
        <!-- Sync details -->
        <div class="space-y-2 text-sm">
            <div class="flex justify-between">
                <span class="text-white/60">Status</span>
                <span class="{getStatusColor(effectiveStatus, online)}">{getStatusText(effectiveStatus, online, pendingCount, conflictCount)}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-white/60">Pending changes</span>
                <span class="text-white">{pendingCount}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-white/60">Conflicts</span>
                <span class:text-orange-500={conflictCount > 0} class:text-white={conflictCount === 0}>{conflictCount}</span>
            </div>
            
            {#if syncState.lastSyncedAt}
                <div class="flex justify-between">
                    <span class="text-white/60">Last synced</span>
                    <span class="text-white/80">{new Date(syncState.lastSyncedAt).toLocaleTimeString()}</span>
                </div>
            {/if}
        </div>
        
        {#if conflictCount > 0}
            <button
                class="mt-4 w-full py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-500/30 transition-colors"
                on:click={() => {
                    showDetails = false;
                    window.dispatchEvent(new CustomEvent('open-conflict-resolver'));
                }}
            >
                Resolve Conflicts
            </button>
        {/if}
        
        {#if pendingCount > 0 && online}
            <button
                class="mt-2 w-full py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
                on:click={async () => {
                    await processOfflineQueue();
                }}
            >
                Sync Now
            </button>
        {/if}
    </div>
{/if}

<style>
    .sync-status {
        backdrop-filter: blur(8px);
    }
    
    @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .animate-spin-slow {
        animation: spin-slow 1s linear infinite;
    }
</style>
