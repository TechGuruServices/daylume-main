import { writable } from 'svelte/store';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
}

export const toasts = writable<Toast[]>([]);

export function showToast(type: Toast['type'], message: string, duration = 3000) {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, type, message, duration };

    toasts.update(t => [...t, toast]);

    if (duration > 0) {
        setTimeout(() => {
            toasts.update(t => t.filter(toast => toast.id !== id));
        }, duration);
    }
}
