-- CreateTable
CREATE TABLE "cards" (
    "card_id" SERIAL NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "card_number" TEXT NOT NULL,
    "card_type" TEXT NOT NULL,
    "total_limit" INTEGER NOT NULL,
    "amount_used" INTEGER NOT NULL,
    "available_amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("card_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cards_card_number_key" ON "cards"("card_number");
