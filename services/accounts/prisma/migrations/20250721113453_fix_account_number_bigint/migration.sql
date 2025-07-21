/*
  Warnings:

  - The primary key for the `accounts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `account_number` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_accounts" (
    "customer_id" INTEGER NOT NULL,
    "account_number" BIGINT NOT NULL,
    "account_type" TEXT NOT NULL,
    "branch_address" TEXT NOT NULL,
    "communication_sw" BOOLEAN DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT,

    PRIMARY KEY ("customer_id", "account_number"),
    CONSTRAINT "accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_accounts" ("account_number", "account_type", "branch_address", "communication_sw", "created_at", "created_by", "customer_id", "updated_at", "updated_by") SELECT "account_number", "account_type", "branch_address", "communication_sw", "created_at", "created_by", "customer_id", "updated_at", "updated_by" FROM "accounts";
DROP TABLE "accounts";
ALTER TABLE "new_accounts" RENAME TO "accounts";
CREATE UNIQUE INDEX "accounts_account_number_key" ON "accounts"("account_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
