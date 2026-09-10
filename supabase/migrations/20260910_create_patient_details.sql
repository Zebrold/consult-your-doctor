CREATE TABLE IF NOT EXISTS public.patient_details (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    blood_group TEXT,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_relation TEXT,
    emergency_contact_phone TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.patient_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patient details" 
ON public.patient_details FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own patient details" 
ON public.patient_details FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own patient details" 
ON public.patient_details FOR UPDATE 
USING (auth.uid() = id);
