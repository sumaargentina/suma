"use client";

import { supabase, clearStaleSupabaseAuth } from './supabase';

export const auth = supabase.auth;

// Helper functions for authentication
export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw new Error(error.message);
    return data;
};

export const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata,
        },
    });

    if (error) throw new Error(error.message);
    return data;
};

export const signOut = async () => {
    try {
        await supabase.auth.signOut({ scope: 'local' });
    } catch {}
    clearStaleSupabaseAuth();
};

export const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw new Error(error.message);
};

export const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) throw new Error(error.message);
};

export const getCurrentUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            if (error.message?.includes('Refresh Token') || error.name === 'AuthApiError') {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                clearStaleSupabaseAuth();
                return null;
            }
            throw new Error(error.message);
        }
        return user;
    } catch (err: any) {
        if (err?.message?.includes('Refresh Token') || err?.name === 'AuthApiError') {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            clearStaleSupabaseAuth();
            return null;
        }
        throw err;
    }
};

export const getSession = async () => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            if (error.message?.includes('Refresh Token') || error.name === 'AuthApiError') {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                clearStaleSupabaseAuth();
                return null;
            }
            throw new Error(error.message);
        }
        return session;
    } catch (err: any) {
        if (err?.message?.includes('Refresh Token') || err?.name === 'AuthApiError') {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            clearStaleSupabaseAuth();
            return null;
        }
        throw err;
    }
};

