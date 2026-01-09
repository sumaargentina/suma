-- =====================================================
-- MIGRACIÓN 004: SISTEMA DE NOTIFICACIONES
-- =====================================================
-- Tablas para tracking de notificaciones y suscripciones push
-- Fecha: 2025-12-14
-- Versión: 1.0.0
-- =====================================================

-- =====================================================
-- 1. TABLA DE LOGS DE NOTIFICACIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Notification details
    type TEXT NOT NULL,
    channels TEXT[] NOT NULL, -- ['whatsapp', 'email', 'push']
    
    -- Content
    subject TEXT,
    message TEXT NOT NULL,
    
    -- Results (JSONB array of NotificationResult)
    results JSONB NOT NULL,
    /*
    [
        {
            "success": true,
            "channel": "whatsapp",
            "messageId": "SM123...",
            "deliveredAt": "2025-12-14T..."
        }
    ]
    */
    
    -- Full payload for debugging
    payload JSONB,
    
    -- Status
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_delivered ON notification_logs(delivered);

-- =====================================================
-- 2. TABLA DE SUSCRIPCIONES PUSH
-- =====================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Subscription details (from browser Push API)
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL, -- Public key
    auth TEXT NOT NULL, -- Auth secret
    
    -- Device info
    user_agent TEXT,
    device_info JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);

-- =====================================================
-- 3. TABLA DE PREFERENCIAS DE NOTIFICACIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User
    user_id UUID UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Channel preferences
    whatsapp_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    
    -- Notification type preferences
    appointment_reminders BOOLEAN DEFAULT TRUE,
    appointment_confirmations BOOLEAN DEFAULT TRUE,
    payment_notifications BOOLEAN DEFAULT TRUE,
    prescription_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    
    -- Quiet hours (no notifications during this time)
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);

-- =====================================================
-- 4. TABLA DE NOTIFICACIONES PROGRAMADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Target
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Related entities
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    
    -- Schedule
    scheduled_for TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    
    -- Notification details
    type TEXT NOT NULL,
    channels TEXT[] NOT NULL,
    payload JSONB NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')),
    error_message TEXT,
    
    -- Metadata
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sched_notif_user ON scheduled_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sched_notif_appointment ON scheduled_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_sched_notif_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sched_notif_status ON scheduled_notifications(status);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Notification Logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
    ON public.notification_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all notification logs"
    ON public.notification_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Push Subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Notification Preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification preferences"
    ON public.notification_preferences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Scheduled Notifications (read-only for users)
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled notifications"
    ON public.scheduled_notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- 6. FUNCIONES AUXILIARES
-- =====================================================

-- Auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences
DROP TRIGGER IF EXISTS on_user_profile_created_notif_prefs ON user_profiles;
CREATE TRIGGER on_user_profile_created_notif_prefs
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Function to schedule appointment reminders
CREATE OR REPLACE FUNCTION schedule_appointment_reminders(p_appointment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_appointment RECORD;
    v_reminder_24h TIMESTAMPTZ;
    v_reminder_2h TIMESTAMPTZ;
BEGIN
    -- Get appointment details
    SELECT * INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate reminder times
    v_reminder_24h := (v_appointment.date || ' ' || v_appointment.time)::TIMESTAMPTZ - INTERVAL '24 hours';
    v_reminder_2h := (v_appointment.date || ' ' || v_appointment.time)::TIMESTAMPTZ - INTERVAL '2 hours';
    
    -- Schedule 24h reminder
    INSERT INTO scheduled_notifications (
        user_id,
        appointment_id,
        scheduled_for,
        type,
        channels,
        payload
    ) VALUES (
        v_appointment.patient_id,
        p_appointment_id,
        v_reminder_24h,
        'appointment_reminder_24h',
        ARRAY['whatsapp', 'push'],
        jsonb_build_object(
            'appointmentId', p_appointment_id,
            'hoursBeforeq', 24
        )
    );
    
    -- Schedule 2h reminder
    INSERT INTO scheduled_notifications (
        user_id,
        appointment_id,
        scheduled_for,
        type,
        channels,
        payload
    ) VALUES (
        v_appointment.patient_id,
        p_appointment_id,
        v_reminder_2h,
        'appointment_reminder_2h',
        ARRAY['whatsapp', 'push'],
        jsonb_build_object(
            'appointmentId', p_appointment_id,
            'hoursBeforeq', 2
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-schedule reminders when appointment is created
CREATE OR REPLACE FUNCTION auto_schedule_reminders()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM schedule_appointment_reminders(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_appointment_created_schedule_reminders ON appointments;
CREATE TRIGGER on_appointment_created_schedule_reminders
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION auto_schedule_reminders();

-- =====================================================
-- 7. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE public.notification_logs IS 'Log de todas las notificaciones enviadas';
COMMENT ON TABLE public.push_subscriptions IS 'Suscripciones de push notifications por dispositivo';
COMMENT ON TABLE public.notification_preferences IS 'Preferencias de notificación por usuario';
COMMENT ON TABLE public.scheduled_notifications IS 'Notificaciones programadas para envío futuro';

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migración de Notificaciones completada';
    RAISE NOTICE '📊 Tablas creadas: notification_logs, push_subscriptions, notification_preferences, scheduled_notifications';
    RAISE NOTICE '🔒 RLS habilitado';
    RAISE NOTICE '⚡ Triggers para auto-programar recordatorios configurados';
    RAISE NOTICE '🎯 Sistema de notificaciones multi-canal listo!';
END $$;
