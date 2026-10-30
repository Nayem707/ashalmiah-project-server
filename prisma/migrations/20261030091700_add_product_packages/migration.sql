-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropIndex
DROP INDEX "CartItem_cartId_productId_selectedColor_selectedSize_key";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "selectedPackageId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "packageName" TEXT,
ADD COLUMN     "packagePrice" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageLine" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "packageItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PackageLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPackage" (
    "productId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductPackage_pkey" PRIMARY KEY ("productId","packageId")
);

-- CreateIndex
CREATE INDEX "Package_status_idx" ON "Package"("status");

-- CreateIndex
CREATE INDEX "PackageLine_packageId_idx" ON "PackageLine"("packageId");

-- CreateIndex
CREATE INDEX "PackageLine_packageItemId_idx" ON "PackageLine"("packageItemId");

-- CreateIndex
CREATE INDEX "ProductPackage_packageId_idx" ON "ProductPackage"("packageId");

-- CreateIndex
CREATE INDEX "CartItem_selectedPackageId_idx" ON "CartItem"("selectedPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_selectedColor_selectedSize_select_key" ON "CartItem"("cartId", "productId", "selectedColor", "selectedSize", "selectedPackageId");

-- CreateIndex
CREATE INDEX "OrderItem_packageId_idx" ON "OrderItem"("packageId");

-- AddForeignKey
ALTER TABLE "PackageLine" ADD CONSTRAINT "PackageLine_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageLine" ADD CONSTRAINT "PackageLine_packageItemId_fkey" FOREIGN KEY ("packageItemId") REFERENCES "PackageItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPackage" ADD CONSTRAINT "ProductPackage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPackage" ADD CONSTRAINT "ProductPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_selectedPackageId_fkey" FOREIGN KEY ("selectedPackageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
