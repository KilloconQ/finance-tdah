CREATE TYPE "public"."expense_kind" AS ENUM('expense', 'income', 'transfer');--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "to_account_id" uuid;--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "kind" "expense_kind" DEFAULT 'expense' NOT NULL;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_to_account_id_financial_account_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."financial_account"("id") ON DELETE set null ON UPDATE no action;