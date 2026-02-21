import { writable } from 'svelte/store';
import { supabase } from './supabase';
import type { UserProfile } from './types';

// Create a writable store for user profile
export const userStore = writable<UserProfile | null>(null);

// Function to update user profile
export async function updateProfile(newProfile: Partial<UserProfile>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update local store immediately for UI responsiveness
    userStore.update(current => {
        if (!current) return null;
        return { ...current, ...newProfile };
    });

    // Update Supabase
    const { error } = await supabase
        .from('profiles')
        .update({
            name: newProfile.name,
            bio: newProfile.bio,
            avatar: newProfile.avatar
        })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
    }
}


