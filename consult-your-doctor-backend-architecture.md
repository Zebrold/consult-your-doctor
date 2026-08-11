# Consult Your Doctor - Backend Architecture Blueprint

This document outlines the complete end-to-end backend architecture using **Supabase (PostgreSQL)**, designed to integrate seamlessly with a **Next.js** frontend.

## 1. Core Tech Stack
*   **Database:** PostgreSQL (via Supabase)
*   **Authentication:** Supabase Auth (Email, Phone, OAuth)
*   **Storage:** Supabase Storage (Prescriptions, Medical Reports)
*   **Backend Logic:** Supabase Edge Functions & PostgreSQL Database Triggers
*   **Payments:** Razorpay / Stripe Integration

---

## 2. Database Schema (PostgreSQL)

The system relies on strict relational integrity to ensure doctors, schedules, and appointments never conflict.

### `profiles` (User Management)
Extends the default `auth.users` table provided by Supabase.
*   `id` (UUID, Primary Key, references auth.users)
*   `full_name` (Text)
*   `phone_number` (Text, Unique)
*   `role` (Enum: `patient`, `executive`, `doctor`, `hospital_admin`, `super_admin`)
*   `created_at` (Timestamp)

### `hospitals`
*   `id` (UUID, Primary Key)
*   `name` (Text)
*   `city` (Text)
*   `address` (Text)
*   `contact_email` (Text)
*   `status` (Enum: `active`, `inactive`)

### `departments`
*   `id` (UUID, Primary Key)
*   `hospital_id` (UUID, Foreign Key -> hospitals.id)
*   `name` (Text - e.g., Cardiology, Neurology)

### `doctors`
*   `id` (UUID, Primary Key)
*   `profile_id` (UUID, Foreign Key -> profiles.id)
*   `hospital_id` (UUID, Foreign Key -> hospitals.id)
*   `department_id` (UUID, Foreign Key -> departments.id)
*   `specialty` (Text)
*   `experience_years` (Integer)
*   `consultation_fee` (Numeric)

### `schedules` (Availability Management)
*   `id` (UUID, Primary Key)
*   `doctor_id` (UUID, Foreign Key -> doctors.id)
*   `start_time` (Timestamp)
*   `end_time` (Timestamp)
*   `is_booked` (Boolean, Default: false)

### `appointments` (The Core Engine)
*   `id` (UUID, Primary Key)
*   `patient_id` (UUID, Foreign Key -> profiles.id)
*   `doctor_id` (UUID, Foreign Key -> doctors.id)
*   `hospital_id` (UUID, Foreign Key -> hospitals.id)
*   `schedule_id` (UUID, Foreign Key -> schedules.id)
*   `executive_id` (UUID, Foreign Key -> profiles.id, Nullable)
*   `status` (Enum: `pending_payment`, `confirmed`, `executive_assigned`, `visited`, `completed`, `cancelled`)
*   `created_at` (Timestamp)

### `payments`
*   `id` (UUID, Primary Key)
*   `appointment_id` (UUID, Foreign Key -> appointments.id)
*   `amount` (Numeric)
*   `transaction_id` (Text)
*   `gateway` (Text - e.g., 'stripe', 'razorpay')
*   `status` (Enum: `success`, `failed`, `refunded`)

### `medical_records`
*   `id` (UUID, Primary Key)
*   `appointment_id` (UUID, Foreign Key -> appointments.id)
*   `document_type` (Enum: `prescription`, `lab_report`)
*   `file_url` (Text - links to Supabase Storage bucket)
*   `notes` (Text)

---

## 3. Row Level Security (RLS) Policies

Supabase RLS is critical for isolating data across the 5 user roles.

*   **Patients:** 
    *   `SELECT` on `doctors`, `hospitals`, `departments`.
    *   `SELECT`, `INSERT`, `UPDATE` on `appointments` and `payments` where `patient_id = auth.uid()`.
    *   `SELECT` on `medical_records` where appointment belongs to them.
*   **Doctors:**
    *   `SELECT`, `UPDATE` on `appointments` where `doctor_id` matches their doctor profile.
    *   `INSERT`, `UPDATE` on `schedules` tied to their ID.
    *   `INSERT` on `medical_records` for their appointments.
*   **Executives:**
    *   `SELECT`, `UPDATE` on `appointments` where `executive_id = auth.uid()`.
*   **Hospital Admins:**
    *   Full CRUD access to `doctors`, `schedules`, and `appointments` *only* where `hospital_id` matches their assigned hospital.
*   **Super Admins:**
    *   Bypass RLS (Full access to all tables).

---

## 4. Backend Logic & Automation

### Database Triggers (PostgreSQL)
1.  **Auto-assign Executive:** Trigger fires `AFTER UPDATE` on `appointments`. If `status` changes to `confirmed` (payment success), it queries available executives at the respective `hospital_id` and updates the `executive_id` field.
2.  **Lock Schedule:** Trigger fires `AFTER INSERT` on `appointments`. Updates the related `schedules` row to `is_booked = true`.

### Supabase Edge Functions (Deno / TypeScript)
1.  **Payment Intent Generation:** Securely talks to Razorpay/Stripe API to create a payment session before booking.
2.  **Payment Webhook Handler:** Listens for successful payment callbacks from the gateway, verifies the signature, and updates the `payments` and `appointments` table statuses.
3.  **Notification Dispatcher:** Integrated with an SMS/Email gateway. Triggered via database webhooks when an appointment is confirmed or an executive is assigned.

---

## 5. Frontend (Next.js) Integration Strategy

*   **Data Fetching:** Utilize `@supabase/ssr` to fetch public data (Hospitals, Doctors) on the server for optimal SEO.
*   **Mutations:** Use Next.js Server Actions for secure operations (booking slots, processing payments).
*   **Real-time:** Use Supabase Realtime channels on the Executive and Doctor dashboards to instantly reflect patient arrivals or new bookings without manual refreshing.