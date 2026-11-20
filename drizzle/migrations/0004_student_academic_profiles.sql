-- Student Profiles & Academic Progress Tracking Table
-- Enforces strict RLS isolation for Administrators, Assigned Mentors, and Students.

CREATE TABLE IF NOT EXISTS public.student_academic_profiles (
  student_id UUID PRIMARY KEY REFERENCES public.student_records(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL UNIQUE CHECK (char_length(student_code) BETWEEN 3 AND 40),
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
  photo_url TEXT CHECK (photo_url IS NULL OR char_length(photo_url) <= 2000),
  age INT CHECK (age IS NULL OR (age >= 3 AND age <= 30)),
  class_grade TEXT NOT NULL CHECK (char_length(class_grade) <= 40),
  school_name TEXT NOT NULL DEFAULT '' CHECK (char_length(school_name) <= 200),
  preferred_language TEXT NOT NULL DEFAULT 'Hindi and English' CHECK (char_length(preferred_language) <= 80),
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  educational_goals TEXT NOT NULL DEFAULT '' CHECK (char_length(educational_goals) <= 1500),
  subjects_enrolled TEXT[] NOT NULL DEFAULT '{}',
  subject_performances JSONB NOT NULL DEFAULT '[]'::jsonb,
  monthly_assessments JSONB NOT NULL DEFAULT '[]'::jsonb,
  attendance_calendar JSONB NOT NULL DEFAULT '{}'::jsonb,
  learning_development JSONB NOT NULL DEFAULT '[]'::jsonb,
  teacher_feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
  learning_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  academic_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON public.student_academic_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_academic_profiles TO authenticated;
GRANT ALL ON public.student_academic_profiles TO service_role;
ALTER TABLE public.student_academic_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access student_academic_profiles" ON public.student_academic_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentor read assigned student academic profiles" ON public.student_academic_profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'mentor')
    AND public.is_assigned_mentor(student_id, auth.uid())
  );

CREATE POLICY "Mentor insert assigned student academic profiles" ON public.student_academic_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'mentor')
    AND public.is_assigned_mentor(student_id, auth.uid())
  );

CREATE POLICY "Mentor update assigned student academic profiles" ON public.student_academic_profiles
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'mentor')
    AND public.is_assigned_mentor(student_id, auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'mentor')
    AND public.is_assigned_mentor(student_id, auth.uid())
  );

CREATE POLICY "Student read own academic profile" ON public.student_academic_profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student')
    AND EXISTS (
      SELECT 1 FROM public.student_records s
      WHERE s.id = student_id AND s.student_user_id = auth.uid()
    )
  );
