-- CreateEnum
CREATE TYPE "analytics"."ActionType" AS ENUM ('CART_ADD', 'CART_REMOVE', 'CART_UPDATE', 'CART_READD', 'ORDER_COMPLETE', 'ORDER_CANCEL', 'ORDER_RETURN_REQUEST', 'ORDER_RETURN_COMPLETE', 'SEARCH_BY_KEYWORD', 'SEARCH_BY_CATEGORY', 'REVIEW_START', 'REVIEW_SUBMIT', 'USER_REGISTER_START', 'USER_REGISTER_COMPLETE', 'USER_UPDATE', 'USER_LOGIN', 'USER_LOGOUT', 'USER_DELETE');

-- CreateTable
CREATE TABLE "analytics"."view_history" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productName" TEXT,
    "productPrice" DOUBLE PRECISION,
    "categoryId" INTEGER,
    "categoryName" TEXT,

    CONSTRAINT "view_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."user_action_logs" (
    "id" SERIAL NOT NULL,
    "requestID" TEXT,
    "userId" TEXT NOT NULL,
    "actionType" "analytics"."ActionType" NOT NULL,
    "productId" INTEGER,
    "productName" TEXT,
    "productPrice" DOUBLE PRECISION,
    "categoryId" INTEGER,
    "categoryName" TEXT,
    "cartItemId" INTEGER,
    "orderId" INTEGER,
    "returnId" INTEGER,
    "quantity" INTEGER,
    "searchKeyword" TEXT,
    "searchCategoryId" INTEGER,
    "searchCategoryName" TEXT,
    "reviewText" TEXT,
    "rating" DOUBLE PRECISION,
    "actionReason" TEXT,
    "errorDetails" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_action_logs_pkey" PRIMARY KEY ("id")
);
