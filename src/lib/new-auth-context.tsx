/**
 * =====================================================
 * NEW AUTH CONTEXT PROVIDER - SUPABASE
 * =====================================================
 * Context Provider actualizado para usar Supabase Auth
 * Reemplaza el contexto anterior basado en Firebase
 * 
 * @version 2.0.0
 * @date 2025-12-14
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService, type UserProfile } from './auth-service';
import type { Session } from '@supabase/supabase-js';

// =====================================================
// TYPES
// =====================================================

interface AuthContextType {
    user: UserProfile | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Auth methods
    signUp: (data: any) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signInWithMagicLink: (email: string) => Promise<{ error: any }>;
    signInWithGoogle: () => Promise<{ error: any }>;
    signInWithFacebook: () => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: any }>;
    updatePassword: (newPassword: string) => Promise<{ error: any }>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
    refreshSession: () => Promise<void>;

    // MFA methods
    enableMFA: () => Promise<{ qrCode: string | null; secret: string | null; error: any }>;
    verifyMFA: (code: string, factorId: string) => Promise<{ error: any }>;
}

// =====================================================
// CONTEXT
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// PROVIDER
// =====================================================

export function NewAuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // =====================================================
    // INITIALIZE AUTH STATE
    // =====================================================

    useEffect(() => {
        console.log('🔐 Initializing auth context...');

        // Get initial session
        authService.getSession().then(({ session, user }) => {
            console.log('📊 Initial session:', session ? 'Found' : 'None');
            setSession(session);
            setUser(user);
            setIsLoading(false);
        });

        // Subscribe to auth changes
        const { data: { subscription } } = authService.onAuthStateChange((user, session) => {
            console.log('🔄 Auth state changed:', user ? `User ${user.email}` : 'No user');
            setUser(user);
            setSession(session);
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // =====================================================
    // AUTH METHODS
    // =====================================================

    const signUp = useCallback(async (data: any) => {
        setIsLoading(true);
        try {
            const { user, session, error } = await authService.signUp(data);

            if (error) return { error };

            setUser(user);
            setSession(session);

            console.log('✅ Sign up successful');
            return { error: null };
        } catch (error) {
            console.error('❌ Sign up error:', error);
            return { error };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { user, session, error } = await authService.signIn({ email, password });

            if (error) return { error };

            setUser(user);
            setSession(session);

            console.log('✅ Sign in successful');
            return { error: null };
        } catch (error) {
            console.error('❌ Sign in error:', error);
            return { error };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signInWithMagicLink = useCallback(async (email: string) => {
        setIsLoading(true);
        try {
            const { error } = await authService.signInWithMagicLink(email);
            return { error };
        } catch (error) {
            console.error('❌ Magic link error:', error);
            return { error };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signInWithGoogle = useCallback(async () => {
        setIsLoading(true);
        try {
            const { error } = await authService.signInWithOAuth('google');
            return { error };
        } catch (error) {
            console.error('❌ Google sign in error:', error);
            return { error };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signInWithFacebook = useCallback(async () => {
        setIsLoading(true);
        try {
            const { error } = await authService.signInWithOAuth('facebook');
            return { error };
        } catch (error) {
            console.error('❌ Facebook sign in error:', error);
            return { error };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        setIsLoading(true);
        try {
            await authService.signOut();
            setUser(null);
            setSession(null);
            console.log('✅ Sign out successful');
            router.push('/');
        } catch (error) {
            console.error('❌ Sign out error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const resetPassword = useCallback(async (email: string) => {
        try {
            const { error } = await authService.resetPassword(email);
            return { error };
        } catch (error) {
            console.error('❌ Reset password error:', error);
            return { error };
        }
    }, []);

    const updatePassword = useCallback(async (newPassword: string) => {
        try {
            const { error } = await authService.updatePassword(newPassword);
            return { error };
        } catch (error) {
            console.error('❌ Update password error:', error);
            return { error };
        }
    }, []);

    const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
        if (!user) return { error: new Error('Not authenticated') };

        try {
            const { error } = await authService.updateProfile(user.id, updates);

            if (!error) {
                // Update local state
                setUser(prev => prev ? { ...prev, ...updates } : null);
            }

            return { error };
        } catch (error) {
            console.error('❌ Update profile error:', error);
            return { error };
        }
    }, [user]);

    const refreshSession = useCallback(async () => {
        try {
            const { session, user } = await authService.getSession();
            setSession(session);
            setUser(user);
        } catch (error) {
            console.error('❌ Refresh session error:', error);
        }
    }, []);

    const enableMFA = useCallback(async () => {
        try {
            return await authService.enableMFA();
        } catch (error) {
            console.error('❌ Enable MFA error:', error);
            return { qrCode: null, secret: null, error };
        }
    }, []);

    const verifyMFA = useCallback(async (code: string, factorId: string) => {
        try {
            return await authService.verifyMFA(code, factorId);
        } catch (error) {
            console.error('❌ Verify MFA error:', error);
            return { error };
        }
    }, []);

    // =====================================================
    // CONTEXT VALUE
    // =====================================================

    const value: AuthContextType = {
        user,
        session,
        isLoading,
        isAuthenticated: !!user && !!session,

        // Methods
        signUp,
        signIn,
        signInWithMagicLink,
        signInWithGoogle,
        signInWithFacebook,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        refreshSession,
        enableMFA,
        verifyMFA,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// =====================================================
// HOOK
// =====================================================

export function useNewAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useNewAuth must be used within NewAuthProvider');
    }

    return context;
}

// Export for convenience
export default NewAuthProvider;

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo: string = '/auth/login') {
    const { user, isLoading } = useNewAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push(redirectTo);
        }
    }, [user, isLoading, router, redirectTo]);

    return { user, isLoading };
}

/**
 * Hook to require specific role
 * Redirects if user doesn't have required role
 */
export function useRequireRole(
    allowedRoles: string | string[],
    redirectTo: string = '/'
) {
    const { user, isLoading } = useNewAuth();
    const router = useRouter();
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    useEffect(() => {
        if (!isLoading && user && !roles.includes(user.role)) {
            router.push(redirectTo);
        }
    }, [user, isLoading, router, redirectTo, roles]);

    return { user, isLoading };
}

/**
 * Hook para proteger rutas que requieren estar deslogueado
 * (ejemplo: login, register)
 */
export function useRequireGuest(redirectTo: string = '/dashboard') {
    const { user, isLoading } = useNewAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            router.push(redirectTo);
        }
    }, [user, isLoading, router, redirectTo]);

    return { isLoading };
}
