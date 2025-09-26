/*
  # Création du schéma complet pour l'application de compléments alimentaires

  1. Nouvelles tables
    - `ingredients` - Ingrédients avec preuves scientifiques
    - `products` - Produits commerciaux avec codes-barres
    - `product_ingredients` - Liaison produits-ingrédients
    - `protocols` - Protocoles par objectif
    - `user_profiles` - Profils utilisateur
    - `plan_days` - Planning quotidien
    - `intakes` - Prises individuelles

  2. Sécurité
    - Activation RLS sur toutes les tables
    - Politiques d'accès par utilisateur authentifié

  3. Contraintes
    - Clés étrangères pour l'intégrité
    - Valeurs par défaut appropriées
    - Index pour les performances
*/

-- Extension pour les UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Création des types ENUM
CREATE TYPE evidence_level AS ENUM ('A', 'B', 'C');
CREATE TYPE goal_type AS ENUM ('hypertrophy', 'fatloss', 'endurance', 'health');
CREATE TYPE timing_type AS ENUM ('pre', 'intra', 'post', 'daily');
CREATE TYPE intake_status AS ENUM ('todo', 'done', 'skipped');

-- Table des ingrédients
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  aliases text[] DEFAULT '{}',
  evidence evidence_level NOT NULL,
  dose_usual_min numeric NOT NULL,
  dose_usual_max numeric NOT NULL,
  dose_per_kg numeric,
  dose_unit text NOT NULL DEFAULT 'mg',
  timing text NOT NULL,
  notes text DEFAULT '',
  sources text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  name text NOT NULL,
  gtin text UNIQUE NOT NULL,
  format text NOT NULL DEFAULT 'poudre',
  price_reference numeric,
  certifications text[] DEFAULT '{}',
  url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table de liaison produits-ingrédients
CREATE TABLE IF NOT EXISTS product_ingredients (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
  amount_per_serving numeric,
  amount_unit text NOT NULL DEFAULT 'mg',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (product_id, ingredient_id)
);

-- Table des protocoles par objectif
CREATE TABLE IF NOT EXISTS protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal goal_type NOT NULL,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
  dose_suggested_min numeric NOT NULL,
  dose_suggested_max numeric NOT NULL,
  dose_unit text NOT NULL DEFAULT 'mg',
  timing timing_type NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des profils utilisateur
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sport text NOT NULL,
  frequency_per_week integer NOT NULL CHECK (frequency_per_week >= 1 AND frequency_per_week <= 7),
  training_time time NOT NULL,
  goal goal_type NOT NULL,
  budget_monthly numeric NOT NULL DEFAULT 50,
  constraints text[] DEFAULT '{}',
  competition_mode boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des plannings quotidiens
CREATE TABLE IF NOT EXISTS plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Table des prises individuelles
CREATE TABLE IF NOT EXISTS intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id uuid REFERENCES plan_days(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ingredient', 'product')),
  ref_id uuid NOT NULL,
  dose numeric NOT NULL,
  unit text NOT NULL DEFAULT 'mg',
  time time NOT NULL,
  status intake_status DEFAULT 'todo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activation de RLS sur toutes les tables
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE intakes ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les tables publiques (ingrédients, produits, protocoles)
CREATE POLICY "Anyone can read ingredients"
  ON ingredients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read product_ingredients"
  ON product_ingredients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read protocols"
  ON protocols FOR SELECT
  TO authenticated
  USING (true);

-- Politiques RLS pour les données utilisateur
CREATE POLICY "Users can manage their own profile"
  ON user_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own plan_days"
  ON plan_days FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own intakes"
  ON intakes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plan_days 
      WHERE plan_days.id = intakes.plan_day_id 
      AND plan_days.user_id = auth.uid()
    )
  );

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_products_gtin ON products(gtin);
CREATE INDEX IF NOT EXISTS idx_plan_days_user_date ON plan_days(user_id, date);
CREATE INDEX IF NOT EXISTS idx_intakes_plan_day ON intakes(plan_day_id);
CREATE INDEX IF NOT EXISTS idx_protocols_goal ON protocols(goal);

-- Fonction de mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocols_updated_at
  BEFORE UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_days_updated_at
  BEFORE UPDATE ON plan_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intakes_updated_at
  BEFORE UPDATE ON intakes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();