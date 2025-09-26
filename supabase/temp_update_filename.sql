INSERT INTO settings (key, value) VALUES ('current_file_fiches', 'fiches-produits-FORMAT-V2.md') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
