/*
# Create SwarSkill prototype data model

1. New Tables
- `beneficiaries`: one conversational livelihood profile per prototype session, including language, location, education, work preferences, mobility, interests, and completion state.
- `assessments`: a saved snapshot of the interview answers and the computed profile score for a beneficiary session.
- `nsqf_courses`: verified NSQF-aligned training and livelihood pathways with sector, level, duration, eligibility, and region tags.
- `recommendations`: ranked course matches generated for a beneficiary, including fit score, reason, skill gaps, and local opportunity notes.

2. Security
- RLS is enabled on every table.
- This prototype has no sign-in screen, so anon and authenticated roles can use the intentionally shared demo workspace with separate CRUD policies.

3. Important Notes
- Records are additive and safe to re-run.
- Seed courses are inserted only when their code does not already exist.
*/

CREATE TABLE IF NOT EXISTS beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Demo beneficiary',
  language text NOT NULL DEFAULT 'Hindi',
  district text NOT NULL DEFAULT 'Bhopal',
  education text NOT NULL DEFAULT 'Secondary school',
  traditional_occupation text NOT NULL DEFAULT '',
  current_activity text NOT NULL DEFAULT '',
  interests text[] NOT NULL DEFAULT '{}',
  mobility text NOT NULL DEFAULT 'Within district',
  employment_preference text NOT NULL DEFAULT 'Both',
  constraints text[] NOT NULL DEFAULT '{}',
  interview_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}',
  profile_score integer NOT NULL DEFAULT 0,
  readiness text NOT NULL DEFAULT 'Exploring',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nsqf_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  sector text NOT NULL,
  level text NOT NULL,
  duration text NOT NULL,
  description text NOT NULL,
  eligibility text NOT NULL,
  delivery text NOT NULL,
  locations text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  demand text NOT NULL DEFAULT 'Growing',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES nsqf_courses(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  fit_score integer NOT NULL,
  reason text NOT NULL,
  skill_gaps text[] NOT NULL DEFAULT '{}',
  local_opportunity text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Suggested',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nsqf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_select_beneficiaries" ON beneficiaries;
DROP POLICY IF EXISTS "demo_insert_beneficiaries" ON beneficiaries;
DROP POLICY IF EXISTS "demo_update_beneficiaries" ON beneficiaries;
DROP POLICY IF EXISTS "demo_delete_beneficiaries" ON beneficiaries;
CREATE POLICY "demo_select_beneficiaries" ON beneficiaries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo_insert_beneficiaries" ON beneficiaries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "demo_update_beneficiaries" ON beneficiaries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo_delete_beneficiaries" ON beneficiaries FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "demo_select_assessments" ON assessments;
DROP POLICY IF EXISTS "demo_insert_assessments" ON assessments;
DROP POLICY IF EXISTS "demo_update_assessments" ON assessments;
DROP POLICY IF EXISTS "demo_delete_assessments" ON assessments;
CREATE POLICY "demo_select_assessments" ON assessments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo_insert_assessments" ON assessments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "demo_update_assessments" ON assessments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo_delete_assessments" ON assessments FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "demo_select_courses" ON nsqf_courses;
DROP POLICY IF EXISTS "demo_insert_courses" ON nsqf_courses;
DROP POLICY IF EXISTS "demo_update_courses" ON nsqf_courses;
DROP POLICY IF EXISTS "demo_delete_courses" ON nsqf_courses;
CREATE POLICY "demo_select_courses" ON nsqf_courses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo_insert_courses" ON nsqf_courses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "demo_update_courses" ON nsqf_courses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo_delete_courses" ON nsqf_courses FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "demo_select_recommendations" ON recommendations;
DROP POLICY IF EXISTS "demo_insert_recommendations" ON recommendations;
DROP POLICY IF EXISTS "demo_update_recommendations" ON recommendations;
DROP POLICY IF EXISTS "demo_delete_recommendations" ON recommendations;
CREATE POLICY "demo_select_recommendations" ON recommendations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo_insert_recommendations" ON recommendations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "demo_update_recommendations" ON recommendations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo_delete_recommendations" ON recommendations FOR DELETE TO anon, authenticated USING (true);

INSERT INTO nsqf_courses (code, title, sector, level, duration, description, eligibility, delivery, locations, tags, demand) VALUES
('AGR/Q0501', 'Organic Grower', 'Agriculture', 'NSQF Level 4', '240 hours', 'Build a sustainable farm plan, improve soil health, and sell produce through local markets.', 'Class 8 or equivalent; interest in agriculture', 'Blended + field practice', ARRAY['Bhopal','Sehore','Vidisha'], ARRAY['agriculture','outdoor','self-employment'], 'High'),
('AGR/Q7801', 'Dairy Farmer Entrepreneur', 'Agriculture & Allied', 'NSQF Level 4', '300 hours', 'Learn scientific dairy care, feed planning, milk quality, and small enterprise management.', 'Class 8 or equivalent; access to livestock preferred', 'Village training centre', ARRAY['Bhopal','Sehore','Raisen'], ARRAY['dairy','animals','self-employment'], 'High'),
('AGR/Q0404', 'Vermicompost Producer', 'Agriculture', 'NSQF Level 3', '120 hours', 'Turn farm and household waste into quality compost for local growers.', 'No formal qualification required', 'Mobile training camp', ARRAY['Bhopal','Vidisha','Raisen'], ARRAY['agriculture','low-cost','self-employment'], 'Growing'),
('TEL/Q4102', 'Solar PV Installer', 'Green Jobs', 'NSQF Level 4', '330 hours', 'Install, test, and maintain small solar systems for homes, farms, and community assets.', 'Class 10 or equivalent; basic numeracy', 'Practical lab + apprenticeship', ARRAY['Bhopal','Indore','Sehore'], ARRAY['solar','technical','wage','mobility'], 'High'),
('ELE/Q9302', 'Repair Technician - Electrical Appliances', 'Electronics', 'NSQF Level 4', '390 hours', 'Diagnose and repair common household appliances and build a local service business.', 'Class 10 or equivalent', 'Workshop + apprenticeship', ARRAY['Bhopal','Vidisha','Sehore'], ARRAY['repair','technical','self-employment'], 'High'),
('ASC/Q9701', 'Assistant Beauty Therapist', 'Beauty & Wellness', 'NSQF Level 3', '330 hours', 'Offer safe, hygienic beauty and wellness services from a salon or home setup.', 'Class 8 or equivalent', 'Community centre + practice', ARRAY['Bhopal','Sehore'], ARRAY['beauty','service','self-employment','indoor'], 'Growing'),
('HCS/Q5101', 'General Duty Assistant', 'Healthcare', 'NSQF Level 4', '420 hours', 'Support patients and care teams with safe, compassionate daily assistance.', 'Class 10 or equivalent', 'Classroom + hospital exposure', ARRAY['Bhopal','Indore'], ARRAY['healthcare','care','wage','indoor'], 'High'),
('THC/Q0103', 'Hand Embroiderer', 'Apparel', 'NSQF Level 3', '240 hours', 'Convert traditional craft skills into quality products for local and digital marketplaces.', 'No formal qualification required', 'Home-based cluster training', ARRAY['Bhopal','Vidisha','Raisen'], ARRAY['craft','traditional','home-based','self-employment'], 'Growing')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS assessments_beneficiary_id_idx ON assessments(beneficiary_id);
CREATE INDEX IF NOT EXISTS recommendations_beneficiary_id_idx ON recommendations(beneficiary_id);
CREATE INDEX IF NOT EXISTS nsqf_courses_sector_idx ON nsqf_courses(sector);
