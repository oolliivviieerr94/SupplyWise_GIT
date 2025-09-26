/*
  # Add missing is_active column to conseil table

  1. Changes
    - Add `is_active` column to `conseil` table with default value TRUE
    - This column controls whether a conseil should be displayed to users

  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Sets default value to TRUE for existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conseil' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE conseil ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;