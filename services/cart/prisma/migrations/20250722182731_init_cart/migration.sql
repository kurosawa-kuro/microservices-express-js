-- CreateTable
CREATE TABLE "cart"."cart_items" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productName" TEXT,
    "productPrice" DOUBLE PRECISION,
    "productImage" TEXT,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);
