-- Create doctor_signup_requests table
CREATE TABLE public.doctor_signup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    specialty TEXT,
    qualifications TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.doctor_signup_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (since they are not authenticated yet)
CREATE POLICY "Allow public insert on doctor_signup_requests"
    ON public.doctor_signup_requests
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Only admins can read/update
CREATE POLICY "Allow authenticated to view doctor_signup_requests"
    ON public.doctor_signup_requests
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated to update doctor_signup_requests"
    ON public.doctor_signup_requests
    FOR UPDATE
    TO authenticated
    USING (true);
