import { supabase } from '$lib/supabase';
import { getEvents, getAlarms, getJournalEntries } from '$lib/storage';
import { showToast } from '$lib/toast';

export async function migrateData(userId: string) {
    if (typeof window === 'undefined') return;

    const MIGRATION_KEY = 'daylume_migration_completed';
    if (localStorage.getItem(MIGRATION_KEY)) {
        console.log('Migration already completed');
        return;
    }

    try {
        console.log('Starting migration...');

        // 1. Migrate Events
        const localEvents = getEvents();
        if (localEvents.length > 0) {
            const eventsToInsert = localEvents.map(event => ({
                user_id: userId,
                title: event.title,
                date: event.date,
                time: event.time,
                end_time: event.endTime,
                type: event.category, // Mapping category to type
                description: event.description,
                recurring: event.recurring,
                created_at: event.createdAt
            }));

            const { error: eventsError } = await supabase
                .from('events')
                .insert(eventsToInsert);

            if (eventsError) throw eventsError;
            console.log(`Migrated ${localEvents.length} events`);
        }

        // 2. Migrate Alarms
        const localAlarms = getAlarms();
        if (localAlarms.length > 0) {
            const alarmsToInsert = localAlarms.map(alarm => ({
                user_id: userId,
                time: alarm.time,
                label: alarm.label,
                enabled: alarm.enabled,
                repeat: alarm.repeat,
                days: alarm.repeat === 'custom' ? alarm.customDays : null,
                created_at: alarm.createdAt
            }));

            const { error: alarmsError } = await supabase
                .from('alarms')
                .insert(alarmsToInsert);

            if (alarmsError) throw alarmsError;
            console.log(`Migrated ${localAlarms.length} alarms`);
        }

        // 3. Migrate Journal Entries
        const localJournal = getJournalEntries();
        if (localJournal.length > 0) {
            const journalToInsert = localJournal.map(entry => ({
                user_id: userId,
                date: entry.date,
                content: entry.content,
                mood: entry.mood,
                tags: entry.tags,
                created_at: entry.createdAt
            }));

            const { error: journalError } = await supabase
                .from('journal_entries')
                .insert(journalToInsert);

            if (journalError) throw journalError;
            console.log(`Migrated ${localJournal.length} journal entries`);
        }

        // Mark migration as complete
        localStorage.setItem(MIGRATION_KEY, 'true');
        console.log('Migration completed successfully');
        showToast('success', 'Data migration completed successfully');

    } catch (error) {
        console.error('Migration failed:', error);
        showToast('error', 'Data migration failed. Please check console.');
    }
}
