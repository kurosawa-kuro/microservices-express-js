-- CreateTable
CREATE TABLE "loans" (
    "loan_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mobile_number" TEXT NOT NULL,
    "loan_number" TEXT NOT NULL,
    "loan_type" TEXT NOT NULL,
    "total_loan" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL,
    "outstanding_amount" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "loans_loan_number_key" ON "loans"("loan_number");
