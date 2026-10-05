/*
# Create predictions table for storing fracture detection results

1. New Tables
- `predictions`
  - `id` (uuid, primary key)
  - `image_filename` (text, name of uploaded file)
  - `image_url` (text, URL to stored image if applicable)
  - `predicted_class` (text, "Fracture" or "Non-Fracture")
  - `predicted_index` (int, 0 or 1)
  - `probability` (float, P(fracture) from sigmoid)
  - `confidence` (float, max(prob, 1-prob))
  - `model_used` (text, which model was used)
  - `threshold` (float, decision threshold)
  - `image_features` (jsonb, extracted features for debugging)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `predictions`.
- Allow anon + authenticated CRUD (single-tenant, no auth required).
*/

CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_filename text NOT NULL,
  image_url text,
  predicted_class text NOT NULL,
  predicted_index int NOT NULL,
  probability float8 NOT NULL,
  confidence float8 NOT NULL,
  model_used text NOT NULL DEFAULT 'Edge-Detection-CNN',
  threshold float8 NOT NULL DEFAULT 0.5,
  image_features jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_predictions" ON predictions;
CREATE POLICY "anon_select_predictions"
ON predictions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_predictions" ON predictions;
CREATE POLICY "anon_insert_predictions"
ON predictions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_predictions" ON predictions;
CREATE POLICY "anon_update_predictions"
ON predictions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_predictions" ON predictions;
CREATE POLICY "anon_delete_predictions"
ON predictions FOR DELETE
TO anon, authenticated USING (true);
