-- Rabata Education, Mentorship, Transparency & Impact Platform Schema
-- Strict Row-Level Security (RLS) for Mentors, Students, Assignments, Progress Logs,
-- Recorded Lectures, Funds Transparency, Success Stories, and Activity Photos.

-- ============================================================================
-- 1. MENTOR PROFILES & STUDENT RECORDS (Strict Mentor-Student Isolation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mentor_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '' CHECK (char_length(full_name) <= 120),
  email TEXT NOT NULL DEFAULT '' CHECK (char_length(email) <= 255),
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 40),
  location TEXT CHECK (location IS NULL OR char_length(location) <= 160),
  qualifications TEXT NOT NULL DEFAULT '' CHECK (char_length(qualifications) <= 300),
  subjects TEXT NOT NULL DEFAULT '' CHECK (char_length(subjects) <= 300),
  class_levels TEXT NOT NULL DEFAULT '' CHECK (char_length(class_levels) <= 160),
  languages TEXT NOT NULL DEFAULT 'Hindi, English' CHECK (char_length(languages) <= 160),
  availability TEXT CHECK (availability IS NULL OR char_length(availability) <= 200),
  experience TEXT CHECK (experience IS NULL OR char_length(experience) <= 300),
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 1000),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON public.mentor_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_profiles TO authenticated;
GRANT ALL ON public.mentor_profiles TO service_role;
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.student_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 100),
  guardian_name TEXT CHECK (guardian_name IS NULL OR char_length(guardian_name) <= 120),
  guardian_email TEXT NOT NULL CHECK (char_length(guardian_email) <= 255),
  guardian_phone TEXT CHECK (guardian_phone IS NULL OR char_length(guardian_phone) <= 40),
  class_level TEXT NOT NULL CHECK (char_length(class_level) <= 40),
  subjects_needed TEXT NOT NULL CHECK (char_length(subjects_needed) <= 300),
  preferred_language TEXT NOT NULL DEFAULT 'Hindi and English' CHECK (char_length(preferred_language) <= 80),
  preferred_format TEXT NOT NULL DEFAULT 'In person' CHECK (char_length(preferred_format) <= 80),
  learning_goals TEXT CHECK (learning_goals IS NULL OR char_length(learning_goals) <= 1000),
  attendance_count INT NOT NULL DEFAULT 0 CHECK (attendance_count >= 0),
  total_sessions INT NOT NULL DEFAULT 0 CHECK (total_sessions >= 0),
  progress_summary TEXT CHECK (progress_summary IS NULL OR char_length(progress_summary) <= 2000),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  guardian_consent BOOLEAN NOT NULL DEFAULT true CHECK (guardian_consent = true),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON public.student_records FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_records TO authenticated;
GRANT ALL ON public.student_records TO service_role;
ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.mentor_student_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_records(id) ON DELETE CASCADE,
  subjects TEXT NOT NULL DEFAULT '' CHECK (char_length(subjects) <= 200),
  schedule_notes TEXT CHECK (schedule_notes IS NULL OR char_length(schedule_notes) <= 300),
  active BOOLEAN NOT NULL DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mentor_user_id, student_id)
);
REVOKE ALL ON public.mentor_student_assignments FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_student_assignments TO authenticated;
GRANT ALL ON public.mentor_student_assignments TO service_role;
ALTER TABLE public.mentor_student_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.student_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_records(id) ON DELETE CASCADE,
  mentor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  topic_covered TEXT NOT NULL CHECK (char_length(topic_covered) BETWEEN 1 AND 300),
  attendance_status TEXT NOT NULL DEFAULT 'present' CHECK (attendance_status IN ('present', 'absent', 'excused')),
  remarks TEXT CHECK (remarks IS NULL OR char_length(remarks) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON public.student_progress_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_progress_logs TO authenticated;
GRANT ALL ON public.student_progress_logs TO service_role;
ALTER TABLE public.student_progress_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_assigned_mentor(_student_id UUID, _mentor_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_student_assignments
    WHERE student_id = _student_id
      AND mentor_user_id = _mentor_id
      AND active = true
  )
$$;
REVOKE ALL ON FUNCTION public.is_assigned_mentor(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_mentor(UUID, UUID) TO authenticated, service_role;

-- Mentor Profiles Policies
CREATE POLICY "Admin full access mentor_profiles" ON public.mentor_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentor own profile select" ON public.mentor_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentor own profile insert" ON public.mentor_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentor own profile update" ON public.mentor_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'mentor'))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Student view assigned mentor profile" ON public.mentor_profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student')
    AND EXISTS (
      SELECT 1 FROM public.mentor_student_assignments a
      JOIN public.student_records s ON s.id = a.student_id
      WHERE a.mentor_user_id = mentor_profiles.user_id
        AND s.student_user_id = auth.uid()
        AND a.active = true
    )
  );

-- Student Records Policies
CREATE POLICY "Admin full access student_records" ON public.student_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentor read assigned or created students" ON public.student_records
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'mentor')
    AND (public.is_assigned_mentor(id, auth.uid()) OR created_by = auth.uid())
  );

CREATE POLICY "Mentor insert student they teach" ON public.student_records
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'mentor') AND created_by = auth.uid());

CREATE POLICY "Mentor update assigned students" ON public.student_records
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'mentor') AND public.is_assigned_mentor(id, auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'mentor') AND public.is_assigned_mentor(id, auth.uid()));

CREATE POLICY "Student read own record" ON public.student_records
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'student') AND student_user_id = auth.uid());

-- Mentor-Student Assignments Policies
CREATE POLICY "Admin full access mentor_student_assignments" ON public.mentor_student_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentor read own assignments" ON public.mentor_student_assignments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'mentor') AND mentor_user_id = auth.uid());

CREATE POLICY "Mentor create own assignment" ON public.mentor_student_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'mentor') AND mentor_user_id = auth.uid());

CREATE POLICY "Student read own assignments" ON public.mentor_student_assignments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student')
    AND EXISTS (
      SELECT 1 FROM public.student_records s
      WHERE s.id = student_id AND s.student_user_id = auth.uid()
    )
  );

-- Student Progress Logs Policies
CREATE POLICY "Admin full access student_progress_logs" ON public.student_progress_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentor read assigned progress logs" ON public.student_progress_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'mentor') AND public.is_assigned_mentor(student_id, auth.uid()));

CREATE POLICY "Mentor insert assigned progress logs" ON public.student_progress_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'mentor')
    AND mentor_user_id = auth.uid()
    AND public.is_assigned_mentor(student_id, auth.uid())
  );

CREATE POLICY "Mentor update assigned progress logs" ON public.student_progress_logs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'mentor') AND public.is_assigned_mentor(student_id, auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'mentor') AND public.is_assigned_mentor(student_id, auth.uid()));

CREATE POLICY "Student read own progress logs" ON public.student_progress_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student')
    AND EXISTS (
      SELECT 1 FROM public.student_records s
      WHERE s.id = student_id AND s.student_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. RECORDED LECTURES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recorded_lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 1500),
  subject TEXT NOT NULL CHECK (char_length(subject) <= 80),
  class_level TEXT NOT NULL DEFAULT 'All' CHECK (char_length(class_level) <= 40),
  topic TEXT NOT NULL DEFAULT 'General' CHECK (char_length(topic) <= 120),
  video_url TEXT NOT NULL CHECK (char_length(video_url) <= 1000),
  youtube_id TEXT CHECK (youtube_id IS NULL OR char_length(youtube_id) <= 40),
  thumbnail_url TEXT CHECK (thumbnail_url IS NULL OR char_length(thumbnail_url) <= 1000),
  duration TEXT CHECK (duration IS NULL OR char_length(duration) <= 40),
  instructor_name TEXT NOT NULL DEFAULT 'Tammana Rathore' CHECK (char_length(instructor_name) <= 120),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON public.recorded_lectures FROM PUBLIC;
GRANT SELECT ON public.recorded_lectures TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.recorded_lectures TO authenticated;
GRANT ALL ON public.recorded_lectures TO service_role;
ALTER TABLE public.recorded_lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published lectures" ON public.recorded_lectures
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manage lectures" ON public.recorded_lectures
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 3. FUNDS TRANSPARENCY, DONATIONS, ALLOCATIONS, PROOFS & AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fund_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_inr NUMERIC(12,2) NOT NULL CHECK (amount_inr > 0),
  donor_name TEXT NOT NULL DEFAULT 'Anonymous Supporter' CHECK (char_length(donor_name) <= 160),
  donor_email TEXT CHECK (donor_email IS NULL OR char_length(donor_email) <= 255),
  donor_phone TEXT CHECK (donor_phone IS NULL OR char_length(donor_phone) <= 40),
  purpose TEXT NOT NULL DEFAULT 'General Education & Community Fund' CHECK (char_length(purpose) <= 200),
  payment_reference TEXT CHECK (payment_reference IS NULL OR char_length(payment_reference) <= 120),
  is_public_acknowledgement BOOLEAN NOT NULL DEFAULT false,
  public_label TEXT NOT NULL DEFAULT 'Community Supporter' CHECK (char_length(public_label) <= 120),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON public.fund_donations FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fund_donations TO authenticated;
GRANT ALL ON public.fund_donations TO service_role;
ALTER TABLE public.fund_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only fund_donations" ON public.fund_donations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.fund_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('planned_allocation', 'expenditure')),
  category TEXT NOT NULL CHECK (category IN (
    'Learning Materials & Books',
    'Digital & Computer Education',
    'Community Food Drives',
    'Classroom & Study Space',
    'Career & Skill Workshops',
    'Other Community Support'
  )),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 1500),
  amount_inr NUMERIC(12,2) NOT NULL CHECK (amount_inr >= 0),
  vendor_or_beneficiary TEXT CHECK (vendor_or_beneficiary IS NULL OR char_length(vendor_or_beneficiary) <= 200),
  proof_url TEXT CHECK (proof_url IS NULL OR char_length(proof_url) <= 2000),
  proof_type TEXT CHECK (proof_type IS NULL OR proof_type IN ('receipt', 'bill', 'photograph', 'document')),
  proof_caption TEXT CHECK (proof_caption IS NULL OR char_length(proof_caption) <= 300),
  is_published BOOLEAN NOT NULL DEFAULT true,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON public.fund_allocations FROM PUBLIC;
GRANT SELECT ON public.fund_allocations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fund_allocations TO authenticated;
GRANT ALL ON public.fund_allocations TO service_role;
ALTER TABLE public.fund_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published fund_allocations" ON public.fund_allocations
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manage fund_allocations" ON public.fund_allocations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.fund_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (char_length(action) <= 40),
  table_name TEXT NOT NULL CHECK (char_length(table_name) <= 80),
  record_id UUID,
  summary TEXT NOT NULL CHECK (char_length(summary) <= 500),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON public.fund_audit_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.fund_audit_logs TO authenticated;
GRANT ALL ON public.fund_audit_logs TO service_role;
ALTER TABLE public.fund_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read and write fund_audit_logs" ON public.fund_audit_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public fund summary RPC: safely exposes aggregate totals and public-acknowledged entries
-- without exposing donor emails, phone numbers, or payment references.
CREATE OR REPLACE FUNCTION public.get_public_fund_summary()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_received_inr', COALESCE((SELECT sum(amount_inr) FROM public.fund_donations), 0),
    'total_spent_inr', COALESCE((SELECT sum(amount_inr) FROM public.fund_allocations WHERE is_published = true AND entry_type = 'expenditure'), 0),
    'total_planned_inr', COALESCE((SELECT sum(amount_inr) FROM public.fund_allocations WHERE is_published = true AND entry_type = 'planned_allocation'), 0),
    'available_balance_inr', COALESCE((SELECT sum(amount_inr) FROM public.fund_donations), 0) - COALESCE((SELECT sum(amount_inr) FROM public.fund_allocations WHERE is_published = true AND entry_type = 'expenditure'), 0),
    'donation_count', COALESCE((SELECT count(*) FROM public.fund_donations), 0),
    'expenditure_count', COALESCE((SELECT count(*) FROM public.fund_allocations WHERE is_published = true AND entry_type = 'expenditure'), 0),
    'acknowledged_donations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id,
        'received_date', d.received_date,
        'amount_inr', d.amount_inr,
        'public_label', d.public_label,
        'purpose', d.purpose
      ) ORDER BY d.received_date DESC, d.created_at DESC)
      FROM public.fund_donations d
      WHERE d.is_public_acknowledgement = true
    ), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.get_public_fund_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_fund_summary() TO anon, authenticated, service_role;

-- ============================================================================
-- 4. SUCCESS STORIES & HOMEPAGE ACTIVITY PHOTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_display_name TEXT NOT NULL DEFAULT 'Anonymous Learner' CHECK (char_length(learner_display_name) <= 120),
  class_or_age TEXT NOT NULL DEFAULT '' CHECK (char_length(class_or_age) <= 80),
  focus_area TEXT NOT NULL DEFAULT 'Academic growth' CHECK (focus_area IN ('Academic growth', 'Spoken English & Confidence', 'Career & Interview Readiness')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  story_summary TEXT NOT NULL CHECK (char_length(story_summary) <= 2000),
  support_given TEXT NOT NULL CHECK (char_length(support_given) <= 1000),
  achievement_or_progress TEXT NOT NULL CHECK (char_length(achievement_or_progress) <= 1000),
  quote TEXT CHECK (quote IS NULL OR char_length(quote) <= 500),
  image_url TEXT CHECK (image_url IS NULL OR char_length(image_url) <= 2000),
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  guardian_consent_verified BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (is_anonymous = true OR guardian_consent_verified = true)
);
REVOKE ALL ON public.success_stories FROM PUBLIC;
GRANT SELECT ON public.success_stories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.success_stories TO authenticated;
GRANT ALL ON public.success_stories TO service_role;
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published success_stories" ON public.success_stories
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manage success_stories" ON public.success_stories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.activity_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  caption TEXT NOT NULL CHECK (char_length(caption) BETWEEN 1 AND 600),
  category TEXT NOT NULL DEFAULT 'Founder Teaching' CHECK (category IN ('Founder Teaching', 'Mentor Session', 'Community Activity', 'Classroom Learning')),
  image_url TEXT NOT NULL CHECK (char_length(image_url) <= 2000),
  consent_verified BOOLEAN NOT NULL DEFAULT true CHECK (consent_verified = true),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON public.activity_photos FROM PUBLIC;
GRANT SELECT ON public.activity_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.activity_photos TO authenticated;
GRANT ALL ON public.activity_photos TO service_role;
ALTER TABLE public.activity_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published activity_photos" ON public.activity_photos
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manage activity_photos" ON public.activity_photos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. STORAGE BUCKETS & POLICIES (Fund Proofs, Lecture Media, Community Media)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('fund-proofs', 'fund-proofs', true),
  ('lecture-media', 'lecture-media', true),
  ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read Rabata media buckets" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('fund-proofs', 'lecture-media', 'community-media'));

CREATE POLICY "Admin upload Rabata media buckets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('fund-proofs', 'lecture-media', 'community-media')
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin update Rabata media buckets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('fund-proofs', 'lecture-media', 'community-media')
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin delete Rabata media buckets" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('fund-proofs', 'lecture-media', 'community-media')
    AND public.has_role(auth.uid(), 'admin')
  );
