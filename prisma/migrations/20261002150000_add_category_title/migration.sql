-- AlterTable
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "title" TEXT;

-- Keep the current customer-facing text by copying existing names into the new title.
UPDATE "Category" SET "title" = "name" WHERE "title" IS NULL;
