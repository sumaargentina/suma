/**
 * =====================================================
 * SUPABASE AUTH SERVICE - COMPLETO
 * =====================================================
 * Servicio de autenticación unificado con Supabase
 * 
 * Características:
 * - Magic Links (login sin contraseña)
 * - OAuth (Google, Facebook)
 * - Email/Password tradicional
 * - MFA (Two-Factor Authentication)
 * - Session management avanzado
 * - Audit logging
 * 
 * @version 1.0.0
 * @date 2025-12-14
 */

import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
import type { User, Session, AuthError, Provider } from '@supabase/supabase-js';

// =====================================================
// TYPES
// =====================================================

export type UserRole = 'patient' | 'doctor' | 'seller' | 'admin' | 'pharmacy' | 'laboratory';

export interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    phone?: string;
    avatarUrl?: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    mfaEnabled: boolean;
    provider?: string;
    createdAt: string;
    lastLoginAt?: string;
    // Role-specific IDs
    patientId?: string;
    doctorId?: string;
    sellerId?: string;
    pharmacyId?: string;
    laboratoryId?: string;
}

export interface SignUpData {
    email: string;
    password?: string; // Optional for magic links
    name: string;
    role: UserRole;
    phone?: string;
    metadata?: Record<string, any>;
}

export interface SignInData {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: UserProfile | null;
    session: Session | null;
    error: AuthError | null;
}

// =====================================================
// AUTH SERVICE CLASS
// =====================================================

class SupabaseAuthService {
    /**
     * Sign up with email and password
     */
    async signUp(data: SignUpData): Promise<AuthResponse> {
        try {
            console.log('🔐 Starting signup for:', data.email, 'role:', data.role);

            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password || this.generateTemporaryPassword(),
                options: {
                    data: {
                        name: data.name,
                        role: data.role,
                        phone: data.phone,
                        ...data.metadata,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('No user data returned');

            // Get the created user profile
            const profile = await this.getUserProfile(authData.user.id);

            // Log auth event
            await this.logAuthEvent(authData.user.id, 'signup', 'success');

            return {
                user: profile,
                session: authData.session,
                error: null,
            };
        } catch (error) {
            console.error('❌ Signup error:', error);
            await this.logAuthEvent(null, 'signup', 'failed', error instanceof Error ? error.message : String(error));

            return {
                user: null,
                session: null,
                error: error as AuthError,
            };
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(data: SignInData): Promise<AuthResponse> {
        try {
            console.log('🔐 Attempting signin for:', data.email);

            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (signInError) throw signInError;
            if (!authData.user) throw new Error('No user data returned');

            const profile = await this.getUserProfile(authData.user.id);

            // Create session record
            await this.createSessionRecord(authData.user.id, authData.session);

            // Log auth event
            await this.logAuthEvent(authData.user.id, 'login', 'success');

            return {
                user: profile,
                session: authData.session,
                error: null,
            };
        } catch (error) {
            console.error('❌ Signin error:', error);
            await this.logAuthEvent(null, 'login', 'failed', error instanceof Error ? error.message : String(error));

            return {
                user: null,
                session: null,
                error: error as AuthError,
            };
        }
    }

    /**
     * Sign in with Magic Link (passwordless)
     */
    async signInWithMagicLink(email: string): Promise<{ error: AuthError | null }> {
        try {
            console.log('✨ Sending magic link to:', email);

            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;

            await this.logAuthEvent(null, 'magic_link_sent', 'success', null, { email });

            return { error: null };
        } catch (error) {
            console.error('❌ Magic link error:', error);
            await this.logAuthEvent(null, 'magic_link_sent', 'failed', error instanceof Error ? error.message : String(error));

            return { error: error as AuthError };
        }
    }

    /**
     * Sign in with OAuth (Google, Facebook, etc.)
     */
    async signInWithOAuth(provider: Provider): Promise<{ error: AuthError | null }> {
        try {
            console.log('🔑 OAuth signin with:', provider);

            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;

            await this.logAuthEvent(null, `oauth_${provider}`, 'initiated');

            return { error: null };
        } catch (error) {
            console.error('❌ OAuth error:', error);
            await this.logAuthEvent(null, `oauth_${provider}`, 'failed', error instanceof Error ? error.message : String(error));

            return { error: error as AuthError };
        }
    }

    /**
     * Sign out
     */
    async signOut(): Promise<{ error: AuthError | null }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            if (user) {
                await this.logAuthEvent(user.id, 'logout', 'success');
            }

            return { error: null };
        } catch (error) {
            console.error('❌ Signout error:', error);
            return { error: error as AuthError };
        }
    }

    /**
     * Get current user profile
     */
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            if (!data) return null;

            return this.transformProfile(data);
        } catch (error) {
            console.error('❌ Error fetching user profile:', error);
            return null;
        }
    }

    /**
     * Get current session
     */
    async getSession(): Promise<{ session: Session | null; user: UserProfile | null }> {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) throw error;
            if (!session) return { session: null, user: null };

            const user = await this.getUserProfile(session.user.id);

            return { session, user };
        } catch (error) {
            console.error('❌ Error getting session:', error);
            return { session: null, user: null };
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ error: Error | null }> {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update(this.transformToSnakeCase(updates))
                .eq('id', userId);

            if (error) throw error;

            await this.logAuthEvent(userId, 'profile_update', 'success');

            return { error: null };
        } catch (error) {
            console.error('❌ Error updating profile:', error);
            return { error: error as Error };
        }
    }

    /**
     * Reset password
     */
    async resetPassword(email: string): Promise<{ error: AuthError | null }> {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) throw error;

            await this.logAuthEvent(null, 'password_reset_requested', 'success', null, { email });

            return { error: null };
        } catch (error) {
            console.error('❌ Password reset error:', error);
            return { error: error as AuthError };
        }
    }

    /**
     * Update password
     */
    async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            await this.logAuthEvent(user.id, 'password_changed', 'success');

            return { error: null };
        } catch (error) {
            console.error('❌ Password update error:', error);
            return { error: error as AuthError };
        }
    }

    /**
     * Enable MFA
     */
    async enableMFA(): Promise<{ qrCode: string | null; secret: string | null; error: Error | null }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
            });

            if (error) throw error;

            await this.logAuthEvent(user.id, 'mfa_enabled', 'success');

            return {
                qrCode: data.totp.qr_code,
                secret: data.totp.secret,
                error: null,
            };
        } catch (error) {
            console.error('❌ MFA enable error:', error);
            return { qrCode: null, secret: null, error: error as Error };
        }
    }

    /**
     * Verify MFA code
     */
    async verifyMFA(code: string, factorId: string): Promise<{ error: Error | null }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase.auth.mfa.verify({
                factorId,
                code,
            });

            if (error) throw error;

            await this.logAuthEvent(user.id, 'mfa_verified', 'success');

            return { error: null };
        } catch (error) {
            console.error('❌ MFA verify error:', error);
            return { error: error as Error };
        }
    }

    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange(callback: (user: UserProfile | null, session: Session | null) => void) {
        return supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state changed:', event);

            if (session?.user) {
                const profile = await this.getUserProfile(session.user.id);
                callback(profile, session);
            } else {
                callback(null, null);
            }
        });
    }

    // =====================================================
    // PRIVATE HELPER METHODS
    // =====================================================

    private generateTemporaryPassword(): string {
        return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    }

    private async createSessionRecord(userId: string, session: Session | null) {
        try {
            if (!session) return;

            const deviceInfo = this.getDeviceInfo();

            await supabase.from('user_sessions').insert({
                user_id: userId,
                device_info: deviceInfo,
                ip_address: await this.getIPAddress(),
                user_agent: navigator.userAgent,
                expires_at: new Date(session.expires_at! * 1000).toISOString(),
            });
        } catch (error) {
            console.error('Error creating session record:', error);
        }
    }

    private async logAuthEvent(
        userId: string | null,
        eventType: string,
        status: 'success' | 'failed' | 'initiated',
        errorMessage?: string | null,
        metadata?: Record<string, any>
    ) {
        try {
            await supabaseAdmin.from('auth_audit_log').insert({
                user_id: userId,
                event_type: eventType,
                status,
                ip_address: await this.getIPAddress(),
                user_agent: navigator.userAgent,
                error_message: errorMessage,
                metadata: metadata || {},
            });
        } catch (error) {
            console.error('Error logging auth event:', error);
        }
    }

    private getDeviceInfo(): Record<string, any> {
        return {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }

    private async getIPAddress(): Promise<string | null> {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return null;
        }
    }

    private transformProfile(data: any): UserProfile {
        return {
            id: data.id,
            email: data.email,
            role: data.role,
            name: data.name,
            phone: data.phone,
            avatarUrl: data.avatar_url,
            emailVerified: data.email_verified,
            phoneVerified: data.phone_verified,
            mfaEnabled: data.mfa_enabled,
            provider: data.provider,
            createdAt: data.created_at,
            lastLoginAt: data.last_login_at,
            patientId: data.patient_id,
            doctorId: data.doctor_id,
            sellerId: data.seller_id,
            pharmacyId: data.pharmacy_id,
            laboratoryId: data.laboratory_id,
        };
    }

    private transformToSnakeCase(obj: Record<string, any>): Record<string, any> {
        const result: Record<string, any> = {};
        for (const key in obj) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = obj[key];
        }
        return result;
    }
}

// Export singleton instance
export const authService = new SupabaseAuthService();

// Export for backward compatibility
export default authService;
