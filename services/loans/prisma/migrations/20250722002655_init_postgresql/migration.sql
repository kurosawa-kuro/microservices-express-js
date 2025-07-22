-- CreateTable
CREATE TABLE "loans" (
    "loan_id" SERIAL NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "loan_number" TEXT NOT NULL,
    "loan_type" TEXT NOT NULL,
    "total_loan" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL,
    "outstanding_amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("loan_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loans_loan_number_key" ON "loans"("loan_number");
