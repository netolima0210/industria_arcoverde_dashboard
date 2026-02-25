-- Add template_name column to campanhas
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS template_name text;
