-- =====================================================
-- MIGRACIÓN 007: ANALYTICS Y REPORTES
-- Descripción: Funciones RPC para dashboards de rendimiento
-- Fecha: 2025-12-14
-- =====================================================

-- 1. FUNCIÓN: Ingresos Mensuales Globales (Para Admin)
-- Retorna: Mes, Ingreso Bruto, Comisión Estimada
CREATE OR REPLACE FUNCTION get_admin_monthly_revenue()
RETURNS TABLE (
  month text,
  total_revenue numeric,
  platform_revenue numeric,
  appointment_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Solo admins pueden ejecutar esto (validación en política o app level)
  -- IF auth.role() <> 'admin' THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  RETURN QUERY
  SELECT 
    to_char(date_trunc('month', date::date), 'YYYY-MM') as month,
    COALESCE(SUM(total_price), 0) as total_revenue,
    COALESCE(SUM(total_price * 0.05), 0) as platform_revenue, -- 5% hardcoded por ahora
    COUNT(*) as appointment_count
  FROM appointments
  WHERE 
    payment_status = 'Pagado' OR attendance = 'Atendido'
  GROUP BY 1
  ORDER BY 1 ASC -- Orden cronológico para gráficas
  LIMIT 12;
END;
$$;

-- 2. FUNCIÓN: Top Doctores por Ingresos (Para Admin)
CREATE OR REPLACE FUNCTION get_top_performing_doctors()
RETURNS TABLE (
  doctor_name text,
  specialty text,
  total_revenue numeric,
  appointment_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.name as doctor_name,
    d.specialty,
    COALESCE(SUM(a.total_price), 0) as total_revenue,
    COUNT(a.id) as appointment_count
  FROM doctors d
  JOIN appointments a ON d.id = a.doctor_id
  WHERE 
    a.payment_status = 'Pagado' OR a.attendance = 'Atendido'
  GROUP BY d.id, d.name, d.specialty
  ORDER BY total_revenue DESC
  LIMIT 10;
END;
$$;

-- 3. FUNCIÓN: Dashboard de Médico (Ingresos Propios)
CREATE OR REPLACE FUNCTION get_doctor_analytics(p_doctor_id UUID)
RETURNS TABLE (
  month text,
  revenue numeric,
  patients_seen bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(date_trunc('month', date::date), 'YYYY-MM') as month,
    COALESCE(SUM(total_price), 0) as revenue,
    COUNT(*) as patients_seen
  FROM appointments
  WHERE 
    doctor_id = p_doctor_id
    AND (payment_status = 'Pagado' OR attendance = 'Atendido')
  GROUP BY 1
  ORDER BY 1 ASC
  LIMIT 12;
END;
$$;

-- 4. FUNCIÓN: KPIs Generales (Contadores Rápidos)
CREATE OR REPLACE FUNCTION get_admin_kpis()
RETURNS TABLE (
  total_doctors bigint,
  total_patients bigint,
  active_appointments bigint,
  total_revenue_ytd numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM doctors) as total_doctors,
    (SELECT COUNT(*) FROM patients) as total_patients,
    (SELECT COUNT(*) FROM appointments WHERE date::date >= CURRENT_DATE) as active_appointments,
    (SELECT COALESCE(SUM(total_price), 0) FROM appointments WHERE date_part('year', date::date) = date_part('year', CURRENT_DATE)) as total_revenue_ytd;
END;
$$;

-- COMENTARIOS
COMMENT ON FUNCTION get_admin_monthly_revenue IS 'Retorna ingresos y comisiones por mes para gráficos de admin';
COMMENT ON FUNCTION get_top_performing_doctors IS 'Ranking de mejores doctores por facturación';
