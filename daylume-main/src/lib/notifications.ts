import { writable, get } from 'svelte/store';
import { supabase } from './supabase';
import { browser } from '$app/environment';
import { playSound, playAlarmRing } from './audio';

// --- Types ---
export interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    type: 'event' | 'alarm' | 'task';
    read: boolean;
    href: string;
}

export interface NotificationOptions {
    title: string;
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
}

// --- Store ---
export const notifications = writable<Notification[]>([]);

// Track which notifications we've already shown to avoid spam
const shownNotificationIds = new Set<string>();

// --- Browser Notification Logic ---
export async function requestNotificationPermission(): Promise<boolean> {
    if (!browser) return false;
    
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

export function hasNotificationPermission(): boolean {
    if (!browser) return false;
    return 'Notification' in window && Notification.permission === 'granted';
}

export function showNotification(options: NotificationOptions): void {
    if (!hasNotificationPermission()) {
        return;
    }

    try {
        const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/assets/logo.png',
            badge: '/assets/favicon-192.png',
            tag: options.tag || `daylume-${Date.now()}`,
            requireInteraction: options.requireInteraction || false,
            silent: false
        });

        // Play sound with the notification
        playSound('notification');

        // Auto-close after 10 seconds if not interactive
        if (!options.requireInteraction) {
            setTimeout(() => notification.close(), 10000);
        }

        // Handle notification click
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

export function playAlarmSound(): void {
    playAlarmRing();
}

// --- In-App Logic ---

export async function checkNotifications() {
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const todayStr = now.toISOString().split('T')[0];

    const currentNotifications: Notification[] = [];

    try {
        // Check Events (next 30 mins) from Supabase
        const { data: events } = await supabase
            .from('events')
            .select('*')
            .eq('date', todayStr)
            .not('time', 'is', null);

        if (events) {
            events.forEach(event => {
                if (!event.time) return;
                
                const eventDate = new Date(`${event.date}T${event.time}`);
                if (eventDate > now && eventDate <= thirtyMinutesFromNow) {
                    const id = `evt-${event.id}`;
                    currentNotifications.push({
                        id,
                        title: 'Upcoming Event',
                        message: `${event.title} starts at ${event.time}`,
                        time: event.time,
                        type: 'event',
                        read: false,
                        href: '/calendar'
                    });
                }
            });
        }

        // Check Alarms (matching current time) from Supabase
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;

        const { data: alarms } = await supabase
            .from('alarms')
            .select('*')
            .eq('enabled', true)
            .eq('time', currentTime);

        if (alarms) {
            alarms.forEach(alarm => {
                const id = `alm-${alarm.id}-${currentTime}`;
                
                // Only show if we haven't shown this alarm notification yet
                if (!shownNotificationIds.has(id)) {
                    currentNotifications.push({
                        id,
                        title: 'Alarm',
                        message: alarm.label || 'Alarm ringing!',
                        time: alarm.time,
                        type: 'alarm',
                        read: false,
                        href: '/alarms'
                    });

                    // Trigger browser notification and sound for new alarms
                    if (hasNotificationPermission()) {
                        showNotification({
                            title: 'Alarm',
                            body: alarm.label || 'Alarm ringing!',
                            requireInteraction: true
                        });
                    }
                    playAlarmSound();
                    shownNotificationIds.add(id);
                }
            });
        }

        // Check Tasks due soon from Supabase
        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('due_date', todayStr)
            .neq('status', 'completed');

        if (tasks) {
            tasks.forEach(task => {
                if (!task.due_time) return;
                
                const taskDate = new Date(`${task.due_date}T${task.due_time}`);
                if (taskDate > now && taskDate <= thirtyMinutesFromNow) {
                    const id = `task-${task.id}`;
                    currentNotifications.push({
                        id,
                        title: 'Task Due Soon',
                        message: `${task.title} is due at ${task.due_time}`,
                        time: task.due_time,
                        type: 'event',
                        read: false,
                        href: '/tasks'
                    });
                }
            });
        }

    } catch (error) {
        console.error('Error checking notifications:', error);
    }

    notifications.set(currentNotifications);
}

export function markAsRead(id: string) {
    notifications.update(n => n.filter(item => item.id !== id));
    shownNotificationIds.add(id);
}

export function clearAllNotifications() {
    const current = get(notifications);
    current.forEach(n => shownNotificationIds.add(n.id));
    notifications.set([]);
}
