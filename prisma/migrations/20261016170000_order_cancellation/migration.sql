-- Customer self-cancellation: reason, audit fields and the guest cancellation code hash.
-- All columns are nullable, so existing rows are unchanged.
CREATE TYPE "CancelledBy" AS ENUM ('CUSTOMER', 'ADMIN');

ALTER TABLE "Order"
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledBy" "CancelledBy",
  ADD COLUMN "guestCancelTokenHash" TEXT;
