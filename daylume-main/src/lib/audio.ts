// Audio System for Daylume
// Generates sounds using Web Audio API (no external files needed)

import { browser } from '$app/environment';

export type SoundType = 'notification' | 'alarm' | 'timer' | 'success' | 'error' | 'gentle' | 'chime' | 'bell' | 'alert' | 'urgent';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (!browser) return null;
    
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume if suspended (required after user interaction on mobile)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    return audioContext;
}

// Unlock audio on first user interaction (required for iOS)
export function unlockAudio(): void {
    if (!browser) return;
    
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume();
    }
}

// Initialize audio on user interaction
if (browser) {
    const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown'];
    const unlock = () => {
        unlockAudio();
        unlockEvents.forEach(event => document.removeEventListener(event, unlock));
    };
    unlockEvents.forEach(event => document.addEventListener(event, unlock, { once: true }));
}

interface SoundConfig {
    frequencies: number[];
    duration: number;
    type: OscillatorType;
    pattern?: number[]; // For repeating sounds
    volume?: number;
}

const soundConfigs: Record<SoundType, SoundConfig> = {
    notification: {
        frequencies: [880, 1100],
        duration: 0.15,
        type: 'sine',
        volume: 0.3
    },
    alarm: {
        frequencies: [800, 1000, 800, 1000],
        duration: 0.25,
        type: 'square',
        pattern: [1, 0.1, 1, 0.1, 1, 0.5], // Play 3 times with pauses
        volume: 0.5
    },
    timer: {
        frequencies: [523, 659, 784, 1047], // C E G C (major chord arpeggio)
        duration: 0.2,
        type: 'sine',
        pattern: [1, 0.1, 1, 0.1, 1, 0.1, 1],
        volume: 0.4
    },
    success: {
        frequencies: [523, 659, 784], // C E G
        duration: 0.15,
        type: 'sine',
        volume: 0.25
    },
    error: {
        frequencies: [200, 150],
        duration: 0.2,
        type: 'sawtooth',
        volume: 0.3
    },
    gentle: {
        frequencies: [440, 550],
        duration: 0.3,
        type: 'sine',
        volume: 0.15
    },
    chime: {
        frequencies: [1047, 1319, 1568], // High C E G
        duration: 0.4,
        type: 'sine',
        volume: 0.2
    },
    bell: {
        frequencies: [880, 1100, 1320],
        duration: 0.5,
        type: 'sine',
        volume: 0.25
    },
    alert: {
        frequencies: [800, 600, 800, 600],
        duration: 0.15,
        type: 'square',
        volume: 0.35
    },
    urgent: {
        frequencies: [1000, 500, 1000, 500, 1000],
        duration: 0.12,
        type: 'square',
        pattern: [1, 0.08, 1, 0.08, 1, 0.2, 1, 0.08, 1, 0.08, 1],
        volume: 0.5
    }
};

export function playSound(type: SoundType): void {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const config = soundConfigs[type];
    if (!config) return;
    
    playTone(ctx, config);
}

function playTone(ctx: AudioContext, config: SoundConfig): void {
    const { frequencies, duration, type, volume = 0.3, pattern } = config;
    
    if (pattern) {
        // Play pattern sequence
        let time = ctx.currentTime;
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === 1) {
                playFrequencySequence(ctx, frequencies, duration, type, volume, time);
            }
            time += pattern[i] * duration * frequencies.length + 0.05;
        }
    } else {
        playFrequencySequence(ctx, frequencies, duration, type, volume, ctx.currentTime);
    }
}

function playFrequencySequence(
    ctx: AudioContext,
    frequencies: number[],
    duration: number,
    type: OscillatorType,
    volume: number,
    startTime: number
): void {
    frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = type;
        
        const noteStart = startTime + index * duration;
        const noteEnd = noteStart + duration;
        
        // Envelope for smooth sound
        gainNode.gain.setValueAtTime(0, noteStart);
        gainNode.gain.linearRampToValueAtTime(volume, noteStart + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, noteEnd);
        
        oscillator.start(noteStart);
        oscillator.stop(noteEnd + 0.1);
    });
}

// Continuous alarm sound that can be stopped
let activeAlarm: { oscillators: OscillatorNode[]; gainNode: GainNode; interval: number } | null = null;

export function startAlarmSound(): void {
    stopAlarmSound(); // Stop any existing alarm
    
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const playAlarmCycle = () => {
        playSound('alarm');
    };
    
    // Play immediately and repeat
    playAlarmCycle();
    const interval = window.setInterval(playAlarmCycle, 2000);
    
    activeAlarm = {
        oscillators: [],
        gainNode: ctx.createGain(),
        interval
    };
}

export function stopAlarmSound(): void {
    if (activeAlarm) {
        clearInterval(activeAlarm.interval);
        activeAlarm.oscillators.forEach(osc => {
            try { osc.stop(); } catch (e) {}
        });
        activeAlarm = null;
    }
}

// Timer completion sound (plays longer celebratory sound)
export function playTimerComplete(): void {
    playSound('timer');
    
    // Play a second time after a delay for emphasis
    setTimeout(() => playSound('success'), 800);
}

// Alarm ring sound
export function playAlarmRing(): void {
    startAlarmSound();
    
    // Auto-stop after 30 seconds if not dismissed
    setTimeout(() => stopAlarmSound(), 30000);
}

// Check if audio is supported
export function isAudioSupported(): boolean {
    if (!browser) return false;
    return !!(window.AudioContext || (window as any).webkitAudioContext);
}

// Volume control
let globalVolume = 1.0;

export function setVolume(volume: number): void {
    globalVolume = Math.max(0, Math.min(1, volume));
    if (browser) {
        localStorage.setItem('daylume_audio_volume', String(globalVolume));
    }
}

export function getVolume(): number {
    if (browser) {
        const saved = localStorage.getItem('daylume_audio_volume');
        if (saved) {
            globalVolume = parseFloat(saved);
        }
    }
    return globalVolume;
}

// Mute control
let isMuted = false;

export function setMuted(muted: boolean): void {
    isMuted = muted;
    if (browser) {
        localStorage.setItem('daylume_audio_muted', String(muted));
    }
}

export function getMuted(): boolean {
    if (browser) {
        const saved = localStorage.getItem('daylume_audio_muted');
        if (saved) {
            isMuted = saved === 'true';
        }
    }
    return isMuted;
}

// Test sound
export function testSound(type: SoundType = 'notification'): void {
    if (!getMuted()) {
        playSound(type);
    }
}
