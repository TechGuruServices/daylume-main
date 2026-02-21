/**
 * LocalStorage wrapper for Daylume PWA
 * Provides type-safe access to all app data
 */

import type {
    CalendarEvent,
    Alarm,
    Timer,
    JournalEntry,
    CalculationHistory,
    AppSettings,
    ChatMessage,
    AppData,
    UserProfile,
    ThemeSettings,
    Task,
    Habit,
    HabitLog,
    Goal,
    WeeklyReview,
    TimeBlock,
    InboxItem
} from './types';

const STORAGE_KEYS = {
    EVENTS: 'daylume_events',
    ALARMS: 'daylume_alarms',
    TIMERS: 'daylume_timers',
    JOURNAL: 'daylume_journal',
    CALCULATIONS: 'daylume_calculations',
    SETTINGS: 'daylume_settings',
    CHAT_HISTORY: 'daylume_chat_history',
    USER_PROFILE: 'daylume_user_profile',
    THEME_SETTINGS: 'daylume_theme_settings',
    TASKS: 'daylume_tasks',
    HABITS: 'daylume_habits',
    HABIT_LOGS: 'daylume_habit_logs',
    GOALS: 'daylume_goals',
    WEEKLY_REVIEWS: 'daylume_weekly_reviews',
    TIME_BLOCKS: 'daylume_time_blocks',
    INBOX: 'daylume_inbox'
} as const;

// Helper functions

/**
 * Generate a unique ID for entities
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function getFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading ${key} from storage:`, error);
        return defaultValue;
    }
}

function saveToStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving ${key} to storage:`, error);
    }
}

// Calendar Events
export function getEvents(): CalendarEvent[] {
    return getFromStorage(STORAGE_KEYS.EVENTS, []);
}

export function saveEvents(events: CalendarEvent[]): void {
    saveToStorage(STORAGE_KEYS.EVENTS, events);
}

export function addEvent(event: CalendarEvent): void {
    const events = getEvents();
    events.push(event);
    saveEvents(events);
}

export function updateEvent(id: string, updates: Partial<CalendarEvent>): void {
    const events = getEvents();
    const index = events.findIndex(e => e.id === id);
    if (index !== -1) {
        events[index] = { ...events[index], ...updates, updatedAt: new Date().toISOString() };
        saveEvents(events);
    }
}

export function deleteEvent(id: string): void {
    const events = getEvents().filter(e => e.id !== id);
    saveEvents(events);
}

// Alarms
export function getAlarms(): Alarm[] {
    return getFromStorage(STORAGE_KEYS.ALARMS, []);
}

export function saveAlarms(alarms: Alarm[]): void {
    saveToStorage(STORAGE_KEYS.ALARMS, alarms);
}

export function addAlarm(alarm: Alarm): void {
    const alarms = getAlarms();
    alarms.push(alarm);
    saveAlarms(alarms);
}

export function updateAlarm(id: string, updates: Partial<Alarm>): void {
    const alarms = getAlarms();
    const index = alarms.findIndex(a => a.id === id);
    if (index !== -1) {
        alarms[index] = { ...alarms[index], ...updates };
        saveAlarms(alarms);
    }
}

export function deleteAlarm(id: string): void {
    const alarms = getAlarms().filter(a => a.id !== id);
    saveAlarms(alarms);
}

// Timers
export function getTimers(): Timer[] {
    return getFromStorage(STORAGE_KEYS.TIMERS, []);
}

export function saveTimers(timers: Timer[]): void {
    saveToStorage(STORAGE_KEYS.TIMERS, timers);
}

export function addTimer(timer: Timer): void {
    const timers = getTimers();
    timers.push(timer);
    saveTimers(timers);
}

export function updateTimer(id: string, updates: Partial<Timer>): void {
    const timers = getTimers();
    const index = timers.findIndex(t => t.id === id);
    if (index !== -1) {
        timers[index] = { ...timers[index], ...updates };
        saveTimers(timers);
    }
}

export function deleteTimer(id: string): void {
    const timers = getTimers().filter(t => t.id !== id);
    saveTimers(timers);
}

// Journal Entries
export function getJournalEntries(): JournalEntry[] {
    return getFromStorage(STORAGE_KEYS.JOURNAL, []);
}

export function saveJournalEntries(entries: JournalEntry[]): void {
    saveToStorage(STORAGE_KEYS.JOURNAL, entries);
}

export function addJournalEntry(entry: JournalEntry): void {
    const entries = getJournalEntries();
    entries.push(entry);
    saveJournalEntries(entries);
}

export function updateJournalEntry(id: string, updates: Partial<JournalEntry>): void {
    const entries = getJournalEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
        entries[index] = { ...entries[index], ...updates, updatedAt: new Date().toISOString() };
        saveJournalEntries(entries);
    }
}

export function deleteJournalEntry(id: string): void {
    const entries = getJournalEntries().filter(e => e.id !== id);
    saveJournalEntries(entries);
}

// Calculator History
export function getCalculations(): CalculationHistory[] {
    return getFromStorage(STORAGE_KEYS.CALCULATIONS, []);
}

export function saveCalculations(calculations: CalculationHistory[]): void {
    saveToStorage(STORAGE_KEYS.CALCULATIONS, calculations);
}

export function addCalculation(calculation: CalculationHistory): void {
    const calculations = getCalculations();
    calculations.push(calculation);
    // Keep only last 50 calculations
    if (calculations.length > 50) {
        calculations.shift();
    }
    saveCalculations(calculations);
}

export function clearCalculations(): void {
    saveCalculations([]);
}

// Settings
export function getSettings(): AppSettings {
    return getFromStorage(STORAGE_KEYS.SETTINGS, {
        ai: {
            model: 'llama3.2'
        },
        notifications: true
    });
}

export function saveSettings(settings: AppSettings): void {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

// Chat History
export function getChatHistory(): ChatMessage[] {
    return getFromStorage(STORAGE_KEYS.CHAT_HISTORY, []);
}

export function saveChatHistory(messages: ChatMessage[]): void {
    saveToStorage(STORAGE_KEYS.CHAT_HISTORY, messages);
}

export function addChatMessage(message: ChatMessage): void {
    const history = getChatHistory();
    history.push(message);
    // Keep only last 100 messages
    if (history.length > 100) {
        history.shift();
    }
    saveChatHistory(history);
}

export function clearChatHistory(): void {
    saveChatHistory([]);
}

// Export/Import
export function exportAllData(): AppData {
    return {
        events: getEvents(),
        alarms: getAlarms(),
        timers: getTimers(),
        journal: getJournalEntries(),
        calculations: getCalculations(),
        settings: getSettings(),
        chatHistory: getChatHistory()
    };
}

export function importAllData(data: AppData): void {
    if (data.events) saveEvents(data.events);
    if (data.alarms) saveAlarms(data.alarms);
    if (data.timers) saveTimers(data.timers);
    if (data.journal) saveJournalEntries(data.journal);
    if (data.calculations) saveCalculations(data.calculations);
    if (data.settings) saveSettings(data.settings);
    if (data.chatHistory) saveChatHistory(data.chatHistory);
}

// User Profile
export function getUserProfile(): UserProfile {
    return getFromStorage(STORAGE_KEYS.USER_PROFILE, {
        name: 'User',
        email: '',
        bio: '',
        joinDate: new Date().toISOString(),
        plan: 'pro'
    });
}

export function saveUserProfile(profile: UserProfile): void {
    saveToStorage(STORAGE_KEYS.USER_PROFILE, profile);
}

// Theme Settings
export function getThemeSettings(): ThemeSettings {
    return getFromStorage(STORAGE_KEYS.THEME_SETTINGS, {
        preset: 'midnight',
        primaryColor: '#8B5CF6',
        secondaryColor: '#EC4899',
        accentColor: '#8B5CF6',
        animationSpeed: 5,
        fontFamily: 'Inter',
        density: 'comfortable',
        borderRadius: 16,
        glassIntensity: 50,
        visualTheme: 'default'
    });
}

export function saveThemeSettings(theme: ThemeSettings): void {
    saveToStorage(STORAGE_KEYS.THEME_SETTINGS, theme);
}

// Tasks
export function getTasks(): Task[] {
    return getFromStorage(STORAGE_KEYS.TASKS, []);
}

export function saveTasks(tasks: Task[]): void {
    saveToStorage(STORAGE_KEYS.TASKS, tasks);
}

export function addTask(task: Task): void {
    const tasks = getTasks();
    tasks.push(task);
    saveTasks(tasks);
}

export function updateTask(id: string, updates: Partial<Task>): void {
    const tasks = getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
        saveTasks(tasks);
    }
}

export function deleteTask(id: string): void {
    const tasks = getTasks().filter(t => t.id !== id);
    saveTasks(tasks);
}

export function getTasksForDate(date: string): Task[] {
    return getTasks().filter(t => t.dueDate === date);
}

export function getTasksByStatus(status: Task['status']): Task[] {
    return getTasks().filter(t => t.status === status);
}

// Habits
export function getHabits(): Habit[] {
    return getFromStorage(STORAGE_KEYS.HABITS, []);
}

export function saveHabits(habits: Habit[]): void {
    saveToStorage(STORAGE_KEYS.HABITS, habits);
}

export function addHabit(habit: Habit): void {
    const habits = getHabits();
    habits.push(habit);
    saveHabits(habits);
}

export function updateHabit(id: string, updates: Partial<Habit>): void {
    const habits = getHabits();
    const index = habits.findIndex(h => h.id === id);
    if (index !== -1) {
        habits[index] = { ...habits[index], ...updates, updatedAt: new Date().toISOString() };
        saveHabits(habits);
    }
}

export function deleteHabit(id: string): void {
    const habits = getHabits().filter(h => h.id !== id);
    saveHabits(habits);
    // Also delete associated logs
    const logs = getHabitLogs().filter(l => l.habitId !== id);
    saveHabitLogs(logs);
}

// Habit Logs
export function getHabitLogs(): HabitLog[] {
    return getFromStorage(STORAGE_KEYS.HABIT_LOGS, []);
}

export function saveHabitLogs(logs: HabitLog[]): void {
    saveToStorage(STORAGE_KEYS.HABIT_LOGS, logs);
}

export function addHabitLog(log: HabitLog): void {
    const logs = getHabitLogs();
    logs.push(log);
    saveHabitLogs(logs);
}

export function getHabitLogsForDate(date: string): HabitLog[] {
    return getHabitLogs().filter(l => l.date === date);
}

export function getHabitLogsForHabit(habitId: string): HabitLog[] {
    return getHabitLogs().filter(l => l.habitId === habitId);
}

export function updateHabitLog(id: string, updates: Partial<HabitLog>): void {
    const logs = getHabitLogs();
    const index = logs.findIndex(l => l.id === id);
    if (index !== -1) {
        logs[index] = { ...logs[index], ...updates };
        saveHabitLogs(logs);
    }
}

export function getOrCreateHabitLog(habitId: string, date: string): HabitLog {
    const logs = getHabitLogs();
    let log = logs.find(l => l.habitId === habitId && l.date === date);

    if (!log) {
        log = {
            id: Math.random().toString(36).substring(7),
            habitId,
            date,
            count: 0,
            createdAt: new Date().toISOString()
        };
        addHabitLog(log);
    }

    return log;
}

// Goals
export function getGoals(): Goal[] {
    return getFromStorage(STORAGE_KEYS.GOALS, []);
}

export function saveGoals(goals: Goal[]): void {
    saveToStorage(STORAGE_KEYS.GOALS, goals);
}

export function addGoal(goal: Goal): void {
    const goals = getGoals();
    goals.push(goal);
    saveGoals(goals);
}

export function updateGoal(id: string, updates: Partial<Goal>): void {
    const goals = getGoals();
    const index = goals.findIndex(g => g.id === id);
    if (index !== -1) {
        goals[index] = { ...goals[index], ...updates, updatedAt: new Date().toISOString() };
        saveGoals(goals);
    }
}

export function deleteGoal(id: string): void {
    const goals = getGoals().filter(g => g.id !== id);
    saveGoals(goals);
}

export function getActiveGoals(): Goal[] {
    return getGoals().filter(g => g.status === 'active');
}

// Weekly Reviews
export function getWeeklyReviews(): WeeklyReview[] {
    return getFromStorage(STORAGE_KEYS.WEEKLY_REVIEWS, []);
}

export function saveWeeklyReviews(reviews: WeeklyReview[]): void {
    saveToStorage(STORAGE_KEYS.WEEKLY_REVIEWS, reviews);
}

export function addWeeklyReview(review: WeeklyReview): void {
    const reviews = getWeeklyReviews();
    reviews.push(review);
    saveWeeklyReviews(reviews);
}

export function updateWeeklyReview(id: string, updates: Partial<WeeklyReview>): void {
    const reviews = getWeeklyReviews();
    const index = reviews.findIndex(r => r.id === id);
    if (index !== -1) {
        reviews[index] = { ...reviews[index], ...updates, updatedAt: new Date().toISOString() };
        saveWeeklyReviews(reviews);
    }
}

export function getWeeklyReviewForWeek(weekStart: string): WeeklyReview | undefined {
    return getWeeklyReviews().find(r => r.weekStart === weekStart);
}

// Time Blocks
export function getTimeBlocks(): TimeBlock[] {
    return getFromStorage(STORAGE_KEYS.TIME_BLOCKS, []);
}

export function saveTimeBlocks(blocks: TimeBlock[]): void {
    saveToStorage(STORAGE_KEYS.TIME_BLOCKS, blocks);
}

export function addTimeBlock(block: TimeBlock): void {
    const blocks = getTimeBlocks();
    blocks.push(block);
    saveTimeBlocks(blocks);
}

export function updateTimeBlock(id: string, updates: Partial<TimeBlock>): void {
    const blocks = getTimeBlocks();
    const index = blocks.findIndex(b => b.id === id);
    if (index !== -1) {
        blocks[index] = { ...blocks[index], ...updates };
        saveTimeBlocks(blocks);
    }
}

export function deleteTimeBlock(id: string): void {
    const blocks = getTimeBlocks().filter(b => b.id !== id);
    saveTimeBlocks(blocks);
}

export function getTimeBlocksForDate(date: string): TimeBlock[] {
    return getTimeBlocks().filter(b => b.date === date);
}

// Inbox (Quick Capture)
export function getInboxItems(): InboxItem[] {
    return getFromStorage(STORAGE_KEYS.INBOX, []);
}

export function saveInboxItems(items: InboxItem[]): void {
    saveToStorage(STORAGE_KEYS.INBOX, items);
}

export function addInboxItem(item: InboxItem): void {
    const items = getInboxItems();
    items.unshift(item); // Add to beginning
    saveInboxItems(items);
}

export function updateInboxItem(id: string, updates: Partial<InboxItem>): void {
    const items = getInboxItems();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
        items[index] = { ...items[index], ...updates };
        saveInboxItems(items);
    }
}

export function deleteInboxItem(id: string): void {
    const items = getInboxItems().filter(i => i.id !== id);
    saveInboxItems(items);
}

export function getUnprocessedInboxItems(): InboxItem[] {
    return getInboxItems().filter(i => !i.processedAt);
}

// Utility: Get week boundaries
export function getWeekBounds(date: Date): { start: string; end: string } {
    const d = new Date(date);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
}

// Calculate habit streak
export function getHabitStreak(habitId: string): number {
    const logs = getHabitLogsForHabit(habitId).sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (logs.length === 0) return 0;

    const habit = getHabits().find(h => h.id === habitId);
    if (!habit) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const log of logs) {
        if (log.count < 1) continue;

        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === streak || (streak === 0 && diffDays <= 1)) {
            streak++;
            currentDate = new Date(logDate);
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

export function clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}
