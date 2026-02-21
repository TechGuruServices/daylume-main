// Haptic Feedback Utility for Mobile
// Uses the Vibration API where available

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const hapticPatterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 30,
    heavy: 50,
    success: [30, 50, 30],
    warning: [50, 30, 50],
    error: [100, 50, 100, 50, 100],
    selection: 15
};

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
    if (typeof navigator === 'undefined') return false;
    return 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback
 * @param type - The type of haptic feedback
 */
export function haptic(type: HapticType = 'light'): void {
    if (!isHapticSupported()) return;
    
    const pattern = hapticPatterns[type];
    navigator.vibrate(pattern);
}

/**
 * Trigger a custom vibration pattern
 * @param pattern - Array of vibration and pause durations in ms
 */
export function hapticPattern(pattern: number[]): void {
    if (!isHapticSupported()) return;
    navigator.vibrate(pattern);
}

/**
 * Stop any ongoing vibration
 */
export function hapticStop(): void {
    if (!isHapticSupported()) return;
    navigator.vibrate(0);
}

/**
 * Haptic feedback for common UI actions
 */
export const hapticFeedback = {
    tap: () => haptic('light'),
    press: () => haptic('medium'),
    longPress: () => haptic('heavy'),
    success: () => haptic('success'),
    warning: () => haptic('warning'),
    error: () => haptic('error'),
    selection: () => haptic('selection'),
    swipe: () => haptic('light'),
    toggle: () => haptic('selection'),
    delete: () => haptic('warning'),
    complete: () => haptic('success'),
    notification: () => hapticPattern([100, 50, 100])
};
