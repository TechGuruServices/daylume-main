// Widget System - Types and Store
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export type WidgetType = 
  | 'weather'
  | 'quote'
  | 'stats'
  | 'mini-calendar'
  | 'tasks-today'
  | 'habits-progress'
  | 'goals-progress'
  | 'upcoming-events'
  | 'streak-counter'
  | 'mood-tracker'
  | 'quick-add'
  | 'pomodoro';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: { x: number; y: number };
  order: number;
  visible: boolean;
  settings?: Record<string, any>;
}

export interface WidgetConfig {
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
  defaultSize: WidgetSize;
  availableSizes: WidgetSize[];
  minWidth: number;
  minHeight: number;
}

// Widget configurations
export const widgetConfigs: Record<WidgetType, WidgetConfig> = {
  'weather': {
    type: 'weather',
    title: 'Weather',
    description: 'Current weather and forecast',
    icon: '/assets/glass_focus-sun.png',
    defaultSize: 'small',
    availableSizes: ['small', 'medium'],
    minWidth: 1,
    minHeight: 1
  },
  'quote': {
    type: 'quote',
    title: 'Daily Quote',
    description: 'Inspirational quotes to motivate you',
    icon: '/assets/glass_05_journal.png',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    minWidth: 2,
    minHeight: 1
  },
  'stats': {
    type: 'stats',
    title: 'Quick Stats',
    description: 'Overview of your productivity',
    icon: '/assets/glass_insights-analytics.png',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    minWidth: 2,
    minHeight: 1
  },
  'mini-calendar': {
    type: 'mini-calendar',
    title: 'Mini Calendar',
    description: 'Compact monthly calendar view',
    icon: '/assets/glass_04_calendar.png',
    defaultSize: 'medium',
    availableSizes: ['medium', 'large'],
    minWidth: 2,
    minHeight: 2
  },
  'tasks-today': {
    type: 'tasks-today',
    title: "Today's Tasks",
    description: 'Tasks due today',
    icon: '/assets/glass_02_tasks.png',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    minWidth: 1,
    minHeight: 2
  },
  'habits-progress': {
    type: 'habits-progress',
    title: 'Habits Progress',
    description: 'Track your daily habits',
    icon: '/assets/glass_03_habits.png',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    minWidth: 1,
    minHeight: 2
  },
  'goals-progress': {
    type: 'goals-progress',
    title: 'Goals Progress',
    description: 'Track your goal progress',
    icon: '/assets/glass_07_goals.png',
    defaultSize: 'medium',
    availableSizes: ['medium', 'large'],
    minWidth: 2,
    minHeight: 1
  },
  'upcoming-events': {
    type: 'upcoming-events',
    title: 'Upcoming Events',
    description: 'Next events on your calendar',
    icon: '/assets/glass_daily-calendar.png',
    defaultSize: 'small',
    availableSizes: ['small', 'medium'],
    minWidth: 1,
    minHeight: 1
  },
  'streak-counter': {
    type: 'streak-counter',
    title: 'Streak Counter',
    description: 'Your current streaks',
    icon: '/assets/glass_03_habits.png',
    defaultSize: 'small',
    availableSizes: ['small'],
    minWidth: 1,
    minHeight: 1
  },
  'mood-tracker': {
    type: 'mood-tracker',
    title: 'Mood Tracker',
    description: 'Quick mood check-in',
    icon: '/assets/glass_05_journal.png',
    defaultSize: 'small',
    availableSizes: ['small', 'medium'],
    minWidth: 1,
    minHeight: 1
  },
  'quick-add': {
    type: 'quick-add',
    title: 'Quick Add',
    description: 'Quickly add tasks or events',
    icon: '/assets/glass_10_add.png',
    defaultSize: 'small',
    availableSizes: ['small', 'medium'],
    minWidth: 1,
    minHeight: 1
  },
  'pomodoro': {
    type: 'pomodoro',
    title: 'Pomodoro Timer',
    description: 'Focus timer for productivity',
    icon: '/assets/glass_06_alarms.png',
    defaultSize: 'small',
    availableSizes: ['small', 'medium'],
    minWidth: 1,
    minHeight: 1
  }
};

// Default widget layout
const defaultWidgets: Widget[] = [
  { id: 'widget-1', type: 'stats', title: 'Quick Stats', size: 'medium', position: { x: 0, y: 0 }, order: 0, visible: true },
  { id: 'widget-2', type: 'tasks-today', title: "Today's Tasks", size: 'medium', position: { x: 2, y: 0 }, order: 1, visible: true },
  { id: 'widget-3', type: 'habits-progress', title: 'Habits Progress', size: 'medium', position: { x: 0, y: 1 }, order: 2, visible: true },
  { id: 'widget-4', type: 'upcoming-events', title: 'Upcoming Events', size: 'small', position: { x: 2, y: 1 }, order: 3, visible: true },
  { id: 'widget-5', type: 'weather', title: 'Weather', size: 'small', position: { x: 3, y: 1 }, order: 4, visible: true },
];

// Load widgets from localStorage
function loadWidgets(): Widget[] {
  if (!browser) return defaultWidgets;
  
  const saved = localStorage.getItem('daylume_widgets');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultWidgets;
    }
  }
  return defaultWidgets;
}

// Widget store
function createWidgetStore() {
  const { subscribe, set, update } = writable<Widget[]>(loadWidgets());
  
  // Save to localStorage whenever widgets change
  if (browser) {
    subscribe(widgets => {
      localStorage.setItem('daylume_widgets', JSON.stringify(widgets));
    });
  }
  
  return {
    subscribe,
    set,
    update,
    
    addWidget(type: WidgetType) {
      update(widgets => {
        const config = widgetConfigs[type];
        const newWidget: Widget = {
          id: `widget-${Date.now()}`,
          type,
          title: config.title,
          size: config.defaultSize,
          position: { x: 0, y: widgets.length },
          order: widgets.length,
          visible: true
        };
        return [...widgets, newWidget];
      });
    },
    
    removeWidget(id: string) {
      update(widgets => widgets.filter(w => w.id !== id));
    },
    
    updateWidget(id: string, updates: Partial<Widget>) {
      update(widgets => 
        widgets.map(w => w.id === id ? { ...w, ...updates } : w)
      );
    },
    
    toggleVisibility(id: string) {
      update(widgets =>
        widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
      );
    },
    
    reorderWidgets(newOrder: Widget[]) {
      set(newOrder.map((w, i) => ({ ...w, order: i })));
    },
    
    resetToDefault() {
      set(defaultWidgets);
    }
  };
}

export const widgetStore = createWidgetStore();

// Inspirational quotes for the quote widget
export const dailyQuotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Don't be pushed around by the fears in your mind. Be led by the dreams in your heart.", author: "Roy T. Bennett" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Your habits will determine your future.", author: "Jack Canfield" },
  { text: "Make each day your masterpiece.", author: "John Wooden" },
  { text: "Progress, not perfection.", author: "Unknown" },
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Consistency is the key to success.", author: "Unknown" },
  { text: "Today is a new day. Don't let your history interfere with your destiny.", author: "Steve Maraboli" }
];

// Get today's quote based on date
export function getTodaysQuote(): { text: string; author: string } {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return dailyQuotes[dayOfYear % dailyQuotes.length];
}
