-- Add tax_rate column to menu_categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_categories' AND column_name='tax_rate') THEN
        ALTER TABLE menu_categories ADD COLUMN tax_rate NUMERIC DEFAULT 0;
    END IF;
END $$;
