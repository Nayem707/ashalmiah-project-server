-- Guest checkout: orders may be placed without a user account.
-- Existing rows all have a userId, so they remain valid. FK and index are unchanged.
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
