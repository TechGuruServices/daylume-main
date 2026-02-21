/**
 * Supabase Sync for Daylume
 * Handles syncing local data with Supabase for logged-in users
 * Now integrated with conflict resolution system
 */

import { supabase } from './supabase';
import { browser } from '$app/environment';
import type { Alarm, Task, Habit, Goal, CalendarEvent, JournalEntry } from './types';
import { 
    syncStore, 
    queueChange, 
    detectConflict, 
    initSyncSystem,
    isOnline,
    queueOfflineChange,
    syncStatus,
    processOfflineQueue
} from './sync-conflict';

// Initialize sync system on module load
if (browser) {
    initSyncSystem();
}

// ==================== ALARMS ====================

export async function loadAlarmsFromSupabase(): Promise<Alarm[]> {
    if (!browser) return [];
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
        // Not logged in, use localStorage
        const local = localStorage.getItem('daylume_alarms');
        return local ? JSON.parse(local) : [];
    }
    
    const userId = session.session.user.id;
    
    const { data, error } = await supabase
        .from('alarms')
        .select('*')
        .eq('user_id', userId)
        .order('time', { ascending: true });
    
    if (error) {
        console.error('Error loading alarms:', error);
        // Fallback to localStorage
        const local = localStorage.getItem('daylume_alarms');
        return local ? JSON.parse(local) : [];
    }
    
    // Map Supabase format to app format
    const alarms: Alarm[] = (data || []).map(a => ({
        id: a.id,
        time: a.time,
        label: a.label || 'Alarm',
        enabled: a.enabled,
        repeat: a.repeat || 'none',
        customDays: a.days || [],
        createdAt: a.created_at
    }));
    
    // Also save to localStorage for offline access
    localStorage.setItem('daylume_alarms', JSON.stringify(alarms));
    
    return alarms;
}

export async function saveAlarmToSupabase(alarm: Alarm): Promise<Alarm | null> {
    if (!browser) return null;
    
    const { data: session } = await supabase.auth.getSession();
    
    // Always save to localStorage first
    const localAlarms = JSON.parse(localStorage.getItem('daylume_alarms') || '[]');
    const existingIndex = localAlarms.findIndex((a: Alarm) => a.id === alarm.id);
    const isNew = existingIndex < 0;
    
    if (existingIndex >= 0) {
        localAlarms[existingIndex] = alarm;
    } else {
        localAlarms.push(alarm);
    }
    localStorage.setItem('daylume_alarms', JSON.stringify(localAlarms));
    
    if (!session?.session?.user) {
        // Queue for sync when online/logged in
        queueChange('alarm', alarm.id, isNew ? 'create' : 'update', alarm);
        return alarm;
    }
    
    // Check if offline
    if (!navigator.onLine) {
        queueChange('alarm', alarm.id, isNew ? 'create' : 'update', alarm);
        syncStore.setStatus('offline');
        return alarm;
    }
    
    syncStore.setStatus('syncing');
    const userId = session.session.user.id;
    
    const { data, error } = await supabase
        .from('alarms')
        .upsert({
            id: alarm.id,
            user_id: userId,
            time: alarm.time,
            label: alarm.label,
            enabled: alarm.enabled,
            repeat: alarm.repeat,
            days: alarm.customDays || [],
            created_at: alarm.createdAt
        }, { onConflict: 'id' })
        .select()
        .single();
    
    if (error) {
        console.error('Error saving alarm:', error);
        // Queue for retry
        queueChange('alarm', alarm.id, isNew ? 'create' : 'update', alarm);
    } else {
        syncStore.setStatus('synced');
    }
    
    return alarm;
}

export async function deleteAlarmFromSupabase(alarmId: string): Promise<void> {
    if (!browser) return;
    
    // Remove from localStorage
    const localAlarms = JSON.parse(localStorage.getItem('daylume_alarms') || '[]');
    const filtered = localAlarms.filter((a: Alarm) => a.id !== alarmId);
    localStorage.setItem('daylume_alarms', JSON.stringify(filtered));
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
        queueChange('alarm', alarmId, 'delete', null);
        return;
    }
    
    if (!navigator.onLine) {
        queueChange('alarm', alarmId, 'delete', null);
        syncStore.setStatus('offline');
        return;
    }
    
    syncStore.setStatus('syncing');
    
    const { error } = await supabase
        .from('alarms')
        .delete()
        .eq('id', alarmId);
    
    if (error) {
        console.error('Error deleting alarm:', error);
        queueChange('alarm', alarmId, 'delete', null);
    } else {
        syncStore.setStatus('synced');
    }
}

// ==================== EVENTS (Calendar) ====================

export async function loadEventsFromSupabase(): Promise<CalendarEvent[]> {
    if (!browser) return [];
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
        const local = localStorage.getItem('daylume_events');
        return local ? JSON.parse(local) : [];
    }
    
    const userId = session.session.user.id;
    
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });
    
    if (error) {
        console.error('Error loading events:', error);
        const local = localStorage.getItem('daylume_events');
        return local ? JSON.parse(local) : [];
    }
    
    const events: CalendarEvent[] = (data || []).map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        endTime: e.end_time,
        category: e.type || 'personal',
        description: e.description,
        recurring: e.recurring || 'none',
        createdAt: e.created_at,
        updatedAt: e.created_at
    }));
    
    localStorage.setItem('daylume_events', JSON.stringify(events));
    
    return events;
}

export async function saveEventToSupabase(event: CalendarEvent): Promise<CalendarEvent | null> {
    if (!browser) return null;
    
    // Save to localStorage first (offline-first)
    const localEvents = JSON.parse(localStorage.getItem('daylume_events') || '[]');
    const existingIndex = localEvents.findIndex((e: CalendarEvent) => e.id === event.id);
    if (existingIndex >= 0) {
        localEvents[existingIndex] = event;
    } else {
        localEvents.push(event);
    }
    localStorage.setItem('daylume_events', JSON.stringify(localEvents));
    
    // Queue for offline sync if not online
    if (!isOnline()) {
        queueOfflineChange('upsert', 'event', event.id, event);
        return event;
    }
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return event;
    
    const userId = session.session.user.id;
    
    try {
        const { error } = await supabase
            .from('events')
            .upsert({
                id: event.id,
                user_id: userId,
                title: event.title,
                date: event.date,
                time: event.time,
                end_time: event.endTime,
                type: event.category,
                description: event.description,
                recurring: event.recurring,
                created_at: event.createdAt
            }, { onConflict: 'id' });
        
        if (error) {
            console.error('Error saving event:', error);
            // Queue for retry
            queueOfflineChange('upsert', 'event', event.id, event);
        }
    } catch (err) {
        console.error('Network error saving event:', err);
        queueOfflineChange('upsert', 'event', event.id, event);
    }
    
    return event;
}

export async function deleteEventFromSupabase(eventId: string): Promise<void> {
    if (!browser) return;
    
    // Delete from localStorage first (offline-first)
    const localEvents = JSON.parse(localStorage.getItem('daylume_events') || '[]');
    const filtered = localEvents.filter((e: CalendarEvent) => e.id !== eventId);
    localStorage.setItem('daylume_events', JSON.stringify(filtered));
    
    // Queue for offline sync if not online
    if (!isOnline()) {
        queueOfflineChange('delete', 'event', eventId, { id: eventId });
        return;
    }
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;
    
    try {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);
        
        if (error) {
            console.error('Error deleting event:', error);
            queueOfflineChange('delete', 'event', eventId, { id: eventId });
        }
    } catch (err) {
        console.error('Network error deleting event:', err);
        queueOfflineChange('delete', 'event', eventId, { id: eventId });
    }
}

// ==================== TASKS ====================

export async function loadTasksFromSupabase(): Promise<Task[]> {
    if (!browser) return [];
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
        const local = localStorage.getItem('daylume_tasks');
        return local ? JSON.parse(local) : [];
    }
    
    const userId = session.session.user.id;
    
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading tasks:', error);
        const local = localStorage.getItem('daylume_tasks');
        return local ? JSON.parse(local) : [];
    }
    
    const tasks: Task[] = (data || []).map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status || 'pending',
        priority: t.priority || 'medium',
        dueDate: t.due_date,
        dueTime: t.due_time,
        category: t.category,
        tags: t.tags || [],
        subtasks: t.subtasks || [],
        completedAt: t.completed_at,
        createdAt: t.created_at,
        updatedAt: t.updated_at
    }));
    
    localStorage.setItem('daylume_tasks', JSON.stringify(tasks));
    
    return tasks;
}

export async function saveTaskToSupabase(task: Task): Promise<Task | null> {
    if (!browser) return null;
    
    // Save to localStorage first (offline-first)
    const localTasks = JSON.parse(localStorage.getItem('daylume_tasks') || '[]');
    const existingIndex = localTasks.findIndex((t: Task) => t.id === task.id);
    if (existingIndex >= 0) {
        localTasks[existingIndex] = task;
    } else {
        localTasks.push(task);
    }
    localStorage.setItem('daylume_tasks', JSON.stringify(localTasks));
    
    // Queue for offline sync if not online
    if (!isOnline()) {
        queueOfflineChange('upsert', 'task', task.id, task);
        return task;
    }
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return task;
    
    const userId = session.session.user.id;
    
    try {
        const { error } = await supabase
            .from('tasks')
            .upsert({
                id: task.id,
                user_id: userId,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                due_date: task.dueDate,
                due_time: task.dueTime,
                category: task.category,
                completed_at: task.completedAt,
                created_at: task.createdAt,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        
        if (error) {
            console.error('Error saving task:', error);
            queueOfflineChange('upsert', 'task', task.id, task);
        }
    } catch (err) {
        console.error('Network error saving task:', err);
        queueOfflineChange('upsert', 'task', task.id, task);
    }
    
    return task;
}

export async function deleteTaskFromSupabase(taskId: string): Promise<void> {
    if (!browser) return;
    
    // Delete from localStorage first (offline-first)
    const localTasks = JSON.parse(localStorage.getItem('daylume_tasks') || '[]');
    const filtered = localTasks.filter((t: Task) => t.id !== taskId);
    localStorage.setItem('daylume_tasks', JSON.stringify(filtered));
    
    // Queue for offline sync if not online
    if (!isOnline()) {
        queueOfflineChange('delete', 'task', taskId, { id: taskId });
        return;
    }
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;
    
    try {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);
        
        if (error) {
            console.error('Error deleting task:', error);
            queueOfflineChange('delete', 'task', taskId, { id: taskId });
        }
    } catch (err) {
        console.error('Network error deleting task:', err);
        queueOfflineChange('delete', 'task', taskId, { id: taskId });
    }
}

// ==================== HABITS ====================

export async function loadHabitsFromSupabase(): Promise<Habit[]> {
    if (!browser) return [];
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
        const local = localStorage.getItem('daylume_habits');
        return local ? JSON.parse(local) : [];
    }
    
    const userId = session.session.user.id;
    
    const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading habits:', error);
        const local = localStorage.getItem('daylume_habits');
        return local ? JSON.parse(local) : [];
    }
    
    const habits: Habit[] = (data || []).map(h => ({
        id: h.id,
        title: h.name || h.title,
        description: h.description,
        icon: h.icon || '✓',
        color: h.color || '#8B5CF6',
        frequency: h.frequency || 'daily',
        targetCount: h.target_count || 1,
        createdAt: h.created_at,
        updatedAt: h.updated_at
    }));
    
    localStorage.setItem('daylume_habits', JSON.stringify(habits));
    
    return habits;
}

export async function saveHabitToSupabase(habit: Habit): Promise<Habit | null> {
    if (!browser) return null;
    
    // Save to localStorage first (offline-first)
    const localHabits = JSON.parse(localStorage.getItem('daylume_habits') || '[]');
    const existingIndex = localHabits.findIndex((h: Habit) => h.id === habit.id);
    if (existingIndex >= 0) {
        localHabits[existingIndex] = habit;
    } else {
        localHabits.push(habit);
    }
    localStorage.setItem('daylume_habits', JSON.stringify(localHabits));
    
    // Queue for offline sync if not online
    if (!isOnline()) {
        queueOfflineChange('upsert', 'habit', habit.id, habit);
        return habit;
    }
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return habit;
    
    const userId = session.session.user.id;
    
    try {
        const { error } = await supabase
            .from('habits')
            .upsert({
                id: habit.id,
                user_id: userId,
                name: habit.title,
                description: habit.description,
                icon: habit.icon,
                color: habit.color,
                frequency: habit.frequency,
                target_count: habit.targetCount,
                created_at: habit.createdAt,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        
        if (error) {
            console.error('Error saving habit:', error);
            queueOfflineChange('upsert', 'habit', habit.id, habit);
        }
    } catch (err) {
        console.error('Network error saving habit:', err);
        queueOfflineChange('upsert', 'habit', habit.id, habit);
    }
    
    return habit;
}

// ==================== JOURNAL ====================

export async function loadJournalFromSupabase(): Promise<JournalEntry[]> {
    if (!browser) return [];
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
        const local = localStorage.getItem('daylume_journal');
        return local ? JSON.parse(local) : [];
    }
    
    const userId = session.session.user.id;
    
    const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
    
    if (error) {
        console.error('Error loading journal:', error);
        const local = localStorage.getItem('daylume_journal');
        return local ? JSON.parse(local) : [];
    }
    
    const entries: JournalEntry[] = (data || []).map(j => ({
        id: j.id,
        date: j.date,
        content: j.content,
        mood: j.mood,
        tags: j.tags || [],
        createdAt: j.created_at,
        updatedAt: j.updated_at
    }));
    
    localStorage.setItem('daylume_journal', JSON.stringify(entries));
    
    return entries;
}

export async function saveJournalEntryToSupabase(entry: JournalEntry): Promise<JournalEntry | null> {
    if (!browser) return null;
    
    // Save to localStorage first (offline-first)
    const localEntries = JSON.parse(localStorage.getItem('daylume_journal') || '[]');
    const existingIndex = localEntries.findIndex((e: JournalEntry) => e.id === entry.id);
    if (existingIndex >= 0) {
        localEntries[existingIndex] = entry;
    } else {
        localEntries.push(entry);
    }
    localStorage.setItem('daylume_journal', JSON.stringify(localEntries));
    
    // Queue for offline sync if not online
    if (!isOnline()) {
        queueOfflineChange('upsert', 'journal', entry.id, entry);
        return entry;
    }
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return entry;
    
    const userId = session.session.user.id;
    
    try {
        const { error } = await supabase
            .from('journal_entries')
            .upsert({
                id: entry.id,
                user_id: userId,
                date: entry.date,
                content: entry.content,
                mood: entry.mood,
                tags: entry.tags,
                created_at: entry.createdAt,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        
        if (error) {
            console.error('Error saving journal entry:', error);
            queueOfflineChange('upsert', 'journal', entry.id, entry);
        }
    } catch (err) {
        console.error('Network error saving journal entry:', err);
        queueOfflineChange('upsert', 'journal', entry.id, entry);
    }
    
    return entry;
}

// ==================== GOALS ====================

export async function loadGoalsFromSupabase(): Promise<Goal[]> {
    if (!browser) return [];
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
        const local = localStorage.getItem('daylume_goals');
        return local ? JSON.parse(local) : [];
    }
    
    const userId = session.session.user.id;
    
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading goals:', error);
        const local = localStorage.getItem('daylume_goals');
        return local ? JSON.parse(local) : [];
    }
    
    const goals: Goal[] = (data || []).map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category || 'personal',
        targetDate: g.target_date,
        progress: g.progress || 0,
        status: g.status || 'active',
        milestones: g.milestones || [],
        createdAt: g.created_at,
        updatedAt: g.updated_at
    }));
    
    localStorage.setItem('daylume_goals', JSON.stringify(goals));
    
    return goals;
}

export async function saveGoalToSupabase(goal: Goal): Promise<Goal | null> {
    if (!browser) return null;
    
    // Save to localStorage first (offline-first)
    const localGoals = JSON.parse(localStorage.getItem('daylume_goals') || '[]');
    const existingIndex = localGoals.findIndex((g: Goal) => g.id === goal.id);
    if (existingIndex >= 0) {
        localGoals[existingIndex] = goal;
    } else {
        localGoals.push(goal);
    }
    localStorage.setItem('daylume_goals', JSON.stringify(localGoals));
    
    // Queue for offline sync if not online
    if (!isOnline()) {
        queueOfflineChange('upsert', 'goal', goal.id, goal);
        return goal;
    }
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return goal;
    
    const userId = session.session.user.id;
    
    try {
        const { error } = await supabase
            .from('goals')
            .upsert({
                id: goal.id,
                user_id: userId,
                title: goal.title,
                description: goal.description,
                category: goal.category,
                target_date: goal.targetDate,
                progress: goal.progress,
                status: goal.status,
                milestones: goal.milestones,
                created_at: goal.createdAt,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        
        if (error) {
            console.error('Error saving goal:', error);
            queueOfflineChange('upsert', 'goal', goal.id, goal);
        }
    } catch (err) {
        console.error('Network error saving goal:', err);
        queueOfflineChange('upsert', 'goal', goal.id, goal);
    }
    
    return goal;
}

// ==================== SYNC ALL DATA ====================

export async function syncAllDataFromSupabase(): Promise<void> {
    if (!browser) return;
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
        console.log('Not logged in, skipping sync');
        return;
    }
    
    console.log('Syncing all data from Supabase...');
    syncStatus.set('syncing');
    
    try {
        // First, process any pending offline changes
        await processOfflineQueue();
        
        // Then sync from remote
        await Promise.all([
            loadAlarmsFromSupabase(),
            loadEventsFromSupabase(),
            loadTasksFromSupabase(),
            loadHabitsFromSupabase(),
            loadJournalFromSupabase(),
            loadGoalsFromSupabase()
        ]);
        
        syncStatus.set('synced');
        console.log('Sync complete');
    } catch (error) {
        console.error('Sync error:', error);
        syncStatus.set('error');
    }
}

// ==================== INITIAL SYNC ON LOGIN ====================

export async function performInitialSync(): Promise<void> {
    await syncAllDataFromSupabase();
}
