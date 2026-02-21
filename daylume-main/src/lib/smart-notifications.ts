// Smart Notifications System
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface NotificationSettings {
  enabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;
  };
  focusMode: {
    enabled: boolean;
    allowUrgent: boolean;
  };
  priorities: {
    urgent: { sound: string; vibrate: boolean; persistent: boolean };
    high: { sound: string; vibrate: boolean; persistent: boolean };
    medium: { sound: string; vibrate: boolean; persistent: boolean };
    low: { sound: string; vibrate: boolean; persistent: boolean };
  };
  intelligentTiming: {
    enabled: boolean;
    learnFromBehavior: boolean;
    optimalTimes: string[]; // Learned optimal notification times
  };
  locationReminders: {
    enabled: boolean;
    locations: LocationReminder[];
  };
  taskReminders: {
    enabled: boolean;
    defaultBefore: number; // minutes before due
    escalation: boolean; // escalate if not completed
  };
  eventReminders: {
    enabled: boolean;
    defaultBefore: number[]; // [30, 10] = 30 min and 10 min before
  };
  habitReminders: {
    enabled: boolean;
    times: string[]; // reminder times
  };
}

export interface LocationReminder {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  triggerOn: 'enter' | 'exit' | 'both';
  tasks: string[]; // task IDs to remind about
  enabled: boolean;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  type: 'task' | 'event' | 'habit' | 'goal' | 'custom';
  relatedId?: string;
  sent: boolean;
  dismissed: boolean;
}

export interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  sentAt: Date;
  interactedAt?: Date;
  action?: 'opened' | 'dismissed' | 'snoozed';
}

// Sound options for different priorities
export const notificationSounds = {
  gentle: { name: 'Gentle', file: 'gentle.mp3' },
  chime: { name: 'Chime', file: 'chime.mp3' },
  bell: { name: 'Bell', file: 'bell.mp3' },
  alert: { name: 'Alert', file: 'alert.mp3' },
  urgent: { name: 'Urgent', file: 'urgent.mp3' },
  silent: { name: 'Silent', file: null }
};

// Default notification settings
const defaultSettings: NotificationSettings = {
  enabled: true,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00'
  },
  focusMode: {
    enabled: false,
    allowUrgent: true
  },
  priorities: {
    urgent: { sound: 'urgent', vibrate: true, persistent: true },
    high: { sound: 'alert', vibrate: true, persistent: false },
    medium: { sound: 'chime', vibrate: false, persistent: false },
    low: { sound: 'gentle', vibrate: false, persistent: false }
  },
  intelligentTiming: {
    enabled: true,
    learnFromBehavior: true,
    optimalTimes: ['09:00', '12:00', '18:00']
  },
  locationReminders: {
    enabled: false,
    locations: []
  },
  taskReminders: {
    enabled: true,
    defaultBefore: 30,
    escalation: true
  },
  eventReminders: {
    enabled: true,
    defaultBefore: [30, 10]
  },
  habitReminders: {
    enabled: true,
    times: ['08:00', '12:00', '20:00']
  }
};

// Load settings from localStorage
function loadSettings(): NotificationSettings {
  if (!browser) return defaultSettings;
  
  const saved = localStorage.getItem('daylume_notification_settings');
  if (saved) {
    try {
      return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
}

// Notification settings store
function createNotificationSettingsStore() {
  const { subscribe, set, update } = writable<NotificationSettings>(loadSettings());
  
  if (browser) {
    subscribe(settings => {
      localStorage.setItem('daylume_notification_settings', JSON.stringify(settings));
    });
  }
  
  return {
    subscribe,
    set,
    update,
    
    updateQuietHours(quietHours: NotificationSettings['quietHours']) {
      update(s => ({ ...s, quietHours }));
    },
    
    toggleFocusMode(enabled?: boolean) {
      update(s => ({
        ...s,
        focusMode: {
          ...s.focusMode,
          enabled: enabled ?? !s.focusMode.enabled
        }
      }));
    },
    
    updatePriority(priority: keyof NotificationSettings['priorities'], config: NotificationSettings['priorities']['urgent']) {
      update(s => ({
        ...s,
        priorities: { ...s.priorities, [priority]: config }
      }));
    },
    
    addLocation(location: Omit<LocationReminder, 'id'>) {
      update(s => ({
        ...s,
        locationReminders: {
          ...s.locationReminders,
          locations: [
            ...s.locationReminders.locations,
            { ...location, id: `loc-${Date.now()}` }
          ]
        }
      }));
    },
    
    removeLocation(id: string) {
      update(s => ({
        ...s,
        locationReminders: {
          ...s.locationReminders,
          locations: s.locationReminders.locations.filter(l => l.id !== id)
        }
      }));
    },
    
    reset() {
      set(defaultSettings);
    }
  };
}

export const notificationSettingsStore = createNotificationSettingsStore();

// Scheduled notifications store
function createScheduledNotificationsStore() {
  const { subscribe, set, update } = writable<ScheduledNotification[]>([]);
  
  return {
    subscribe,
    set,
    update,
    
    schedule(notification: Omit<ScheduledNotification, 'id' | 'sent' | 'dismissed'>) {
      update(notifications => [
        ...notifications,
        {
          ...notification,
          id: `notif-${Date.now()}`,
          sent: false,
          dismissed: false
        }
      ]);
    },
    
    markSent(id: string) {
      update(notifications =>
        notifications.map(n => n.id === id ? { ...n, sent: true } : n)
      );
    },
    
    dismiss(id: string) {
      update(notifications =>
        notifications.map(n => n.id === id ? { ...n, dismissed: true } : n)
      );
    },
    
    remove(id: string) {
      update(notifications => notifications.filter(n => n.id !== id));
    },
    
    clearSent() {
      update(notifications => notifications.filter(n => !n.sent));
    }
  };
}

export const scheduledNotificationsStore = createScheduledNotificationsStore();

// Notification history for intelligent timing
function createNotificationHistoryStore() {
  const storageKey = 'daylume_notification_history';
  
  function load(): NotificationHistory[] {
    if (!browser) return [];
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  }
  
  const { subscribe, set, update } = writable<NotificationHistory[]>(load());
  
  if (browser) {
    subscribe(history => {
      // Keep only last 100 entries
      const trimmed = history.slice(-100);
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    });
  }
  
  return {
    subscribe,
    set,
    update,
    
    record(notification: Omit<NotificationHistory, 'id'>) {
      update(history => [
        ...history,
        { ...notification, id: `hist-${Date.now()}` }
      ]);
    },
    
    recordInteraction(id: string, action: NotificationHistory['action']) {
      update(history =>
        history.map(h =>
          h.id === id
            ? { ...h, interactedAt: new Date(), action }
            : h
        )
      );
    }
  };
}

export const notificationHistoryStore = createNotificationHistoryStore();

// Smart notification utilities
export class SmartNotificationManager {
  private settings: NotificationSettings;
  private permissionGranted: boolean = false;
  
  constructor() {
    this.settings = get(notificationSettingsStore);
    notificationSettingsStore.subscribe(s => this.settings = s);
    this.checkPermission();
  }
  
  async checkPermission(): Promise<boolean> {
    if (!browser || !('Notification' in window)) {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    }
    
    return false;
  }
  
  isQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = this.settings.quietHours;
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }
    
    return currentTime >= start && currentTime < end;
  }
  
  isFocusMode(): boolean {
    return this.settings.focusMode.enabled;
  }
  
  shouldNotify(priority: ScheduledNotification['priority']): boolean {
    if (!this.settings.enabled) return false;
    
    // Always allow urgent if configured
    if (priority === 'urgent' && this.settings.focusMode.allowUrgent) {
      return true;
    }
    
    // Check focus mode
    if (this.isFocusMode()) return false;
    
    // Check quiet hours
    if (this.isQuietHours()) return false;
    
    return true;
  }
  
  getOptimalNotificationTime(preferredTime: Date): Date {
    if (!this.settings.intelligentTiming.enabled) {
      return preferredTime;
    }
    
    // If in quiet hours, delay to end of quiet hours
    if (this.isQuietHours()) {
      const endTime = this.settings.quietHours.end.split(':');
      const adjusted = new Date(preferredTime);
      adjusted.setHours(parseInt(endTime[0]), parseInt(endTime[1]), 0, 0);
      
      // If end time is earlier than start, it's next day
      if (adjusted < preferredTime) {
        adjusted.setDate(adjusted.getDate() + 1);
      }
      
      return adjusted;
    }
    
    return preferredTime;
  }
  
  async send(
    title: string,
    body: string,
    priority: ScheduledNotification['priority'] = 'medium',
    options: NotificationOptions = {}
  ): Promise<boolean> {
    if (!this.shouldNotify(priority)) {
      return false;
    }
    
    if (!this.permissionGranted) {
      await this.checkPermission();
    }
    
    if (!this.permissionGranted) {
      return false;
    }
    
    const priorityConfig = this.settings.priorities[priority];
    
    try {
      const notification = new Notification(title, {
        body,
        icon: '/assets/logo.png',
        badge: '/assets/favicon-192.png',
        tag: options.tag || `daylume-${Date.now()}`,
        requireInteraction: priorityConfig.persistent,
        silent: priorityConfig.sound === 'silent',
        ...options
      });
      
      // Vibrate if supported and configured
      if (priorityConfig.vibrate && 'vibrate' in navigator) {
        navigator.vibrate(priority === 'urgent' ? [200, 100, 200] : [100]);
      }
      
      // Record in history
      notificationHistoryStore.record({
        title,
        body,
        sentAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }
  
  // Schedule notifications for tasks
  scheduleTaskReminder(task: { id: string; title: string; dueDate: string; dueTime?: string; priority: string }) {
    if (!this.settings.taskReminders.enabled) return;
    
    const dueDateTime = new Date(`${task.dueDate}T${task.dueTime || '09:00'}`);
    const reminderTime = new Date(dueDateTime.getTime() - this.settings.taskReminders.defaultBefore * 60000);
    
    if (reminderTime > new Date()) {
      scheduledNotificationsStore.schedule({
        title: 'Task Reminder',
        body: `"${task.title}" is due in ${this.settings.taskReminders.defaultBefore} minutes`,
        scheduledTime: this.getOptimalNotificationTime(reminderTime),
        priority: task.priority as ScheduledNotification['priority'],
        type: 'task',
        relatedId: task.id
      });
    }
  }
  
  // Schedule notifications for events
  scheduleEventReminder(event: { id: string; title: string; date: string; time: string }) {
    if (!this.settings.eventReminders.enabled) return;
    
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    
    this.settings.eventReminders.defaultBefore.forEach(minutes => {
      const reminderTime = new Date(eventDateTime.getTime() - minutes * 60000);
      
      if (reminderTime > new Date()) {
        scheduledNotificationsStore.schedule({
          title: 'Event Reminder',
          body: `"${event.title}" starts in ${minutes} minutes`,
          scheduledTime: this.getOptimalNotificationTime(reminderTime),
          priority: 'medium',
          type: 'event',
          relatedId: event.id
        });
      }
    });
  }
  
  // Check and send scheduled notifications
  async processScheduledNotifications() {
    const notifications = get(scheduledNotificationsStore);
    const now = new Date();
    
    for (const notification of notifications) {
      if (notification.sent || notification.dismissed) continue;
      
      if (new Date(notification.scheduledTime) <= now) {
        const sent = await this.send(
          notification.title,
          notification.body,
          notification.priority
        );
        
        if (sent) {
          scheduledNotificationsStore.markSent(notification.id);
        }
      }
    }
  }
}

// Singleton instance
let smartNotificationManager: SmartNotificationManager | null = null;

export function getSmartNotificationManager(): SmartNotificationManager {
  if (!smartNotificationManager && browser) {
    smartNotificationManager = new SmartNotificationManager();
  }
  return smartNotificationManager!;
}

// Location-based reminders (requires geolocation permission)
export class LocationReminderService {
  private watchId: number | null = null;
  private settings: NotificationSettings;
  private notificationManager: SmartNotificationManager;
  
  constructor() {
    this.settings = get(notificationSettingsStore);
    notificationSettingsStore.subscribe(s => this.settings = s);
    this.notificationManager = getSmartNotificationManager();
  }
  
  start() {
    if (!browser || !('geolocation' in navigator)) return;
    if (!this.settings.locationReminders.enabled) return;
    
    this.watchId = navigator.geolocation.watchPosition(
      position => this.checkLocations(position),
      error => console.error('Geolocation error:', error),
      { enableHighAccuracy: true, maximumAge: 60000 }
    );
  }
  
  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
  
  private checkLocations(position: GeolocationPosition) {
    const { latitude, longitude } = position.coords;
    
    for (const location of this.settings.locationReminders.locations) {
      if (!location.enabled) continue;
      
      const distance = this.calculateDistance(
        latitude, longitude,
        location.latitude, location.longitude
      );
      
      const isInside = distance <= location.radius;
      
      // TODO: Track previous state to detect enter/exit
      if (isInside && (location.triggerOn === 'enter' || location.triggerOn === 'both')) {
        this.notificationManager.send(
          `📍 ${location.name}`,
          `You have ${location.tasks.length} tasks to complete here`,
          'medium'
        );
      }
    }
  }
  
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}
