/**
 * Sync Conflict Resolution System for Daylume
 * Handles offline changes, conflict detection, and resolution
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from './supabase';
import type { 
    SyncState, 
    SyncStatus, 
    SyncConflict, 
    PendingChange, 
    SyncEntityType,
    Task,
    Habit,
    Goal,
    CalendarEvent,
    JournalEntry,
    Alarm
} from './types';

// ===========================================
// CONSTANTS
// ===========================================

const STORAGE_KEYS = {
    SYNC_STATE: 'daylume_sync_state',
    PENDING_CHANGES: 'daylume_pending_changes',
    SYNC_CONFLICTS: 'daylume_sync_conflicts',
    LAST_SYNC: 'daylume_last_sync'
};

const MAX_RETRIES = 3;
const SYNC_DEBOUNCE_MS = 2000;

// ===========================================
// SYNC STATE STORE
// ===========================================

function createSyncStore() {
    const defaultState: SyncState = {
        status: 'idle',
        lastSyncedAt: null,
        pendingChanges: 0,
        conflicts: [],
        isOnline: browser ? navigator.onLine : true,
        error: undefined
    };

    // Load initial state from localStorage
    function loadState(): SyncState {
        if (!browser) return defaultState;
        
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.SYNC_STATE);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...defaultState, ...parsed, isOnline: navigator.onLine };
            }
        } catch (e) {
            console.error('Failed to load sync state:', e);
        }
        return defaultState;
    }

    const { subscribe, set, update } = writable<SyncState>(loadState());

    // Persist state changes
    if (browser) {
        subscribe(state => {
            try {
                localStorage.setItem(STORAGE_KEYS.SYNC_STATE, JSON.stringify({
                    lastSyncedAt: state.lastSyncedAt,
                    pendingChanges: state.pendingChanges,
                    conflicts: state.conflicts
                }));
            } catch (e) {
                console.error('Failed to save sync state:', e);
            }
        });

        // Listen for online/offline events
        window.addEventListener('online', () => {
            update(s => ({ ...s, isOnline: true, status: s.pendingChanges > 0 ? 'syncing' : 'idle' }));
            // Trigger sync when coming back online
            processPendingChanges();
        });

        window.addEventListener('offline', () => {
            update(s => ({ ...s, isOnline: false, status: 'offline' }));
        });
    }

    return {
        subscribe,
        set,
        update,

        setStatus(status: SyncStatus) {
            update(s => ({ ...s, status }));
        },

        setError(error: string | undefined) {
            update(s => ({ ...s, error, status: error ? 'error' : s.status }));
        },

        addConflict(conflict: SyncConflict) {
            update(s => ({
                ...s,
                conflicts: [...s.conflicts, conflict],
                status: 'conflict'
            }));
        },

        removeConflict(conflictId: string) {
            update(s => ({
                ...s,
                conflicts: s.conflicts.filter(c => c.id !== conflictId),
                status: s.conflicts.length <= 1 ? 'synced' : 'conflict'
            }));
        },

        clearConflicts() {
            update(s => ({ ...s, conflicts: [], status: 'synced' }));
        },

        incrementPending() {
            update(s => ({ ...s, pendingChanges: s.pendingChanges + 1 }));
        },

        decrementPending() {
            update(s => ({ ...s, pendingChanges: Math.max(0, s.pendingChanges - 1) }));
        },

        markSynced() {
            update(s => ({
                ...s,
                status: 'synced',
                lastSyncedAt: new Date().toISOString(),
                pendingChanges: 0
            }));
        }
    };
}

export const syncStore = createSyncStore();

// ===========================================
// CONVENIENCE EXPORTS / ALIASES
// ===========================================

// Derived stores for easy access
export const syncStatus = {
    subscribe: syncStore.subscribe,
    set: (status: SyncStatus) => syncStore.setStatus(status)
};

export const pendingChanges = {
    subscribe: (fn: (value: PendingChange[]) => void) => {
        return syncStore.subscribe(state => fn(getPendingChanges()));
    }
};

export const conflicts = {
    subscribe: (fn: (value: SyncConflict[]) => void) => {
        return syncStore.subscribe(state => fn(state.conflicts));
    }
};

// Convenience function to check online status
export function isOnline(): boolean {
    if (!browser) return true;
    return navigator.onLine;
}

// Alias for queueChange
export function queueOfflineChange(
    action: 'upsert' | 'delete',
    entityType: SyncEntityType,
    entityId: string,
    data: unknown
) {
    const mappedAction = action === 'upsert' ? 'update' : 'delete';
    queueChange(entityType, entityId, mappedAction, data);
}

// Get sync settings (placeholder for future settings)
export function getSyncSettings(): { showConflictUI: boolean; autoResolve: boolean } {
    return {
        showConflictUI: true,
        autoResolve: false
    };
}

// Alias for processPendingChanges
export const processOfflineQueue = processPendingChanges;

// ===========================================
// PENDING CHANGES QUEUE
// ===========================================

function getPendingChanges(): PendingChange[] {
    if (!browser) return [];
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.PENDING_CHANGES);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

function savePendingChanges(changes: PendingChange[]) {
    if (!browser) return;
    try {
        localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(changes));
        syncStore.update(s => ({ ...s, pendingChanges: changes.length }));
    } catch (e) {
        console.error('Failed to save pending changes:', e);
    }
}

export function queueChange(
    entityType: SyncEntityType,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    data: unknown
) {
    const changes = getPendingChanges();
    
    // Check if there's already a pending change for this entity
    const existingIndex = changes.findIndex(
        c => c.entityType === entityType && c.entityId === entityId
    );

    const newChange: PendingChange = {
        id: `${entityType}-${entityId}-${Date.now()}`,
        entityType,
        entityId,
        action,
        data,
        createdAt: new Date().toISOString(),
        retries: 0
    };

    if (existingIndex >= 0) {
        // Merge with existing change
        const existing = changes[existingIndex];
        if (action === 'delete') {
            // If deleting, remove create or just update to delete
            if (existing.action === 'create') {
                changes.splice(existingIndex, 1);
            } else {
                changes[existingIndex] = newChange;
            }
        } else {
            // Update the existing change with new data
            changes[existingIndex] = { ...newChange, action: existing.action === 'create' ? 'create' : 'update' };
        }
    } else {
        changes.push(newChange);
    }

    savePendingChanges(changes);
    
    // Debounced sync attempt
    if (browser && navigator.onLine) {
        debouncedSync();
    }
}

// ===========================================
// CONFLICT DETECTION
// ===========================================

type SyncableEntity = Task | Habit | Goal | CalendarEvent | JournalEntry | Alarm;

function getEntityUpdatedAt(entity: SyncableEntity): string {
    return (entity as any).updatedAt || (entity as any).createdAt || '';
}

function createChecksum(data: unknown): string {
    // Simple checksum based on JSON stringification
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

export function detectConflict<T extends SyncableEntity>(
    entityType: SyncEntityType,
    localData: T,
    remoteData: T
): SyncConflict<T> | null {
    const localUpdated = getEntityUpdatedAt(localData);
    const remoteUpdated = getEntityUpdatedAt(remoteData);
    
    // No conflict if same data
    if (createChecksum(localData) === createChecksum(remoteData)) {
        return null;
    }

    // No conflict if local is newer and remote hasn't changed
    if (localUpdated > remoteUpdated) {
        return null;
    }

    // No conflict if remote is newer and local hasn't been modified
    const pendingChanges = getPendingChanges();
    const hasPendingChange = pendingChanges.some(
        c => c.entityType === entityType && c.entityId === (localData as any).id
    );
    
    if (!hasPendingChange && remoteUpdated > localUpdated) {
        return null;
    }

    // Conflict detected: both have changes
    return {
        id: `conflict-${entityType}-${(localData as any).id}-${Date.now()}`,
        entityType,
        entityId: (localData as any).id,
        localData,
        remoteData,
        localUpdatedAt: localUpdated,
        remoteUpdatedAt: remoteUpdated,
        detectedAt: new Date().toISOString(),
        resolved: false
    };
}

// ===========================================
// CONFLICT RESOLUTION
// ===========================================

export type ResolutionStrategy = 'local' | 'remote' | 'merge' | 'newest';

export async function resolveConflict<T extends SyncableEntity>(
    conflict: SyncConflict<T>,
    strategy: ResolutionStrategy,
    mergedData?: T
): Promise<T> {
    let resolvedData: T;

    switch (strategy) {
        case 'local':
            resolvedData = conflict.localData;
            break;
        case 'remote':
            resolvedData = conflict.remoteData;
            break;
        case 'newest':
            resolvedData = conflict.localUpdatedAt > conflict.remoteUpdatedAt
                ? conflict.localData
                : conflict.remoteData;
            break;
        case 'merge':
            if (!mergedData) {
                throw new Error('Merged data required for merge strategy');
            }
            resolvedData = mergedData;
            break;
        default:
            resolvedData = conflict.remoteData;
    }

    // Determine the actual resolution type for the 'newest' strategy
    let resolution: 'local' | 'remote' | 'merged';
    if (strategy === 'merge') {
        resolution = 'merged';
    } else if (strategy === 'newest') {
        resolution = conflict.localUpdatedAt > conflict.remoteUpdatedAt ? 'local' : 'remote';
    } else {
        resolution = strategy;
    }

    // Update the conflict as resolved
    syncStore.update(s => ({
        ...s,
        conflicts: s.conflicts.map(c => 
            c.id === conflict.id 
                ? { ...c, resolved: true, resolution }
                : c
        )
    }));

    // Apply resolved data
    await applyResolvedData(conflict.entityType, resolvedData);
    
    // Remove from conflicts list
    syncStore.removeConflict(conflict.id);

    return resolvedData;
}

async function applyResolvedData(entityType: SyncEntityType, data: unknown) {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;

    const userId = session.session.user.id;
    const tableName = getTableName(entityType);
    const transformedData = transformForSupabase(entityType, data, userId);

    // Update both local and remote
    const localKey = getLocalStorageKey(entityType);
    const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');
    const index = localItems.findIndex((item: any) => item.id === (data as any).id);
    
    if (index >= 0) {
        localItems[index] = data;
    } else {
        localItems.push(data);
    }
    localStorage.setItem(localKey, JSON.stringify(localItems));

    // Update Supabase
    await supabase
        .from(tableName)
        .upsert(transformedData, { onConflict: 'id' });
}

// ===========================================
// SYNC PROCESSING
// ===========================================

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSync() {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(() => {
        processPendingChanges();
    }, SYNC_DEBOUNCE_MS);
}

export async function processPendingChanges(): Promise<void> {
    if (!browser || !navigator.onLine) {
        syncStore.setStatus('offline');
        return;
    }

    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
        return; // Not logged in, changes stay local
    }

    const userId = session.session.user.id;
    const changes = getPendingChanges();

    if (changes.length === 0) {
        syncStore.markSynced();
        return;
    }

    syncStore.setStatus('syncing');

    const failedChanges: PendingChange[] = [];
    const state = get(syncStore);

    for (const change of changes) {
        try {
            await processChange(change, userId);
        } catch (error) {
            console.error(`Failed to sync ${change.entityType}:${change.entityId}:`, error);
            
            if (change.retries < MAX_RETRIES) {
                failedChanges.push({ ...change, retries: change.retries + 1 });
            } else {
                // Max retries reached, create an error state
                syncStore.setError(`Failed to sync ${change.entityType} after ${MAX_RETRIES} attempts`);
            }
        }
    }

    savePendingChanges(failedChanges);

    if (failedChanges.length === 0 && state.conflicts.length === 0) {
        syncStore.markSynced();
    } else if (state.conflicts.length > 0) {
        syncStore.setStatus('conflict');
    } else {
        syncStore.setStatus('error');
    }
}

async function processChange(change: PendingChange, userId: string): Promise<void> {
    const tableName = getTableName(change.entityType);
    
    switch (change.action) {
        case 'create':
        case 'update': {
            // Check for conflicts first
            const { data: remote } = await supabase
                .from(tableName)
                .select('*')
                .eq('id', change.entityId)
                .single();

            if (remote && change.action === 'update') {
                const conflict = detectConflict(
                    change.entityType,
                    change.data as SyncableEntity,
                    transformFromSupabase(change.entityType, remote) as SyncableEntity
                );

                if (conflict) {
                    syncStore.addConflict(conflict);
                    return; // Don't process, wait for resolution
                }
            }

            const transformedData = transformForSupabase(change.entityType, change.data, userId);
            await supabase.from(tableName).upsert(transformedData, { onConflict: 'id' });
            break;
        }
        case 'delete': {
            await supabase.from(tableName).delete().eq('id', change.entityId);
            break;
        }
    }
}

// ===========================================
// HELPERS
// ===========================================

function getTableName(entityType: SyncEntityType): string {
    const tables: Record<SyncEntityType, string> = {
        task: 'tasks',
        habit: 'habits',
        goal: 'goals',
        event: 'events',
        journal: 'journal_entries',
        alarm: 'alarms'
    };
    return tables[entityType];
}

function getLocalStorageKey(entityType: SyncEntityType): string {
    const keys: Record<SyncEntityType, string> = {
        task: 'daylume_tasks',
        habit: 'daylume_habits',
        goal: 'daylume_goals',
        event: 'daylume_events',
        journal: 'daylume_journal',
        alarm: 'daylume_alarms'
    };
    return keys[entityType];
}

function transformForSupabase(entityType: SyncEntityType, data: unknown, userId: string): Record<string, unknown> {
    const entity = data as Record<string, unknown>;
    const base = { ...entity, user_id: userId };
    
    // Transform camelCase to snake_case for specific fields
    switch (entityType) {
        case 'task':
            return {
                ...base,
                due_date: entity.dueDate,
                due_time: entity.dueTime,
                completed_at: entity.completedAt,
                created_at: entity.createdAt,
                updated_at: new Date().toISOString()
            };
        case 'event':
            return {
                ...base,
                end_time: entity.endTime,
                type: entity.category,
                created_at: entity.createdAt
            };
        case 'habit':
            return {
                ...base,
                name: entity.title,
                target_count: entity.targetCount,
                created_at: entity.createdAt,
                updated_at: new Date().toISOString()
            };
        case 'goal':
            return {
                ...base,
                target_date: entity.targetDate,
                created_at: entity.createdAt,
                updated_at: new Date().toISOString()
            };
        case 'journal':
            return {
                ...base,
                created_at: entity.createdAt,
                updated_at: new Date().toISOString()
            };
        case 'alarm':
            return {
                ...base,
                days: entity.customDays,
                created_at: entity.createdAt
            };
        default:
            return base;
    }
}

function transformFromSupabase(entityType: SyncEntityType, data: Record<string, unknown>): unknown {
    switch (entityType) {
        case 'task':
            return {
                id: data.id,
                title: data.title,
                description: data.description,
                status: data.status,
                priority: data.priority,
                dueDate: data.due_date,
                dueTime: data.due_time,
                category: data.category,
                completedAt: data.completed_at,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        case 'event':
            return {
                id: data.id,
                title: data.title,
                date: data.date,
                time: data.time,
                endTime: data.end_time,
                category: data.type,
                description: data.description,
                recurring: data.recurring,
                createdAt: data.created_at,
                updatedAt: data.created_at
            };
        case 'habit':
            return {
                id: data.id,
                title: data.name || data.title,
                description: data.description,
                icon: data.icon,
                color: data.color,
                frequency: data.frequency,
                targetCount: data.target_count,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        case 'goal':
            return {
                id: data.id,
                title: data.title,
                description: data.description,
                category: data.category,
                targetDate: data.target_date,
                progress: data.progress,
                status: data.status,
                milestones: data.milestones,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        case 'journal':
            return {
                id: data.id,
                date: data.date,
                content: data.content,
                mood: data.mood,
                tags: data.tags,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        case 'alarm':
            return {
                id: data.id,
                time: data.time,
                label: data.label,
                enabled: data.enabled,
                repeat: data.repeat,
                customDays: data.days,
                createdAt: data.created_at
            };
        default:
            return data;
    }
}

// ===========================================
// AUTO-MERGE UTILITIES
// ===========================================

/**
 * Attempt to auto-merge two versions of an entity
 * Returns merged data or null if manual merge is required
 */
export function attemptAutoMerge<T extends Record<string, unknown>>(
    local: T,
    remote: T,
    baseTimestamp?: string
): T | null {
    const merged = { ...remote } as T;
    let hasConflictingFields = false;

    const localUpdated = getEntityUpdatedAt(local as unknown as SyncableEntity);
    const remoteUpdated = getEntityUpdatedAt(remote as unknown as SyncableEntity);

    for (const key of Object.keys(local)) {
        if (key === 'id' || key === 'createdAt' || key === 'user_id') continue;

        const localVal = local[key];
        const remoteVal = remote[key];

        // If values are the same, no conflict
        if (JSON.stringify(localVal) === JSON.stringify(remoteVal)) {
            continue;
        }

        // If only one side changed, use that value
        if (localVal !== undefined && remoteVal === undefined) {
            (merged as Record<string, unknown>)[key] = localVal;
        } else if (localVal === undefined && remoteVal !== undefined) {
            (merged as Record<string, unknown>)[key] = remoteVal;
        } else {
            // Both changed - use newer timestamp
            if (localUpdated > remoteUpdated) {
                (merged as Record<string, unknown>)[key] = localVal;
            } else {
                (merged as Record<string, unknown>)[key] = remoteVal;
            }
            hasConflictingFields = true;
        }
    }

    // Update timestamp
    (merged as Record<string, unknown>).updatedAt = new Date().toISOString();

    // For simple conflicts, auto-merge works
    // For complex conflicts (both significantly changed), return null
    const significantFields = ['title', 'content', 'description', 'status'];
    const significantConflicts = significantFields.filter(f => 
        JSON.stringify(local[f]) !== JSON.stringify(remote[f]) &&
        local[f] !== undefined && remote[f] !== undefined
    );

    if (significantConflicts.length > 1) {
        return null; // Requires manual merge
    }

    return merged;
}

// ===========================================
// INITIALIZATION
// ===========================================

export function initSyncSystem() {
    if (!browser) return;

    // Check initial online status
    syncStore.update(s => ({ ...s, isOnline: navigator.onLine }));

    // Process any pending changes on init
    if (navigator.onLine) {
        setTimeout(() => {
            processPendingChanges();
        }, 1000);
    }

    // Set up periodic sync (every 5 minutes)
    setInterval(() => {
        if (navigator.onLine) {
            processPendingChanges();
        }
    }, 5 * 60 * 1000);
}
