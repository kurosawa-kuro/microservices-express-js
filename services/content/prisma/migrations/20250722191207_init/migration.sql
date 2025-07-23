-- CreateEnum
CREATE TYPE "content"."DisplayType" AS ENUM ('SALE', 'RECOMMENDED', 'REPURCHASE', 'DAILY_DEAL', 'RECOMMENDED_CATEGORY', 'CONTINUE_SHOPPING');

-- CreateTable
CREATE TABLE "content"."top_page_displays" (
    "id" SERIAL NOT NULL,
    "displayType" "content"."DisplayType" NOT NULL,
    "productId" INTEGER,
    "productName" TEXT,
    "productPrice" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "image" TEXT,
    "categoryId" INTEGER,
    "categoryName" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "specialPrice" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "top_page_displays_pkey" PRIMARY KEY ("id")
);
