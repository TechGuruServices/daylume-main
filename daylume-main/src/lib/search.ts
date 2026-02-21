import { supabase } from './supabase';

export interface SearchResult {
    type: 'event' | 'journal' | 'alarm' | 'task' | 'habit';
    title: string;
    subtitle: string;
    href: string;
    icon: string;
    color: string;
}

// Cache for search results to avoid excessive API calls
let searchCache: { query: string; results: SearchResult[]; timestamp: number } | null = null;
const CACHE_DURATION = 5000; // 5 seconds

export async function searchAll(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const lowerQuery = query.toLowerCase().trim();
    
    // Check cache
    if (searchCache && 
        searchCache.query === lowerQuery && 
        Date.now() - searchCache.timestamp < CACHE_DURATION) {
        return searchCache.results;
    }

    const results: SearchResult[] = [];

    try {
        // Search Events
        const { data: events } = await supabase
            .from('events')
            .select('*')
            .or(`title.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%`)
            .limit(10);

        if (events) {
            events.forEach(event => {
                results.push({
                    type: 'event',
                    title: event.title,
                    subtitle: new Date(event.date).toLocaleDateString(),
                    href: '/calendar',
                    icon: 'mdi-calendar',
                    color: 'text-secondary'
                });
            });
        }

        // Search Journal
        const { data: journal } = await supabase
            .from('journal_entries')
            .select('*')
            .ilike('content', `%${lowerQuery}%`)
            .limit(10);

        if (journal) {
            journal.forEach(entry => {
                const snippet = entry.content && entry.content.length > 50
                    ? entry.content.substring(0, 50) + '...'
                    : entry.content || '';

                results.push({
                    type: 'journal',
                    title: new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
                    subtitle: snippet,
                    href: '/journal',
                    icon: 'mdi-book-open-variant',
                    color: 'text-accent'
                });
            });
        }

        // Search Alarms
        const { data: alarms } = await supabase
            .from('alarms')
            .select('*')
            .ilike('label', `%${lowerQuery}%`)
            .limit(10);

        if (alarms) {
            alarms.forEach(alarm => {
                results.push({
                    type: 'alarm',
                    title: alarm.label || 'Alarm',
                    subtitle: alarm.time,
                    href: '/alarms',
                    icon: 'mdi-alarm',
                    color: 'text-warning'
                });
            });
        }

        // Search Tasks
        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .or(`title.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%`)
            .limit(10);

        if (tasks) {
            tasks.forEach(task => {
                results.push({
                    type: 'task',
                    title: task.title,
                    subtitle: task.status === 'completed' ? 'Completed' : (task.due_date || 'No due date'),
                    href: '/tasks',
                    icon: 'mdi-checkbox-marked-circle-outline',
                    color: 'text-primary'
                });
            });
        }

        // Search Habits
        const { data: habits } = await supabase
            .from('habits')
            .select('*')
            .or(`title.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%`)
            .limit(10);

        if (habits) {
            habits.forEach(habit => {
                results.push({
                    type: 'habit',
                    title: habit.title,
                    subtitle: habit.frequency || 'daily',
                    href: '/habits',
                    icon: 'mdi-lightning-bolt',
                    color: 'text-accent'
                });
            });
        }

        // Update cache
        searchCache = { query: lowerQuery, results, timestamp: Date.now() };

    } catch (error) {
        console.error('Search error:', error);
    }

    return results;
}

// Synchronous version for backwards compatibility (uses cached results or returns empty)
export function searchAllSync(query: string): SearchResult[] {
    if (!query || query.trim().length < 2) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    
    // Return cached results if available
    if (searchCache && searchCache.query === lowerQuery) {
        return searchCache.results;
    }
    
    // Trigger async search for next time
    searchAll(query);
    
    return [];
}
