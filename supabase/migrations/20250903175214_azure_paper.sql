/*
  # Add display_date column to conseil table

  1. Changes
    - Add `display_date` column to `conseil` table
    - Column type: DATE (nullable)
    - Allows scheduling specific tips for specific dates

  2. Notes
    - Uses conditional check to avoid errors if column already exists
    - Column is nullable to allow tips without specific dates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conseil' AND column_name = 'display_date'
  ) THEN
    ALTER TABLE conseil ADD COLUMN display_date DATE;
  END IF;
END $$;