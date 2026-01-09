-- Create clinic_expenses table
CREATE TABLE IF NOT EXISTS public.clinic_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clinic_expenses ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Clinic admins can view their own expenses" ON public.clinic_expenses
    FOR SELECT
    USING (clinic_id IN (
        SELECT id FROM public.clinics WHERE admin_email = auth.email()
    ));

CREATE POLICY "Clinic admins can insert their own expenses" ON public.clinic_expenses
    FOR INSERT
    WITH CHECK (clinic_id IN (
        SELECT id FROM public.clinics WHERE admin_email = auth.email()
    ));

CREATE POLICY "Clinic admins can update their own expenses" ON public.clinic_expenses
    FOR UPDATE
    USING (clinic_id IN (
        SELECT id FROM public.clinics WHERE admin_email = auth.email()
    ));

CREATE POLICY "Clinic admins can delete their own expenses" ON public.clinic_expenses
    FOR DELETE
    USING (clinic_id IN (
        SELECT id FROM public.clinics WHERE admin_email = auth.email()
    ));
