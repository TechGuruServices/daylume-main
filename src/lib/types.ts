// Type definitions for Daylume PWA

export interface CalendarEvent {
    id: string;
    title: string;
    date: string; // ISO date string
    time?: string; // HH:mm format
    endTime?: string;
    category: 'work' | 'personal' | 'health' | 'other';
    description?: string;
    color?: string;
    recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
    createdAt: string;
    updatedAt: string;
}

export interface Alarm {
    id: string;
    time: string; // HH:mm format
    label: string;
    enabled: boolean;
    repeat: 'none' | 'daily' | 'weekdays' | 'weekends' | 'custom';
    customDays?: number[]; // 0-6, Sunday to Saturday
    sound?: string;
    createdAt: string;
}

export interface Timer {
    id: string;
    label: string;
    duration: number; // in seconds
    remaining: number;
    isRunning: boolean;
    createdAt: string;
}

export interface JournalEntry {
    id: string;
    date: string; // ISO date string
    mood?: '😊' | '😐' | '😢' | '😡' | '😴' | '🤗' | '😰';
    tags: string[];
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface CalculationHistory {
    id: string;
    expression: string;
    result: number;
    timestamp: string;
}

export interface AISettings {
    apiKey?: string; // encrypted
    model: string;
}

export interface AppSettings {
    ai: AISettings;
    theme?: 'dark' | 'light';
    notifications: boolean;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface AppData {
    events: CalendarEvent[];
    alarms: Alarm[];
    timers: Timer[];
    journal: JournalEntry[];
    calculations: CalculationHistory[];
    settings: AppSettings;
    chatHistory: ChatMessage[];
}

export interface UserProfile {
    name: string;
    email: string;
    bio: string;
    avatar?: string; // URL or emoji
    joinDate: string;
    plan: 'free' | 'pro';
}

// Visual theme types with unique animated backdrops
export type VisualTheme = 'default' | 'aurora' | 'sunset' | 'ocean' | 'forest' | 'minimal';

// Custom background settings for personalization
export interface CustomBackgroundSettings {
    images: string[]; // Array of base64 or URLs
    shuffleEnabled: boolean;
    shuffleInterval: 3 | 10 | 30; // Minutes
    currentIndex: number;
    lastShuffled?: string; // ISO timestamp
}

export interface ThemeSettings {
    preset: 'custom' | 'dawn' | 'ocean' | 'sunset' | 'forest' | 'midnight' | 'aurora' | 'ember';
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    animationSpeed: number; // 1-10, where 5 is default
    fontFamily: 'Inter' | 'Roboto' | 'Outfit' | 'Poppins';
    density: 'compact' | 'comfortable' | 'spacious';
    borderRadius: number; // 0-24px
    glassIntensity: number; // 0-100%
    visualTheme: VisualTheme; // Visual theme with animated backdrop
    customBackground?: CustomBackgroundSettings; // Custom background images
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate?: string; // ISO date string
    dueTime?: string; // HH:mm format
    priority: TaskPriority;
    status: TaskStatus;
    category?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface Habit {
    id: string;
    title: string;
    description?: string;
    frequency: HabitFrequency;
    targetCount: number; // How many times per frequency period
    icon?: string;
    color?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface HabitLog {
    id: string;
    habitId: string;
    date: string; // ISO date string
    count: number; // Number of completions on this date
    notes?: string;
    createdAt: string;
}

// Goal Tracking
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';
export type GoalCategory = 'health' | 'career' | 'personal' | 'financial' | 'learning' | 'relationships' | 'other';

export interface GoalMilestone {
    id: string;
    title: string;
    description?: string;
    targetDate?: string;
    completedAt?: string;
    isCompleted: boolean;
}

export interface Goal {
    id: string;
    title: string;
    description?: string;
    category: GoalCategory;
    status: GoalStatus;
    targetDate?: string;
    milestones: GoalMilestone[];
    linkedTaskIds?: string[];
    linkedHabitIds?: string[];
    progress: number; // 0-100
    icon?: string;
    color?: string;
    createdAt: string;
    updatedAt?: string;
    completedAt?: string;
}

// Weekly Review
export interface WeeklyReview {
    id: string;
    weekStart: string; // ISO date string (Monday)
    weekEnd: string; // ISO date string (Sunday)
    tasksCompleted: number;
    tasksTotal: number;
    habitsCompletionRate: number; // 0-100
    journalEntries: number;
    wentWell: string;
    toImprove: string;
    focusNextWeek: string;
    moodSummary?: string;
    productivityScore?: number; // 1-10
    createdAt: string;
    updatedAt?: string;
}

// Enhanced Task with reminder support
export interface TaskReminder {
    id: string;
    taskId: string;
    reminderTime: string; // ISO datetime
    notified: boolean;
}

// Time Block for Calendar
export interface TimeBlock {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    type: 'focus' | 'break' | 'meeting' | 'personal';
    linkedTaskId?: string;
    linkedGoalId?: string;
    color?: string;
    createdAt: string;
}

// Quick Capture / Inbox
export interface InboxItem {
    id: string;
    content: string;
    capturedAt: string;
    processedAt?: string;
    convertedTo?: 'task' | 'event' | 'note' | 'goal';
    convertedId?: string;
}

// ===========================================
// SYNC & CONFLICT RESOLUTION
// ===========================================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error';

export type SyncEntityType = 'task' | 'habit' | 'goal' | 'event' | 'journal' | 'alarm';

export interface SyncMeta {
    lastSyncedAt: string; // ISO timestamp
    localVersion: number;
    remoteVersion?: number;
    checksum?: string; // For quick comparison
}

export interface SyncConflict<T = unknown> {
    id: string;
    entityType: SyncEntityType;
    entityId: string;
    localData: T;
    remoteData: T;
    localUpdatedAt: string;
    remoteUpdatedAt: string;
    detectedAt: string;
    resolved: boolean;
    resolution?: 'local' | 'remote' | 'merged';
}

export interface SyncState {
    status: SyncStatus;
    lastSyncedAt: string | null;
    pendingChanges: number;
    conflicts: SyncConflict[];
    isOnline: boolean;
    error?: string;
}

export interface PendingChange {
    id: string;
    entityType: SyncEntityType;
    entityId: string;
    action: 'create' | 'update' | 'delete';
    data: unknown;
    createdAt: string;
    retries: number;
}
