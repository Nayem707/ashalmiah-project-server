-- Additive / idempotent only: existing products get an empty highlights list.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
