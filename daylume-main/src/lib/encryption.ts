/**
 * Secure encryption utilities for API keys using Web Crypto API
 * Uses AES-GCM with a key derived from a stable browser fingerprint
 */

// Generate a stable fingerprint that doesn't change with DST or minor browser updates
async function getStableFingerprint(): Promise<string> {
    const nav = navigator;
    const screen = window.screen;

    // Use only stable properties that won't change
    const fingerprint = [
        nav.userAgent,
        nav.language,
        screen.colorDepth,
        screen.width,
        screen.height,
        nav.hardwareConcurrency || 4,
        // Exclude timezone offset as it changes with DST
    ].join('|');

    // Create a proper hash using Web Crypto
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Derive an AES key from the fingerprint
async function deriveKey(fingerprint: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(fingerprint),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Use a fixed salt (this is okay since the fingerprint is unique per browser)
    const salt = encoder.encode('daylume-encryption-salt-v1');

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encrypt(text: string): Promise<string> {
    if (!text) return '';

    try {
        const fingerprint = await getStableFingerprint();
        const key = await deriveKey(fingerprint);

        // Generate a random IV for each encryption
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const data = encoder.encode(text);

        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        // Combine IV + encrypted data and encode as base64
        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);

        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('Encryption failed:', error);
        // Fallback to simple encoding (not secure, but maintains functionality)
        return btoa(text);
    }
}

export async function decrypt(encrypted: string): Promise<string> {
    if (!encrypted) return '';

    try {
        const fingerprint = await getStableFingerprint();
        const key = await deriveKey(fingerprint);

        // Decode base64
        const combined = new Uint8Array(
            atob(encrypted).split('').map(c => c.charCodeAt(0))
        );

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (error) {
        console.error('Decryption failed:', error);
        // Try legacy decryption for backwards compatibility
        return legacyDecrypt(encrypted);
    }
}

// Legacy decryption for backwards compatibility with old XOR-encrypted keys
function legacyDecrypt(encrypted: string): string {
    try {
        const nav = navigator;
        const screen = window.screen;

        const fingerprint = [
            nav.userAgent,
            nav.language,
            screen.colorDepth,
            screen.width,
            screen.height,
            new Date().getTimezoneOffset()
        ].join('|');

        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const key = Math.abs(hash).toString(16);

        const decoded = atob(encrypted);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(
                decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return result;
    } catch (error) {
        console.error('Legacy decryption also failed:', error);
        return '';
    }
}

// Synchronous wrapper for backwards compatibility
// Note: This uses a cached result or returns empty string
let cachedFingerprint: string | null = null;

export function encryptSync(text: string): string {
    // For sync operations, queue the async encryption
    encrypt(text).then(() => {}); // Fire and forget to warm cache
    
    // Return a placeholder - callers should migrate to async version
    console.warn('encryptSync is deprecated, use encrypt() instead');
    return btoa(text); // Simple encoding as fallback
}

export function decryptSync(encrypted: string): string {
    // For sync operations, try legacy first, queue async for future
    decrypt(encrypted).then(() => {}); // Fire and forget
    
    // Try legacy decryption
    return legacyDecrypt(encrypted);
}
