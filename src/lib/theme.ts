import { writable } from 'svelte/store';
import { getThemeSettings, saveThemeSettings } from './storage';
import type { ThemeSettings, VisualTheme } from './types';

// Create a writable store for theme settings
export const themeStore = writable<ThemeSettings>(getThemeSettings());

// Helper to convert hex to space-separated RGB
function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : "0 0 0";
}

// Function to apply theme to the document
export function applyTheme(theme: ThemeSettings) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Colors
    root.style.setProperty("--primary", hexToRgb(theme.primaryColor));
    root.style.setProperty("--secondary", hexToRgb(theme.secondaryColor));
    root.style.setProperty("--accent", hexToRgb(theme.accentColor));

    // Other settings
    root.style.setProperty("--animation-speed", `${20 - theme.animationSpeed * 2}s`);
    root.style.setProperty("--border-radius", `${theme.borderRadius}px`);
    root.style.setProperty("--glass-opacity", `${theme.glassIntensity / 100}`);
    
    // Visual theme class on body
    root.setAttribute('data-visual-theme', theme.visualTheme || 'default');

    document.body.style.fontFamily = theme.fontFamily;
}

// Initialize theme (call this in root layout)
export function initTheme() {
    const settings = getThemeSettings();
    // Ensure visualTheme has a default value
    if (!settings.visualTheme) {
        settings.visualTheme = 'default';
    }
    themeStore.set(settings);
    // Subscribe to changes to persist and apply theme
    themeStore.subscribe(settings => {
        if (!settings) return;
        saveThemeSettings(settings);
        applyTheme(settings);
    });
}

// Function to update theme
export function updateTheme(newSettings: Partial<ThemeSettings>) {
    themeStore.update(current => ({ ...current, ...newSettings }));
}
