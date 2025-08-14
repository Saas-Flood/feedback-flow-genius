-- Make category_id nullable in qr_codes table since we removed category requirements
ALTER TABLE public.qr_codes ALTER COLUMN category_id DROP NOT NULL;