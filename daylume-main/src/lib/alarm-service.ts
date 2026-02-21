/**
 * Alarm Service for Daylume
 * Provides reliable alarm functionality with:
 * - Web Worker for background timing
 * - Wake Lock API to prevent device sleep during alarms
 * - Visibility API to detect when app is backgrounded
 * - Service Worker notifications for when app is closed
 */

import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';
import type { Alarm } from './types';
import { getAlarms, updateAlarm, addAlarm as addAlarmToStorage } from './storage';
import { playAlarmRing, stopAlarmSound, playSound } from './audio';
import { showNotification, hasNotificationPermission } from './notifications';
import { showToast } from './toast';

// Store for the currently ringing alarm
export const ringingAlarm = writable<Alarm | null>(null);
export const showAlarmModal = writable(false);

// Wake Lock sentinel
let wakeLock: WakeLockSentinel | null = null;

// Worker for background timing
let alarmWorker: Worker | null = null;

// Last checked minute to prevent duplicate triggers
let lastCheckedMinute = '';

// Alarm check interval for fallback
let alarmCheckInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize the alarm service
 * Call this once when the app starts
 */
export function initAlarmService(): void {
    if (!browser) return;
    
    console.log('🔔 Initializing Alarm Service...');
    
    // Try to use a Web Worker for more reliable timing
    initAlarmWorker();
    
    // Fallback interval-based checking
    startAlarmChecker();
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for page focus
    window.addEventListener('focus', handleWindowFocus);
    
    // Register for periodic background sync if available
    registerBackgroundSync();
    
    // Request persistent storage for alarms
    requestPersistentStorage();
    
    console.log('✅ Alarm Service initialized');
}

/**
 * Clean up the alarm service
 */
export function destroyAlarmService(): void {
    if (!browser) return;
    
    if (alarmCheckInterval) {
        clearInterval(alarmCheckInterval);
        alarmCheckInterval = null;
    }
    
    if (alarmWorker) {
        alarmWorker.terminate();
        alarmWorker = null;
    }
    
    releaseWakeLock();
    
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);
    
    stopAlarmSound();
}

/**
 * Initialize Web Worker for background timing
 */
function initAlarmWorker(): void {
    try {
        // Create an inline worker for timing
        const workerCode = `
            let intervalId = null;
            
            self.onmessage = function(e) {
                if (e.data === 'start') {
                    if (intervalId) clearInterval(intervalId);
                    intervalId = setInterval(() => {
                        self.postMessage('tick');
                    }, 10000); // Check every 10 seconds
                } else if (e.data === 'stop') {
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                }
            };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        alarmWorker = new Worker(URL.createObjectURL(blob));
        
        alarmWorker.onmessage = () => {
            checkAlarms();
        };
        
        alarmWorker.postMessage('start');
        console.log('📦 Alarm Worker started');
    } catch (error) {
        console.warn('Web Worker not available, using interval fallback:', error);
    }
}

/**
 * Start the fallback interval-based alarm checker
 */
function startAlarmChecker(): void {
    if (alarmCheckInterval) {
        clearInterval(alarmCheckInterval);
    }
    
    // Check immediately
    checkAlarms();
    
    // Then check every 10 seconds
    alarmCheckInterval = setInterval(checkAlarms, 10000);
}

/**
 * Check all alarms and trigger if needed
 */
export function checkAlarms(): void {
    if (!browser) return;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();
    
    // Prevent checking the same minute twice
    if (currentTime === lastCheckedMinute) return;
    lastCheckedMinute = currentTime;
    
    const alarms = getAlarms();
    
    for (const alarm of alarms) {
        if (!alarm.enabled) continue;
        if (alarm.time !== currentTime) continue;
        
        let shouldRing = false;
        
        switch (alarm.repeat) {
            case 'none':
                shouldRing = true;
                break;
            case 'daily':
                shouldRing = true;
                break;
            case 'weekdays':
                shouldRing = currentDay >= 1 && currentDay <= 5;
                break;
            case 'weekends':
                shouldRing = currentDay === 0 || currentDay === 6;
                break;
            case 'custom':
                shouldRing = alarm.customDays?.includes(currentDay) || false;
                break;
        }
        
        if (shouldRing) {
            triggerAlarm(alarm);
            break; // Only trigger one alarm at a time
        }
    }
}

/**
 * Trigger an alarm
 */
async function triggerAlarm(alarm: Alarm): Promise<void> {
    console.log('⏰ Triggering alarm:', alarm.label || alarm.time);
    
    // Acquire wake lock to keep screen on
    await acquireWakeLock();
    
    // Update stores
    ringingAlarm.set(alarm);
    showAlarmModal.set(true);
    
    // Play alarm sound
    playAlarmRing();
    
    // Show browser notification
    if (hasNotificationPermission()) {
        showNotification({
            title: '⏰ Alarm!',
            body: alarm.label || 'Time to wake up!',
            requireInteraction: true,
            tag: `alarm-${alarm.id}`
        });
    }
    
    // If it's a one-time alarm, disable it
    if (alarm.repeat === 'none') {
        updateAlarm(alarm.id, { enabled: false });
    }
    
    // Auto-dismiss after 60 seconds if not manually dismissed
    setTimeout(() => {
        const current = get(ringingAlarm);
        if (current && current.id === alarm.id) {
            dismissAlarm();
        }
    }, 60000);
}

/**
 * Dismiss the currently ringing alarm
 */
export function dismissAlarm(): void {
    stopAlarmSound();
    showAlarmModal.set(false);
    ringingAlarm.set(null);
    releaseWakeLock();
    playSound('success');
}

/**
 * Snooze the currently ringing alarm
 */
export function snoozeAlarm(snoozeMinutes: number = 5): void {
    const current = get(ringingAlarm);
    if (!current) return;
    
    stopAlarmSound();
    showAlarmModal.set(false);
    
    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + snoozeMinutes);
    const snoozeTimeStr = `${snoozeTime.getHours().toString().padStart(2, '0')}:${snoozeTime.getMinutes().toString().padStart(2, '0')}`;
    
    // Create a temporary snooze alarm
    const snoozeAlarm: Alarm = {
        id: `snooze-${Date.now()}`,
        time: snoozeTimeStr,
        label: `${current.label || 'Alarm'} (Snoozed)`,
        enabled: true,
        repeat: 'none',
        createdAt: new Date().toISOString()
    };
    
    addAlarmToStorage(snoozeAlarm);
    
    showToast('info', `Snoozed until ${snoozeTimeStr}`);
    playSound('gentle');
    
    ringingAlarm.set(null);
    releaseWakeLock();
}

/**
 * Acquire wake lock to prevent device sleep during alarm
 */
async function acquireWakeLock(): Promise<void> {
    if (!browser || !('wakeLock' in navigator)) {
        console.log('Wake Lock API not supported');
        return;
    }
    
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('🔒 Wake Lock acquired');
        
        wakeLock.addEventListener('release', () => {
            console.log('🔓 Wake Lock released');
        });
    } catch (error) {
        console.warn('Failed to acquire Wake Lock:', error);
    }
}

/**
 * Release wake lock
 */
function releaseWakeLock(): void {
    if (wakeLock) {
        wakeLock.release().catch(console.warn);
        wakeLock = null;
    }
}

/**
 * Handle visibility change (app going to background)
 */
function handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
        // App became visible - check alarms immediately
        lastCheckedMinute = ''; // Reset to allow immediate check
        checkAlarms();
        
        // Restart worker if needed
        if (alarmWorker) {
            alarmWorker.postMessage('start');
        }
    } else {
        // App going to background
        // Schedule a notification through service worker if possible
        scheduleServiceWorkerCheck();
    }
}

/**
 * Handle window focus
 */
function handleWindowFocus(): void {
    // Reset and check immediately
    lastCheckedMinute = '';
    checkAlarms();
}

/**
 * Register for periodic background sync
 */
async function registerBackgroundSync(): Promise<void> {
    if (!browser || !('serviceWorker' in navigator) || !('SyncManager' in window)) {
        return;
    }
    
    try {
        const registration = await navigator.serviceWorker.ready;
        
        // Check if periodicSync is available
        if ('periodicSync' in registration) {
            const status = await navigator.permissions.query({
                name: 'periodic-background-sync' as PermissionName,
            });
            
            if (status.state === 'granted') {
                await (registration as any).periodicSync.register('check-alarms', {
                    minInterval: 60 * 1000, // 1 minute minimum
                });
                console.log('📡 Periodic background sync registered');
            }
        }
    } catch (error) {
        console.log('Periodic background sync not available:', error);
    }
}

/**
 * Schedule a service worker check for alarms
 */
async function scheduleServiceWorkerCheck(): Promise<void> {
    if (!browser || !('serviceWorker' in navigator)) return;
    
    try {
        const registration = await navigator.serviceWorker.ready;
        
        // Send message to service worker to schedule alarm checks
        if (registration.active) {
            const alarms = getAlarms().filter(a => a.enabled);
            registration.active.postMessage({
                type: 'SCHEDULE_ALARM_CHECKS',
                alarms: alarms.map(a => ({
                    id: a.id,
                    time: a.time,
                    label: a.label,
                    repeat: a.repeat,
                    customDays: a.customDays
                }))
            });
        }
    } catch (error) {
        console.warn('Failed to schedule service worker check:', error);
    }
}

/**
 * Request persistent storage for alarm data
 */
async function requestPersistentStorage(): Promise<void> {
    if (!browser || !navigator.storage?.persist) return;
    
    try {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
            const granted = await navigator.storage.persist();
            console.log(`📦 Persistent storage ${granted ? 'granted' : 'denied'}`);
        }
    } catch (error) {
        console.warn('Persistent storage request failed:', error);
    }
}

/**
 * Get the next alarm that will ring
 */
export function getNextAlarm(): { alarm: Alarm; timeUntil: string } | null {
    if (!browser) return null;
    
    const alarms = getAlarms().filter(a => a.enabled);
    if (alarms.length === 0) return null;
    
    const now = new Date();
    const currentDay = now.getDay();
    
    let nearestAlarm: Alarm | null = null;
    let nearestMs = Infinity;
    
    for (const alarm of alarms) {
        const [hours, minutes] = alarm.time.split(':').map(Number);
        const alarmDate = new Date(now);
        alarmDate.setHours(hours, minutes, 0, 0);
        
        // Check if alarm should ring today
        let shouldRingToday = false;
        switch (alarm.repeat) {
            case 'none':
            case 'daily':
                shouldRingToday = true;
                break;
            case 'weekdays':
                shouldRingToday = currentDay >= 1 && currentDay <= 5;
                break;
            case 'weekends':
                shouldRingToday = currentDay === 0 || currentDay === 6;
                break;
            case 'custom':
                shouldRingToday = alarm.customDays?.includes(currentDay) || false;
                break;
        }
        
        if (shouldRingToday && alarmDate > now) {
            const diff = alarmDate.getTime() - now.getTime();
            if (diff < nearestMs) {
                nearestMs = diff;
                nearestAlarm = alarm;
            }
        }
    }
    
    if (!nearestAlarm) return null;
    
    // Format time until
    const hours = Math.floor(nearestMs / (1000 * 60 * 60));
    const mins = Math.floor((nearestMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeUntil = '';
    if (hours > 0) {
        timeUntil = `${hours}h ${mins}m`;
    } else if (mins > 0) {
        timeUntil = `${mins}m`;
    } else {
        timeUntil = 'less than 1m';
    }
    
    return { alarm: nearestAlarm, timeUntil };
}
