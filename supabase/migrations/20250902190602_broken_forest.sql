/*
  # Create settings table for application configuration

  1. New Tables
    - `settings` - Application settings with key-value pairs
      - `key` (text, primary key) - Setting identifier
      - `value` (text) - Setting value
      - `created_at` (timestamp) - Creation timestamp
      - `updated_at` (timestamp) - Last update timestamp

  2. Security
    - Enable RLS on `settings` table
    - Add policy for authenticated users to read settings

  3. Initial Data
    - Insert default fiches_version setting
*/

-- Table des paramètres de l'application
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activation de RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

-- Insertion de la version par défaut des fiches
INSERT INTO settings (key, value) 
VALUES ('fiches_version', '1') 
ON CONFLICT (key) DO NOTHING;

-- Trigger pour updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();