-- ============================================
-- DepEd Auto-DLP/DLL Generator — Supabase Setup
-- Run this SQL in the Supabase SQL Editor
-- ============================================

-- 1. Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create lesson_plans table
CREATE TABLE lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade_level TEXT NOT NULL,
  learning_area TEXT NOT NULL,
  quarter TEXT NOT NULL,
  week TEXT NOT NULL,
  subject_description TEXT DEFAULT '',
  curriculum_type TEXT NOT NULL CHECK (curriculum_type IN ('K-12', 'MATATAG')),
  teaching_method TEXT NOT NULL,
  teaching_method_custom TEXT,
  competencies TEXT NOT NULL,
  coi_tags TEXT,
  plan_type TEXT NOT NULL DEFAULT 'dlp' CHECK (plan_type IN ('dlp', 'wlp')),
  generated_content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Ensures an existing-but-profile-less user can be inserted on first save
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. RLS Policies for lesson_plans
CREATE POLICY "Users can view own plans"
  ON lesson_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON lesson_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON lesson_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON lesson_plans FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Auto-create profile on signup
-- Defensive: never blocks signup (ON CONFLICT + EXCEPTION guard) so a failing
-- profile insert can never cause a 500 on the /auth/v1/signup endpoint.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- 7. Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 8. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_lesson_plans_updated_at ON lesson_plans;
CREATE TRIGGER update_lesson_plans_updated_at
  BEFORE UPDATE ON lesson_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Create indexes for performance
CREATE INDEX idx_lesson_plans_user_id ON lesson_plans(user_id);
CREATE INDEX idx_lesson_plans_created_at ON lesson_plans(created_at DESC);
CREATE INDEX idx_lesson_plans_curriculum ON lesson_plans(curriculum_type);
CREATE INDEX idx_lesson_plans_plan_type ON lesson_plans(plan_type);
CREATE INDEX idx_lesson_plans_grade_level ON lesson_plans(grade_level);
CREATE INDEX idx_lesson_plans_learning_area ON lesson_plans(learning_area);
