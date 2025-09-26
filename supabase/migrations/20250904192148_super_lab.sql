/*
  # Add admin policies for settings table

  1. Security Changes
    - Add policy for admins to insert/update settings
    - Allow admins to manage application settings
    - Restrict access to users listed in app_admins table

  2. Notes
    - Only users with email in app_admins table can modify settings
    - Maintains security while allowing admin functionality
*/

-- Create policy to allow admins to insert and update settings
CREATE POLICY "Admins can manage settings"
  ON settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins 
      WHERE email = auth.email()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_admins 
      WHERE email = auth.email()
    )
  );