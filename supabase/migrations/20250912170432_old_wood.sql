/*
  # Update user_profiles table for onboarding flow

  1. New Columns
    - `age` (integer) - User age (14-90)
    - `sex` (text) - User gender (male/female/other/na)
    - `weight_kg` (numeric) - User weight in kilograms
    - `main_sport` (text) - Primary sport activity
    - `sessions_per_week` (integer) - Training frequency per week
    - `training_slots` (jsonb) - Training schedule with days and times
    - `monthly_budget_eur` (numeric) - Monthly supplement budget in euros
    - `diet` (text) - Dietary preference (omnivore/vegetarian/vegan/etc)
    - `dietary_constraints` (text[]) - Dietary restrictions array
    - `onboarding_completed` (boolean) - Whether user completed onboarding
    - `onboarding_step` (integer) - Current onboarding step

  2. Changes
    - Add new columns for enhanced user profiling
    - Set appropriate defaults for onboarding tracking
    - Maintain backward compatibility with existing data

  3. Security
    - Existing RLS policies remain unchanged
    - New columns follow same access patterns
*/

-- Add new columns to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS sex TEXT,
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS main_sport TEXT,
ADD COLUMN IF NOT EXISTS sessions_per_week INTEGER,
ADD COLUMN IF NOT EXISTS training_slots JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS monthly_budget_eur NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS diet TEXT DEFAULT 'omnivore',
ADD COLUMN IF NOT EXISTS dietary_constraints TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;

-- Add constraints for data validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_age_check'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_age_check CHECK (age IS NULL OR (age >= 14 AND age <= 90));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_weight_check'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_weight_check CHECK (weight_kg IS NULL OR (weight_kg >= 30 AND weight_kg <= 250));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_sessions_check'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_sessions_check CHECK (sessions_per_week IS NULL OR (sessions_per_week >= 0 AND sessions_per_week <= 14));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_sex_check'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_sex_check CHECK (sex IS NULL OR sex IN ('male', 'female', 'other', 'na'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_diet_check'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_diet_check CHECK (diet IS NULL OR diet IN ('omnivore', 'vegetarian', 'vegan', 'keto', 'paleo', 'halal', 'kosher', 'other'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_onboarding_step_check'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_onboarding_step_check CHECK (onboarding_step >= 1 AND onboarding_step <= 10);
  END IF;
END $$;