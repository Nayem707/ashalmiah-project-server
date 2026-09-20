-- Additive / idempotent only: never touch Product.price or existing amount columns.

CREATE TABLE IF NOT EXISTS "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "storeName" TEXT NOT NULL DEFAULT 'Shoply',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@shoply.com',
    "phone" TEXT NOT NULL DEFAULT '+1 (800) 555-0199',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "bdtPerUsd" DECIMAL(12,4) NOT NULL DEFAULT 122,
    "address" TEXT NOT NULL DEFAULT '123 Market St, San Francisco, CA',
    "shippingFlatRate" DECIMAL(10,2) NOT NULL DEFAULT 12,
    "freeShippingMin" DECIMAL(10,2) NOT NULL DEFAULT 150,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "bdtPerUsd" DECIMAL(12,4) NOT NULL DEFAULT 122;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT NOT NULL DEFAULT 'BDT';

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'BDT';
